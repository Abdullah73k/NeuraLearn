"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useGetActiveWorkspace,
  useMindMapActions,
} from "@/store/hooks";
import {
  MicIcon,
  SquareIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RoutingResult = {
  action: "navigate_to_new" | "navigate_to_existing";
  nodeId: string;
  nodeTitle: string;
  parentId?: string;
  reasoning: string;
  question: string;
};

type GlobalMicState = "idle" | "recording" | "processing" | "confirming";

export default function GlobalMic() {
  const [state, setState] = useState<GlobalMicState>("idle");
  const [transcription, setTranscription] = useState<string>("");
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const activeWorkspace = useGetActiveWorkspace();
  const {
    setSelectedNode,
    addMessageToNode,
  } = useMindMapActions();

  // Get nodes for context
  const nodes = activeWorkspace?.nodes || [];

  const startRecording = useCallback(async () => {
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
      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone");
    }
  }, []);

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

      // Step 2: Intelligent routing - find the best node for this question
      const routeResponse = await fetch("/api/graph/route-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: transcribedText,
          rootId: activeWorkspace?.id,
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
      // If a new node was created, we need to refresh the workspace
      if (routingResult.action === "navigate_to_new") {
        // Reload workspaces to get the new node
        const { useMindMapStore } = await import("@/store/store");
        await useMindMapStore.getState().actions.loadWorkspacesFromDb();
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Find the target node and select it
      const { useMindMapStore } = await import("@/store/store");
      const currentWorkspace = useMindMapStore.getState().workspaces.find(
        w => w.id === activeWorkspace.id
      );
      
      const targetNode = currentWorkspace?.nodes.find(n => n.id === routingResult.nodeId);
      
      if (targetNode) {
        // Select the node to open its chat
        setSelectedNode(targetNode);
        
        // Create a user message
        const userMessage = {
          id: crypto.randomUUID(),
          role: "user" as const,
          parts: [{ type: "text" as const, text: routingResult.question }],
        };
        
        // Add the question as a message to the node's chat
        addMessageToNode(routingResult.nodeId, userMessage);
        
        // Dispatch event to notify chat component to send the message
        // The chat component will listen for this and trigger the AI
        window.dispatchEvent(new CustomEvent('voice-message-added', {
          detail: {
            nodeId: routingResult.nodeId,
            question: routingResult.question,
          }
        }));
      } else {
        console.error("Could not find target node:", routingResult.nodeId);
        setError("Failed to find the target node");
      }

      // Reset state
      setState("idle");
      setTranscription("");
      setRoutingResult(null);
    } catch (err) {
      console.error("Routing execution error:", err);
      setError("Failed to navigate to node");
    }
  }, [routingResult, activeWorkspace, setSelectedNode, addMessageToNode]);

  const cancelRouting = useCallback(() => {
    setState("idle");
    setTranscription("");
    setRoutingResult(null);
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
    
    if (routingResult.action === "navigate_to_new") {
      return `Create new node "${routingResult.nodeTitle}"`;
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
          ) : (
            <>
              {/* Transcription */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">Your question:</p>
                <p className="text-sm font-medium">&quot;{transcription}&quot;</p>
              </div>

              {/* Routing Decision */}
              <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  {routingResult?.action === "navigate_to_new" ? (
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
                  {routingResult?.action === "navigate_to_new" ? "Create & Go" : "Navigate"}
                </Button>
              </div>
            </>
          )}
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
      <p className="text-xs text-muted-foreground">
        {state === "idle" && "Press G or click to ask a question"}
        {state === "recording" && "Listening... Press G or click to stop"}
        {state === "processing" && "Finding the best place for your question..."}
        {state === "confirming" && "Confirm routing"}
      </p>
    </div>
  );
}
