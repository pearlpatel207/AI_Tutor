// app/api/chat/route.ts
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { message, pdfText } = await req.json();

    if (!message) {
      return new Response("Missing user message", { status: 400 });
    }

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful tutor. Use the PDF text provided to answer questions. Always cite the page number if possible.",
        },
        {
          role: "user",
          content: `PDF Context:\n${pdfText || "No PDF uploaded."}\n\nUser Question: ${message}`,
        },
      ],
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error(err);
    return new Response("Error handling request", { status: 500 });
  }
}
