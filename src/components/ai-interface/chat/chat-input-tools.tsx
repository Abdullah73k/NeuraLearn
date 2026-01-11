import { GlobeIcon } from "lucide-react";
import {
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputButton,
	PromptInputSelect,
	PromptInputSelectContent,
	PromptInputSelectItem,
	PromptInputSelectTrigger,
	PromptInputSelectValue,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Dispatch, RefObject, SetStateAction, useState, useCallback, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";

type ChatInputToolsProps = {
	model: string;
	setModel: Dispatch<SetStateAction<string>>;
	webSearch: boolean;
	setWebSearch: Dispatch<SetStateAction<boolean>>;
	models: {
		name: string;
		value: string;
	};
	textareaRef?: RefObject<HTMLTextAreaElement | null>;
	onVoiceSubmit?: (text: string) => void;
};

// Custom speech button that auto-submits after transcription
function ChatSpeechButton({ onVoiceSubmit }: { onVoiceSubmit?: (text: string) => void }) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
			chunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				setIsProcessing(true);
				stream.getTracks().forEach((track) => track.stop());
				await new Promise(resolve => setTimeout(resolve, 100));
				
				const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

				if (audioBlob.size < 100) {
					setIsProcessing(false);
					alert("No audio recorded. Please try again.");
					return;
				}

				try {
					const formData = new FormData();
					const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
					formData.append("audio", audioFile);

					const response = await fetch("/api/transcribe", {
						method: "POST",
						body: formData,
					});

					if (!response.ok) {
						throw new Error("Transcription failed");
					}

					const data = await response.json();
					const transcribedText = data.text || "";

					if (transcribedText && onVoiceSubmit) {
						// Auto-submit the transcribed text
						onVoiceSubmit(transcribedText);
					}
				} catch (error) {
					console.error("Transcription error:", error);
					alert("Failed to transcribe audio. Please try again.");
				} finally {
					setIsProcessing(false);
				}
			};

			mediaRecorder.start(100);
			mediaRecorderRef.current = mediaRecorder;
			setIsRecording(true);
		} catch (error) {
			console.error("Error accessing microphone:", error);
			alert("Could not access microphone. Please check permissions.");
		}
	}, [onVoiceSubmit]);

	const stopRecording = useCallback(() => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		}
	}, [isRecording]);

	const handleClick = () => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};

	return (
		<PromptInputButton
			variant={isRecording ? "default" : "ghost"}
			onClick={handleClick}
			disabled={isProcessing}
			className={isRecording ? "bg-red-500 hover:bg-red-600 text-white" : ""}
		>
			{isProcessing ? (
				<Loader2 size={16} className="animate-spin" />
			) : (
				<Mic size={16} />
			)}
			<span>{isProcessing ? "Processing..." : isRecording ? "Stop" : "Voice"}</span>
		</PromptInputButton>
	);
}

export default function ChatInputTools({
	model,
	setModel,
	webSearch,
	setWebSearch,
	models,
	textareaRef,
	onVoiceSubmit,
}: ChatInputToolsProps) {
	return (
		<PromptInputTools>
			<PromptInputActionMenu>
				<PromptInputActionMenuTrigger />
				<PromptInputActionMenuContent>
					<PromptInputActionAddAttachments />
				</PromptInputActionMenuContent>
			</PromptInputActionMenu>
			<ChatSpeechButton onVoiceSubmit={onVoiceSubmit} />
			<PromptInputButton
				variant={webSearch ? "default" : "ghost"}
				onClick={() => setWebSearch(!webSearch)}
			>
				<GlobeIcon size={16} />
				<span>Search</span>
			</PromptInputButton>
			<PromptInputSelect
				onValueChange={(value) => {
					setModel(value);
				}}
				value={model}
			>
				<PromptInputSelectTrigger>
					<PromptInputSelectValue />
				</PromptInputSelectTrigger>
				<PromptInputSelectContent>
					<PromptInputSelectItem value={models.value}>
						{models.name}
					</PromptInputSelectItem>
				</PromptInputSelectContent>
			</PromptInputSelect>
		</PromptInputTools>
	);
}
