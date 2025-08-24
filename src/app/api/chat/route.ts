import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { message, pdfText } = await req.json();

//   const system = [
//     "You are a helpful tutor inside a PDF study app.",
//     "Always use the PDF text if relevant, highlight the reffered text and cite page numbers like (p. 4).",
//     "When you want to control the PDF viewer, output a single JSON command wrapped in <cmd>...</cmd>.",
//     "Supported commands:",
//     "- goToPage: {\"action\":\"goToPage\",\"page\": NUMBER}",
//     "- highlightRect: {\"action\":\"highlightRect\",\"page\": NUMBER, \"rect\":[x,y,w,h], \"color\":\"#hex or name\"} (x,y,w,h are 0..1 relative to page)",
//     "- clearHighlights: {\"action\":\"clearHighlights\",\"page\": NUMBER (optional)}",
//     "Only output <cmd> when you really want to trigger the action. Do not include explanations inside <cmd>."
//   ].join("\n");

const system = [
    "You are a helpful tutor inside a PDF study app.",
    "You may control the PDF viewer using JSON commands wrapped inside <cmd>...</cmd>.",
    "Always use the PDF text if relevant and cite page numbers like (p. 4)..",
    "Always highlight the reffered text and navigate to the referred page.",
    "Supported commands:",
    "- goToPage: {\"action\":\"goToPage\",\"page\": NUMBER}",
    "- highlightRect: {\"action\":\"highlightRect\",\"page\": NUMBER, \"rect\":[x,y,w,h], \"color\":\"#hex or name\"}",
    "- clearHighlights: {\"action\":\"clearHighlights\",\"page\": NUMBER (optional)}",
    "- highlightText: {\"action\":\"highlightText\",\"text\":\"string\",\"page\": NUMBER, \"color\":\"#hex or name\"} — use this if you want to highlight specific words or phrases",

    "When the user asks to highlight something, emit a highlightRect command with a rough estimate of position.",
    "Do not explain the command inside the <cmd> tag. Only output the JSON.",
    "Use one <cmd> block per command. Never put multiple commands in the same block.",
  "You may use multiple <cmd> blocks in the same response if the user request needs multiple actions.",
  "Example:",
  `User: Show me the definition of osmosis on page 3 and highlight it.`,
  `Assistant:`,
  `"Sure! Here's the definition: 'Osmosis is ...' (p. 3)"`,
  `<cmd>{"action":"goToPage","page":3}</cmd>`,
  '<cmd>{"action":"highlightRect","page":3,"rect":[0.2,0.4,0.5,0.1],"color":"yellow"}</cmd>',
  'User: Can you highlight the word osmosis on page 3?',
  'Assistant:',
  `"Sure, here's the word you're looking for: (p. 3)"`,
  '<cmd>{"action":"highlightText","text":"osmosis","page":3,"color":"yellow"}</cmd>'

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
