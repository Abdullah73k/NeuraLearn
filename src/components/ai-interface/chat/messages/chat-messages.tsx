import {
	ChatRequestOptions,
	ChatStatus,
	UIDataTypes,
	UIMessage,
	UITools,
} from "ai";
import MessageParts from "./message-parts";
import MessageRole from "./message-role";

type ChatMessagesProps = {
	messages: UIMessage<unknown, UIDataTypes, UITools>[];
	regenerate: (
		options?: { messageId?: string } & ChatRequestOptions
	) => Promise<void>;
	status: ChatStatus;
};

export default function ChatMessages({
	messages,
	regenerate,
	status,
}: ChatMessagesProps) {
	return (
		<>
			{messages.map((message) => (
				<div key={message.id}>
					<MessageRole message={message} />
					<MessageParts
						message={message}
						messages={messages}
						regenerate={regenerate}
						status={status}
					/>
				</div>
			))}
		</>
	);
}
