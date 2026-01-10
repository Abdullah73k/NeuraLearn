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
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Loader } from "@/components/ai-elements/loader";
import ChatInputTools from "./chat-input-tools";
import ChatMessages from "./messages/chat-messages";
import {
	useGetNodeChatMessages,
	useGetSelectedNode,
	useGetSelectedNodeEdges,
	useMindMapActions,
} from "@/store/hooks";
import { DefaultChatTransport } from "ai";

const models = { name: "Gemini 2.0 Flash", value: "gemini-2.0-flash" };

const Chat = () => {
	const selectedNode = useGetSelectedNode();
	const nodeId = selectedNode?.id as string;
	const persistentMessages = useGetNodeChatMessages();
	const { appendNodeChat } = useMindMapActions();
	const edges = useGetSelectedNodeEdges();
	const [input, setInput] = useState("");
	const [model, setModel] = useState<string>(models.value);
	const [webSearch, setWebSearch] = useState(false);
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
	const handleSubmit = (message: PromptInputMessage) => {
		const hasText = Boolean(message.text);
		const hasAttachments = Boolean(message.files?.length);
		if (!(hasText || hasAttachments)) {
			return;
		}
		sendMessage(
			{
				text: message.text || "Sent with attachments",
				files: message.files,
			},
			{
				body: {
					model: model,
					webSearch: webSearch,
					edges,
				},
			}
		);
		setInput("");
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
						{status === "submitted" && <Loader />}
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
						<PromptInputTextarea
							onChange={(e) => setInput(e.target.value)}
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
						/>
						<PromptInputSubmit disabled={!input && !status} status={status} />
					</PromptInputFooter>
				</PromptInput>
			</div>
		</div>
	);
};
export default Chat;
