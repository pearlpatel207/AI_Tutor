"use client";

import { useEffect, useRef, useState } from "react";
import { usePdfControl } from "@/contexts/PdfControlContext";

type Message = { sender: "user" | "ai"; text: string };

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(true);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { send: sendPdfCmd } = usePdfControl();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!speaking || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Speech recognition not supported in this browser.");
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
    };

    rec.start();
  };

  const parseAndDispatchCommands = (chunk: string) => {
    const cmdRegex = /<cmd>([\s\S]*?)<\/cmd>/g;
    let match: RegExpExecArray | null;
  
    while ((match = cmdRegex.exec(chunk))) {
      try {
        console.log("📥 Found <cmd>:", match[1]); // <-- DEBUG LINE
  
        const raw = JSON.parse(match[1].trim());
  
        if (raw.action === "goToPage" && typeof raw.page === "number") {
          console.log("➡️ Going to page", raw.page);
          sendPdfCmd({ type: "goToPage", page: raw.page });
  
        } else if (raw.action === "highlightRect") {
          console.log("🟨 Highlighting:", raw);
          sendPdfCmd({
            type: "highlightRect",
            page: raw.page,
            rect: raw.rect,
            color: raw.color || "yellow",
          });
  
        } else if (raw.action === "clearHighlights") {
          console.log("🧽 Clearing highlights on page", raw.page);
          sendPdfCmd({ type: "clearHighlights", page: raw.page });
  
        } else if (raw.action === "highlightText") {
          console.log("🔍 Highlighting text:", raw.text);
          sendPdfCmd({
            type: "highlightText",
            text: raw.text,
            page: raw.page,
            color: raw.color || "yellow",
          });
        } else {
          console.warn("❓ Unknown action", raw);
        }
      } catch (err) {
        console.error("❌ Failed to parse <cmd>", match[1], err);
      }
    }
  };
  

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const pdfText = localStorage.getItem("pdfText") || "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, pdfText }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream from AI");

      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        aiText += chunk;

        // 🚀 Stream + parse commands
        parseAndDispatchCommands(chunk);

        // 📲 Update streaming message
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.sender === "ai") {
            return [...prev.slice(0, -1), { sender: "ai", text: aiText }];
          }
          return [...prev, { sender: "ai", text: aiText }];
        });
      }

      // 🎙️ Speak the final message (cleaned)
      const visibleText = aiText.replace(/<cmd>[\s\S]*?<\/cmd>/g, "").trim();
      speak(visibleText);

    } catch (err) {
      console.error("AI error:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: "❌ Error contacting AI." }]);
    }
  };

  return (
    <div className="w-1/3 h-screen border-l flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="p-3 border-b flex items-center gap-2 bg-white">
        <button
          onClick={() => setSpeaking((s) => !s)}
          className={`px-3 py-1 rounded ${speaking ? "bg-green-500 text-white" : "bg-gray-200"}`}
          title="Toggle text-to-speech"
        >
          🔊 {speaking ? "On" : "Off"}
        </button>
        <button
          onClick={startListening}
          className={`px-3 py-1 rounded ${listening ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          title="Hold to dictate"
        >
          🎤 {listening ? "Listening…" : "Dictate"}
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[85%] whitespace-pre-wrap ${
              m.sender === "user"
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-200 text-gray-900 mr-auto"
            }`}
          >
            {/* Hide <cmd> in chat display */}
            {m.text.replace(/<cmd>[\s\S]*?<\/cmd>/g, "").trim()}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Ask about your PDF…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}
