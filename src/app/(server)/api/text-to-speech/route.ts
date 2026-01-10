import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      console.error("No text provided");
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    console.log("Generating speech for text:", text.substring(0, 100) + "...");

    // Call ElevenLabs Text-to-Speech API
    // Using Rachel voice (21m00Tcm4TlvDq8ikWAM) - a popular natural voice
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return NextResponse.json(
        { error: `Text-to-speech failed: ${errorText}` },
        { status: response.status }
      );
    }

    // Get the audio as a buffer
    const audioBuffer = await response.arrayBuffer();
    console.log("Speech generated successfully, size:", audioBuffer.byteLength);

    // Return the audio with proper headers
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
