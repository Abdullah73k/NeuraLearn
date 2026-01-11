import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const maxDuration = 60;

type GenerateNoteRequest = {
  nodeTitle: string;
  noteQuery: string;
};

type GeneratedNote = {
  title: string;
  content: string;
};

export async function POST(req: Request) {
  try {
    const { nodeTitle, noteQuery } = (await req.json()) as GenerateNoteRequest;

    if (!nodeTitle || !noteQuery) {
      return NextResponse.json(
        { error: "nodeTitle and noteQuery are required" },
        { status: 400 }
      );
    }

    const prompt = `You are a helpful research assistant. The user is studying "${nodeTitle}" and wants to create a note about: "${noteQuery}"

Your task:
1. Research and provide accurate, helpful information about the query in the context of ${nodeTitle}
2. Create a concise but informative note (2-4 sentences, max 150 words)
3. Generate a short, descriptive title for this note (3-6 words)

The note should be:
- Factual and accurate
- Relevant to the parent topic "${nodeTitle}"
- Written in a clear, easy-to-understand way
- Useful for studying/learning

Respond with ONLY valid JSON in this exact format:
{
  "title": "Short Note Title Here",
  "content": "The detailed note content goes here. It should be informative and helpful for the user's learning."
}`;

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
    });

    const responseText = result.text || "";

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse note response:", responseText);
      return NextResponse.json(
        { error: "Failed to generate note" },
        { status: 500 }
      );
    }

    const generatedNote: GeneratedNote = JSON.parse(jsonMatch[0]);

    console.log("Generated note:", generatedNote);

    return NextResponse.json({
      success: true,
      title: generatedNote.title,
      content: generatedNote.content,
    });
  } catch (error) {
    console.error("Generate note error:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
