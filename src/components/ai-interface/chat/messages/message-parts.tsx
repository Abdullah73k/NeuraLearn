import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
	Message,
	MessageContent,
	MessageResponse,
	MessageActions,
	MessageAction,
} from "@/components/ai-elements/message";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import {
	ChatRequestOptions,
	ChatStatus,
	UIDataTypes,
	UIMessage,
	UITools,
} from "ai";

export type MessagePartsProps = {
	message: UIMessage<unknown, UIDataTypes, UITools>;
	messages: UIMessage<unknown, UIDataTypes, UITools>[];
	regenerate: (
		options?: { messageId?: string } & ChatRequestOptions
	) => Promise<void>;
	status: ChatStatus;
};

export default function MessageParts({
	message,
	messages,
	regenerate,
	status,
}: MessagePartsProps) {
	return (
		<>
			{message.parts.map((part, i) => {
				switch (part.type) {
					case "text":
						return (
							<Message key={`${message.id}-${i}`} from={message.role}>
								<MessageContent>
									<MessageResponse>{part.text}</MessageResponse>
								</MessageContent>
								{message.role === "assistant" && i === messages.length - 1 && (
									<MessageActions>
										<MessageAction onClick={() => regenerate()} label="Retry">
											<RefreshCcwIcon className="size-3" />
										</MessageAction>
										<MessageAction
											onClick={() => navigator.clipboard.writeText(part.text)}
											label="Copy"
										>
											<CopyIcon className="size-3" />
										</MessageAction>
									</MessageActions>
								)}
							</Message>
						);
					case "reasoning":
						return (
							<Reasoning
								key={`${message.id}-${i}`}
								className="w-full"
								isStreaming={
									status === "streaming" &&
									i === message.parts.length - 1 &&
									message.id === messages.at(-1)?.id
								}
							>
								<ReasoningTrigger />
								<ReasoningContent>{part.text}</ReasoningContent>
							</Reasoning>
						);
					default:
						return null;
				}
			})}
		</>
	);
}
