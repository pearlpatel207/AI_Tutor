// import { google } from "@ai-sdk/google";
// import { streamText } from "ai";

// // Allow streaming responses up to 30 seconds
// export const maxDuration = 30;

// export async function POST(req: Request) {
//   try {
//     const { message, pdfText } = await req.json();

//     if (!message) {
//       return new Response("Missing user message", { status: 400 });
//     }

//     const result = streamText({
//       model: google("gemini-2.5-flash"),
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a helpful tutor. Use the PDF text provided to answer questions. Always cite the page number if possible.",
//         },
//         {
//           role: "user",
//           content: `PDF Context:\n${pdfText || "No PDF uploaded."}\n\nUser Question: ${message}`,
//         },
//       ],
//     });

//     return result.toTextStreamResponse();
//   } catch (err) {
//     console.error(err);
//     return new Response("Error handling request", { status: 500 });
//   }
// }

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { message, pdfText } = await req.json();

  const system = [
    "You are a helpful tutor inside a PDF study app.",
    "Always use the PDF text if relevant, and cite page numbers like (p. 4).",
    "When you want to control the PDF viewer, output a single JSON command wrapped in <cmd>...</cmd>.",
    "Supported commands:",
    "- goToPage: {\"action\":\"goToPage\",\"page\": NUMBER}",
    "- highlightRect: {\"action\":\"highlightRect\",\"page\": NUMBER, \"rect\":[x,y,w,h], \"color\":\"#hex or name\"} (x,y,w,h are 0..1 relative to page)",
    "- clearHighlights: {\"action\":\"clearHighlights\",\"page\": NUMBER (optional)}",
    "Only output <cmd> when you really want to trigger the action. Do not include explanations inside <cmd>."
  ].join("\n");

  const result = await streamText({
    model: google("gemini-2.5-flash"),
    system,
    messages: [
      { role: "user", content: `PDF Context:\n${pdfText}\n\nUser: ${message}` }
    ],
  });

  return result.toTextStreamResponse();
}
