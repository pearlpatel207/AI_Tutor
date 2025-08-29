export const runtime = "nodejs";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { message, pdfId, userId, pdfText } = await req.json();

  // console.log(pdfId, pdfText);

  if (!message || !pdfId || !userId) {
    return new Response(JSON.stringify({ error: "Missing message, pdfId, or userId" }), { status: 400 });
  }

  const previousMessages = await prisma.chatMessage.findMany({
    where: { pdfId, userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const history = previousMessages.reverse().map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Save user message right away
  await prisma.chatMessage.create({
    data: {
      userId,
      pdfId,
      role: "user",
      content: message,
    },
  });

  const system = [
    "You are a helpful tutor in a PDF study app. Your primary responsibility is to help users understand PDF content while controlling the PDF viewer using JSON commands.",
    
    "Your responses must always do the following, in this exact order, when the user refers to PDF content:",
    "2. Highlight the referred text using <cmd> with the highlightRect command.",
    "3. Then and only then, provide your explanation or answer to the user.",
    
    "🚨 These rules are REQUIRED — do not skip them under any circumstance:",
    "- If you reference or quote anything from the PDF (even a phrase), you MUST issue a highlightRect command first.",
    "- Do not answer or explain anything based on PDF content until the above commands are issued.",
    
    "🧠 Use best effort to estimate the rectangle position of the referred text using highlightRect. You may assume the page layout is standard and rough estimation is acceptable.",
    
    "✅ Always use the following command structure, with each in its own <cmd> block:",
    "- <cmd>{\"action\": \"highlightText\", \"start\": NUMBER, \"end\": NUMBER \"page\": NUMBER, \"color\": \"#hex or name\"}</cmd>",
  
    "🛑 DO NOT include null or unused fields.",
    "🛑 DO NOT explain or comment on commands inside <cmd> blocks.",
    
    "💡 Commands supported:",
    "- highlightText: {\"action\": \"highlightText\", \"start\": NUMBER, \"end\": NUMBER \"page\": NUMBER, \"color\": \"#hex or name\" }",
    "- clearHighlights: {\"action\": \"clearHighlights\", \"page\": NUMBER (optional) }",
    
    "If the user doesn't reference the PDF, you may skip PDF commands and answer normally.",
    "If the reference is vague (e.g., 'that part about X'), try your best to find it in the PDF context provided."
  ].join("\n");
  
  
  
  const result = await streamText({
    model: google("gemini-2.5-flash"),
    system,
    messages: [
      { role: "user", content: `PDF Context:\n${pdfText}\n\nUser: ${message}` },
      ...history,
      { role: "user", content: message },
    ],
    
  });

  console.log("🚀 Final Payload to Gemini:", JSON.stringify(result, null, 2));

  // Get a Response that contains the streaming body
  const textResponse = await result.toTextStreamResponse();
  const originalBody = textResponse.body;
  if (!originalBody) {
    // nothing to stream back — return as-is
    return textResponse;
  }

  const reader = originalBody.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  const proxyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || !value) break;

          fullResponse += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err as Error);
        throw err;
      } finally {
        controller.close();
        try {
          await prisma.chatMessage.create({
            data: {
              userId,
              pdfId,
              role: "assistant",
              content: fullResponse,
            },
          });
        } catch (dbErr) {
          console.error("Failed to save assistant message:", dbErr);
        }
      }
    },
  });

  // Preserve headers from original response (content-type, etc.)
  const headers = new Headers(textResponse.headers);
  return new Response(proxyStream, { headers });
}
