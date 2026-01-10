"use client";

import { MessageAction } from "@/components/ai-elements/message";
import { Loader2Icon, XIcon } from "lucide-react";
import { Volume2 as Volume2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ReadAloudButtonProps = {
  text: string;
};

export default function ReadAloudButton({ text }: ReadAloudButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleReadAloud = useCallback(async () => {
    if (isPlaying && audioRef.current) {
      // Stop playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Text-to-speech API error:", errorData);
        throw new Error(errorData.error || "Failed to generate speech");
      }

      // Get the audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        alert("Failed to play audio. Please try again.");
      };

      await audio.play();
    } catch (error) {
      console.error("Read aloud error:", error);
      setIsLoading(false);
      setIsPlaying(false);
      alert("Failed to read aloud. Please try again.");
    }
  }, [text, isPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        const src = audioRef.current.src;
        if (src.startsWith("blob:")) {
          URL.revokeObjectURL(src);
        }
      }
    };
  }, []);

  if (isLoading) {
    return (
      <MessageAction disabled label="Loading...">
        <Loader2Icon className="size-3 animate-spin" />
      </MessageAction>
    );
  }

  if (isPlaying) {
    return (
      <MessageAction
        onClick={handleReadAloud}
        label="Cancel"
        className="text-red-500 hover:text-red-600"
      >
        <XIcon className="size-3" />
      </MessageAction>
    );
  }

  return (
    <MessageAction onClick={handleReadAloud} label="Read Aloud">
      <Volume2Icon className="size-3" />
    </MessageAction>
  );
}
