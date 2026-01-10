import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { selectedText, fullResponse } = await req.json();

    if (!selectedText) {
      return NextResponse.json(
        { error: "No selected text provided" },
        { status: 400 }
      );
    }

    const prompt = `You are a mind mapping assistant. Given a selected portion of text from a longer response, generate a concise, clear title for a new node in a mind map.

## Full Response Context:
${fullResponse}

## Selected Text:
"${selectedText}"

## Instructions:
- Generate a short, descriptive title (2-6 words)
- The title should capture the main concept or topic of the selected text
- Make it suitable for a mind map node
- Do NOT use quotes in the title
- Focus on the key concept, not a full sentence

Examples:
- Selected: "pH measures the acidity of a solution on a scale from 0 to 14" → Title: "pH Scale"
- Selected: "derivatives measure the rate of change" → Title: "Rate of Change"
- Selected: "the chain rule is used for composite functions" → Title: "Chain Rule"

Respond with ONLY the title text, nothing else. No quotes, no punctuation at the end.`;

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
    });

    let title = result.text.trim();
    
    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove quotes
    title = title.replace(/\.$/, ''); // Remove trailing period
    
    // Limit length
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    console.log("Generated node title:", title);

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
