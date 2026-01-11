"use client";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	PromptInputHeader,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputFooter,
} from "@/components/ai-elements/prompt-input";
import { useRef, useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { Loader } from "@/components/ai-elements/loader";
import ChatInputTools from "./chat-input-tools";
import ChatMessages from "./messages/chat-messages";
import {
	useGetNodeChatMessages,
	useGetSelectedNode,
	useGetSelectedNodeEdges,
	useMindMapActions,
	useGetActiveWorkspace,
} from "@/store/hooks";
import { DefaultChatTransport } from "ai";
import { useMindMapStore } from "@/store/store";

const models = { name: "Gemini 2.0 Flash", value: "gemini-2.0-flash" };

type RoutingResult = {
	action: "navigate_to_existing" | "create_new";
	nodeId?: string;
	nodeTitle?: string;
	parentId?: string;
	suggestedTitle?: string;
	suggestedSummary?: string;
	reasoning?: string;
	question?: string;
};

const Chat = () => {
	const selectedNode = useGetSelectedNode();
	const activeWorkspace = useGetActiveWorkspace();
	const nodeId = selectedNode?.id as string;
	const persistentMessages = useGetNodeChatMessages();
	const { appendNodeChat, setSelectedNodeId } = useMindMapActions();
	const edges = useGetSelectedNodeEdges();
	const [input, setInput] = useState("");
	const [model, setModel] = useState<string>(models.value);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [webSearch, setWebSearch] = useState(false);
	const [isRouting, setIsRouting] = useState(false);
	const { messages, sendMessage, status, regenerate, setMessages, stop } =
		useChat({
			// This 'id' prop is crucial - it forces useChat to create a new chat instance
			// when the nodeId changes, ensuring the API URL updates correctly
			id: nodeId,
			messages: persistentMessages,
			transport: new DefaultChatTransport({
				api: `/api/chat/${nodeId}`,
			}),
			onFinish: ({ messages }) => {
				appendNodeChat(nodeId, messages);
				console.log("messages", messages);
			},
		});
	
	// Listen for voice messages that need to be sent to the AI
	useEffect(() => {
		const handleVoiceMessage = (event: CustomEvent) => {
			const { nodeId: voiceNodeId, question } = event.detail;
			
			// Only process if this is for the currently selected node
			if (voiceNodeId === nodeId && question) {
				// Send the message to the AI
				sendMessage(
					{ text: question, files: [] },
					{
						body: {
							model: model,
							webSearch: webSearch,
							edges,
						},
					}
				);
			}
		};

		window.addEventListener('voice-message-added', handleVoiceMessage as EventListener);
		return () => {
			window.removeEventListener('voice-message-added', handleVoiceMessage as EventListener);
		};
	}, [nodeId, model, webSearch, edges, sendMessage]);

	// Route the question to the appropriate node (like global mic does)
	const routeAndSendMessage = useCallback(async (question: string, files?: File[]) => {
		if (!activeWorkspace) {
			// No workspace, just send directly
			sendMessage(
				{ text: question, files: files || [] },
				{ body: { model, webSearch, edges } }
			);
			return;
		}

		setIsRouting(true);

		try {
			// Get recent messages for context
			const recentMessages = (activeWorkspace.messages[nodeId] || []).slice(-3).map(m => ({
				role: m.role,
				content: m.parts.map(p => p.type === 'text' ? p.text : '').join(' ')
			}));

			// Call route-question API
			const routeResponse = await fetch("/api/graph/route-question", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					question,
					rootId: activeWorkspace.id,
					currentNodeId: nodeId,
					recentMessages,
				}),
			});

			if (!routeResponse.ok) {
				// If routing fails, just send to current node
				console.error("Routing failed, sending to current node");
				sendMessage(
					{ text: question, files: files || [] },
					{ body: { model, webSearch, edges } }
				);
				return;
			}

			const routing: RoutingResult = await routeResponse.json();
			console.log("Chat routing result:", routing);

			// Handle based on routing decision
			if (routing.action === "create_new" && routing.parentId && routing.suggestedTitle) {
				// Create new node
				const createResponse = await fetch("/api/graph/nodes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						title: routing.suggestedTitle,
						summary: routing.suggestedSummary || `Exploring: ${routing.suggestedTitle}`,
						parent_id: routing.parentId,
					}),
				});

				if (createResponse.ok) {
					const createData = await createResponse.json();
					const newNodeId = createData.node.id;

					// Reload workspaces to get the new node
					await useMindMapStore.getState().actions.loadWorkspacesFromDb();
					
					// Navigate to the new node
					setSelectedNodeId(newNodeId);

					// Dispatch event to send message to the new node's chat
					await new Promise(resolve => setTimeout(resolve, 200));
					window.dispatchEvent(new CustomEvent('voice-message-added', {
						detail: { nodeId: newNodeId, question }
					}));
				}
			} else if (routing.action === "navigate_to_existing" && routing.nodeId) {
				// Navigate to existing node
				if (routing.nodeId !== nodeId) {
					setSelectedNodeId(routing.nodeId);
					
					// Dispatch event to send message to the target node's chat
					await new Promise(resolve => setTimeout(resolve, 200));
					window.dispatchEvent(new CustomEvent('voice-message-added', {
						detail: { nodeId: routing.nodeId, question }
					}));
				} else {
					// Same node, just send the message
					sendMessage(
						{ text: question, files: files || [] },
						{ body: { model, webSearch, edges } }
					);
				}
			} else {
				// Fallback: send to current node
				sendMessage(
					{ text: question, files: files || [] },
					{ body: { model, webSearch, edges } }
				);
			}
		} catch (error) {
			console.error("Routing error:", error);
			// Fallback: send to current node
			sendMessage(
				{ text: question, files: files || [] },
				{ body: { model, webSearch, edges } }
			);
		} finally {
			setIsRouting(false);
		}
	}, [activeWorkspace, nodeId, model, webSearch, edges, sendMessage, setSelectedNodeId]);

	const handleSubmit = async (message: PromptInputMessage) => {
		const hasText = Boolean(message.text);
		const hasAttachments = Boolean(message.files?.length);
		if (!(hasText || hasAttachments)) {
			return;
		}
		
		setInput("");
		
		// Route and send the message
		await routeAndSendMessage(message.text || "Sent with attachments", message.files);
	};
	return (
		<div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
			<div className="flex flex-col h-full">
				<Conversation className="h-full">
					<ConversationContent>
						<ChatMessages
							messages={messages}
							regenerate={regenerate}
							status={status}
						/>
						{isRouting && (
							<div className="flex flex-col items-center justify-center py-12 gap-4">
								<div className="flex items-center justify-center">
									<Loader size={48} />
								</div>
								<div className="flex flex-col items-center gap-2">
									<p className="text-sm font-medium text-muted-foreground">
										Routing question...
									</p>
									<p className="text-xs text-muted-foreground max-w-xs text-center">
										Finding the best place for your question
									</p>
								</div>
							</div>
						)}
						{status === "submitted" && !isRouting && (
							<div className="flex flex-col items-center justify-center py-12 gap-4">
								<div className="flex items-center justify-center">
									<Loader size={48} />
								</div>
								<div className="flex flex-col items-center gap-2">
									<p className="text-sm font-medium text-muted-foreground">
										Thinking...
									</p>
									<p className="text-xs text-muted-foreground max-w-xs text-center">
										Processing your prompt with advanced reasoning
									</p>
								</div>
							</div>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>
				<PromptInput
					onSubmit={handleSubmit}
					className="mt-4"
					globalDrop
					multiple
				>
					<PromptInputHeader>
						<PromptInputAttachments>
							{(attachment) => <PromptInputAttachment data={attachment} />}
						</PromptInputAttachments>
					</PromptInputHeader>
					<PromptInputBody>
						<PromptInputTextarea						ref={textareaRef}							onChange={(e) => setInput(e.target.value)}
							value={input}
						/>
					</PromptInputBody>
					<PromptInputFooter>
						<ChatInputTools
							model={model}
							setModel={setModel}
							webSearch={webSearch}
							setWebSearch={setWebSearch}
						models={models}
						textareaRef={textareaRef}
					/>
						<PromptInputSubmit disabled={!input && !status} status={status} />
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
};
export default Chat;
