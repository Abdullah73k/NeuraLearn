"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useGetActiveWorkspace,
  useGetSelectedNode,
  useMindMapActions,
} from "@/store/hooks";
import {
  MicIcon,
  SquareIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  PlusIcon,
  ArrowRightIcon,
  StickyNoteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RoutingResult = {
  action: "create_new" | "navigate_to_existing";
  nodeId?: string;
  nodeTitle?: string;
  parentId?: string;
  suggestedTitle?: string;
  suggestedSummary?: string;
  reasoning: string;
  question: string;
};

type NoteResult = {
  action: "create_note";
  targetNodeId: string;
  targetNodeTitle: string;
  noteQuery: string; // The user's original query
  noteTitle: string; // AI-generated title
  noteContent: string; // AI-generated content
  reasoning: string;
};

type CommandResult = RoutingResult | NoteResult;

type GlobalMicState = "idle" | "recording" | "processing" | "confirming";

export default function GlobalMic() {
  const [state, setState] = useState<GlobalMicState>("idle");
  const [transcription, setTranscription] = useState<string>("");
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [noteResult, setNoteResult] = useState<NoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const activeWorkspace = useGetActiveWorkspace();
  const selectedNode = useGetSelectedNode();
  const {
    setSelectedNode,
    addMessageToNode,
    setIsChatBarOpen,
    createNoteNodeOnTarget,
  } = useMindMapActions();

  // Get nodes for context
  const nodes = activeWorkspace?.nodes || [];

  const startRecording =  async() => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop tracks and wait for final data
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        // Small delay to ensure all chunks are collected
        await new Promise(resolve => setTimeout(resolve, 100));
        await processRecording();
      };

      // Start recording with timeslice to collect data periodically
      mediaRecorder.start(100);
      setState("recording");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone");
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
      setState("processing");
    }
  }, [state]);

  const processRecording = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      console.log("Audio chunks collected:", audioChunksRef.current.length, "Total size:", audioBlob.size);
      
      // Check if we have valid audio data
      if (audioBlob.size < 100) {
        console.error("Audio blob too small, likely no data recorded");
        setError("No audio recorded. Please try again.");
        setState("idle");
        return;
      }
      
      // Step 1: Transcribe
      const transcribeFormData = new FormData();
      transcribeFormData.append("audio", audioBlob, "recording.webm");

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: transcribeFormData,
      });

      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed");
      }

      const transcribeData = await transcribeResponse.json();
      const transcribedText = transcribeData.text;
      setTranscription(transcribedText);

      // Step 2: Classify the command (note creation vs question)
      const classifyResponse = await fetch("/api/classify-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: transcribedText,
          nodes: nodes.map(n => ({ id: n.id, title: n.data.title, type: n.type })),
          rootId: activeWorkspace?.id,
        }),
      });

      if (classifyResponse.ok) {
        const classification = await classifyResponse.json();
        
        // If it's a note creation command with high confidence
        if (classification.commandType === "create_note" && classification.confidence > 0.7 && classification.targetNodeId) {
          // Get the target node title for context
          const targetNodeTitle = classification.targetNodeTitle || "Unknown Node";
          const noteQuery = classification.noteContent || transcribedText;

          // Call AI to research and generate note content
          const generateResponse = await fetch("/api/generate-note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodeTitle: targetNodeTitle,
              noteQuery: noteQuery,
            }),
          });

          if (generateResponse.ok) {
            const generatedNote = await generateResponse.json();
            
            setNoteResult({
              action: "create_note",
              targetNodeId: classification.targetNodeId,
              targetNodeTitle: targetNodeTitle,
              noteQuery: noteQuery,
              noteTitle: generatedNote.title,
              noteContent: generatedNote.content,
              reasoning: classification.reasoning || classification.explanation,
            });
            setState("confirming");
            return;
          } else {
            // Fallback: use the query as content if generation fails
            setNoteResult({
              action: "create_note",
              targetNodeId: classification.targetNodeId,
              targetNodeTitle: targetNodeTitle,
              noteQuery: noteQuery,
              noteTitle: "Note",
              noteContent: noteQuery,
              reasoning: classification.reasoning || classification.explanation,
            });
            setState("confirming");
            return;
          }
        }
      }

      // Step 3: If not a note command, do intelligent routing for question
      // Get recent chat messages for context (last 3 messages to understand "his", "it", etc.)
      // IMPORTANT: Only use selectedNode if it belongs to the current workspace
      const nodeInCurrentWorkspace = selectedNode?.id && activeWorkspace?.nodes.some(n => n.id === selectedNode.id);
      
      const recentMessages = nodeInCurrentWorkspace && selectedNode?.id && activeWorkspace 
        ? (activeWorkspace.messages[selectedNode.id] || []).slice(-3).map(m => ({
            role: m.role,
            content: m.parts.map(p => p.type === 'text' ? p.text : '').join(' ')
          }))
        : [];
      
      const routeResponse = await fetch("/api/graph/route-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: transcribedText,
          rootId: activeWorkspace?.id,
          currentNodeId: nodeInCurrentWorkspace ? selectedNode?.id : null,
          recentMessages,
        }),
      });

      if (!routeResponse.ok) {
        throw new Error("Failed to route question");
      }

      const routing: RoutingResult = await routeResponse.json();
      setRoutingResult(routing);
      setState("confirming");
    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : "Processing failed");
      setState("idle");
    }
  };

  const executeRouting = useCallback(async () => {
    if (!routingResult || !activeWorkspace) return;

    try {
      // Verify workspace still exists (user might have deleted it during routing)
      const { useMindMapStore } = await import("@/store/store");
      const currentWorkspace = useMindMapStore.getState().workspaces.find(
        w => w.id === activeWorkspace.id
      );
      
      if (!currentWorkspace) {
        console.log("Workspace was deleted during routing, canceling navigation");
        setState("idle");
        setTranscription("");
        setRoutingResult(null);
        return;
      }

      let targetNodeId = routingResult.nodeId;

      // If creating a new node, create it now (after user confirmed)
      if (routingResult.action === "create_new") {
        const createResponse = await fetch("/api/graph/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: routingResult.suggestedTitle,
            summary: routingResult.suggestedSummary,
            parent_id: routingResult.parentId,
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          console.error("Failed to create node:", error);
          setError("Failed to create node");
          setState("idle");
          return;
        }

        const createData = await createResponse.json();
        targetNodeId = createData.node.id;

        // Reload workspaces to get the new node
        await useMindMapStore.getState().actions.loadWorkspacesFromDb();
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-verify workspace still exists after reload
        const reloadedWorkspace = useMindMapStore.getState().workspaces.find(
          w => w.id === activeWorkspace.id
        );
        
        if (!reloadedWorkspace) {
          console.log("Workspace was deleted during node creation, canceling navigation");
          setState("idle");
          setTranscription("");
          setRoutingResult(null);
          return;
        }
      }

      // Find the target node and select it
      const finalWorkspace = useMindMapStore.getState().workspaces.find(
        w => w.id === activeWorkspace.id
      );
      
      if (!finalWorkspace) {
        console.log("Workspace no longer exists, canceling navigation");
        setState("idle");
        setTranscription("");
        setRoutingResult(null);
        return;
      }
      
      const targetNode = finalWorkspace.nodes.find(n => n.id === targetNodeId);
      
      if (targetNode) {
        // Select the node to open its chat
        setSelectedNode(targetNode);
        
        // Open the chat sidebar
        setIsChatBarOpen();
        
        // Wait for Chat component to mount and set up event listener
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Dispatch event to notify chat component to add message and trigger AI
        window.dispatchEvent(new CustomEvent('voice-message-added', {
          detail: {
            nodeId: targetNodeId,
            question: routingResult.question,
          }
        }));
      } else {
        console.log("Target node not found in workspace (may have been deleted)");
      }

      // Reset state
      setState("idle");
      setTranscription("");
      setRoutingResult(null);
    } catch (err) {
      console.error("Routing execution error:", err);
      setError("Failed to navigate to node");
    }
  }, [routingResult, activeWorkspace, setSelectedNode, setIsChatBarOpen]);

  const executeNoteCreation = useCallback(() => {
    if (!noteResult || !activeWorkspace) return;

    try {
      // Create the note node connected to the target node with AI-generated title and content
      createNoteNodeOnTarget(noteResult.targetNodeId, noteResult.noteTitle, noteResult.noteContent);
      console.log("Note node created successfully for:", noteResult.targetNodeTitle);

      // Reset state
      setState("idle");
      setTranscription("");
      setNoteResult(null);
    } catch (err) {
      console.error("Note creation error:", err);
      setError("Failed to create note");
      setState("idle");
    }
  }, [noteResult, activeWorkspace, createNoteNodeOnTarget]);

  const cancelRouting = useCallback(() => {
    setState("idle");
    setTranscription("");
    setRoutingResult(null);
    setNoteResult(null);
    setError(null);
  }, []);

  const toggleRecording = useCallback(() => {
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Global keyboard shortcut (G key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRecording]);

  const getRoutingDisplayText = () => {
    if (!routingResult) return "";
    
    if (routingResult.action === "create_new") {
      return `Create new node "${routingResult.suggestedTitle}"`;
    } else {
      return `Navigate to "${routingResult.nodeTitle}"`;
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* Routing Result & Confirmation Panel */}
      {(state === "confirming" || error) && (
        <div className="bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[480px] animate-in slide-in-from-bottom-4 fade-in duration-300">
          {error ? (
            <div className="text-center">
              <p className="text-destructive text-sm mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelRouting}
                className="rounded-full"
              >
                Dismiss
              </Button>
            </div>
          ) : routingResult ? (
            <>
              {/* Transcription */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Your question:</p>
                <p className="text-sm font-medium">&quot;{transcription}&quot;</p>
              </div>

              {/* Routing Decision */}
              <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  {routingResult?.action === "create_new" ? (
                    <PlusIcon className="size-4 text-green-500" />
                  ) : (
                    <ArrowRightIcon className="size-4 text-blue-500" />
                  )}
                  <p className="text-sm font-semibold text-primary">
                    {getRoutingDisplayText()}
                  </p>
                </div>
                {routingResult && (
                  <p className="text-xs text-muted-foreground">
                    {routingResult.reasoning}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelRouting}
                  className="rounded-full gap-2"
                >
                  <XIcon className="size-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executeRouting}
                  className="rounded-full gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  <CheckIcon className="size-4" />
                  {routingResult?.action === "create_new" ? "Create & Go" : "Navigate"}
                </Button>
              </div>
            </>
          ) : noteResult ? (
            <>
              {/* Transcription */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Your command:</p>
                <p className="text-sm font-medium">&quot;{transcription}&quot;</p>
              </div>

              {/* Note Details */}
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNoteIcon className="size-4 text-amber-600" />
                  <p className="text-sm text-amber-700">
                    Add note to <span className="font-semibold">&quot;{noteResult.targetNodeTitle}&quot;</span>
                  </p>
                </div>
                
                {/* AI-generated title */}
                <div className="mt-3">
                  <p className="text-xs text-amber-600 mb-1">Title:</p>
                  <p className="text-sm font-semibold text-amber-900">{noteResult.noteTitle}</p>
                </div>
                
                {/* AI-generated content */}
                <div className="mt-2">
                  <p className="text-xs text-amber-600 mb-1">Content:</p>
                  <p className="text-xs text-amber-800 bg-white/70 p-2 rounded-lg border border-amber-100 leading-relaxed">
                    {noteResult.noteContent}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelRouting}
                  className="rounded-full gap-2"
                >
                  <XIcon className="size-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executeNoteCreation}
                  className="rounded-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  <CheckIcon className="size-4" />
                  Create Note
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Mic Button */}
      <button
        onClick={toggleRecording}
        disabled={state === "processing"}
        className={cn(
          "relative size-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500",
          state === "idle" &&
            "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 hover:scale-105",
          state === "recording" &&
            "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 animate-pulse",
          state === "processing" &&
            "bg-gradient-to-br from-amber-500 to-orange-600 cursor-wait",
          state === "confirming" &&
            "bg-gradient-to-br from-violet-500 to-purple-600 opacity-50"
        )}
      >
        {/* Ripple effect when recording */}
        {state === "recording" && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20 animation-delay-150" />
          </>
        )}

        {/* Icon */}
        {state === "idle" && <MicIcon className="size-7 text-white" />}
        {state === "recording" && <SquareIcon className="size-6 text-white" />}
        {state === "processing" && (
          <Loader2Icon className="size-7 text-white animate-spin" />
        )}
        {state === "confirming" && <MicIcon className="size-7 text-white" />}
      </button>

      {/* Hint text */}
      <p className="text-xs text-muted-foreground text-center w-[100px] leading-relaxed">
        {state === "idle" && "Press G or click to ask a question"}
        {state === "recording" && "Listening... Press G or click to stop"}
        {state === "processing" && "Processing your command..."}
        {state === "confirming" && (noteResult ? "Confirm note" : "Confirm routing")}
      </p>
    </div>
  );
}
