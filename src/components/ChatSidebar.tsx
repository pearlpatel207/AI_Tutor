// "use client";

// import { useState } from "react";

// type Message = {
//   sender: "user" | "ai" | "ai-streaming";
//   text: string;
// };

// export default function ChatSidebar() {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage: Message = { sender: "user", text: input };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");

//     const pdfText = localStorage.getItem("pdfText") || "";

//     // 🔍 Debug print
//     console.log("📤 Sending to /api/chat:", {
//         message: userMessage.text,
//         pdfText: pdfText.slice(0, 100) + "...", // print only first 100 chars for brevity
//     });

//     try {
//       const res = await fetch("/api/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: userMessage.text, pdfText }),
//       });

//       const reader = res.body?.getReader();
//       if (!reader) return;

//       const decoder = new TextDecoder();
//       let aiText = "";

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;
//         aiText += decoder.decode(value);
//         setMessages((prev) => [
//           ...prev.filter((m) => m.sender !== "ai-streaming"),
//           { sender: "ai-streaming", text: aiText },
//         ]);
//       }

//       // Final AI message
//       setMessages((prev) => [
//         ...prev.filter((m) => m.sender !== "ai-streaming"),
//         { sender: "ai", text: aiText },
//       ]);
//     } catch (err) {
//       console.error(err);
//       setMessages((prev) => [
//         ...prev,
//         { sender: "ai", text: "Error: Failed to get response from AI." },
//       ]);
//     }
//   };

//   const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") sendMessage();
//   };

//   return (
//     <div className="w-80 h-full border-l border-gray-300 p-4 flex flex-col">
//       <h2 className="text-lg font-bold mb-2">AI Chat</h2>

//       <div className="flex-1 overflow-y-auto mb-2 space-y-2">
//         {messages.map((msg, idx) => (
//           <div
//             key={idx}
//             className={`p-2 rounded ${
//               msg.sender === "user" ? "bg-blue-100 self-end" : "bg-gray-100 self-start"
//             }`}
//           >
//             {msg.text}
//           </div>
//         ))}
//       </div>

//       <div className="flex">
//         <input
//           type="text"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKey}
//           className="flex-1 border border-gray-300 rounded-l p-2 focus:outline-none"
//           placeholder="Type a message..."
//         />
//         <button
//           onClick={sendMessage}
//           className="bg-blue-500 text-white rounded-r px-4 hover:bg-blue-600"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useRef, useState } from "react";
import { usePdfControl } from "@/contexts/PdfControlContext";

type Message = { sender: "user" | "ai"; text: string };

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(true);      // TTS on/off
  const [listening, setListening] = useState(false);   // STT status
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { send: sendPdfCmd } = usePdfControl();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!speaking) return;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("SpeechRecognition not supported in this browser."); return; }
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
    // find <cmd> ... </cmd> segments
    const cmdRegex = /<cmd>([\s\S]*?)<\/cmd>/g;
    let m: RegExpExecArray | null;
    while ((m = cmdRegex.exec(chunk))) {
      try {
        const obj = JSON.parse(m[1].trim());
        if (obj.action === "goToPage" && typeof obj.page === "number") {
          sendPdfCmd({ type: "goToPage", page: obj.page });
        } else if (obj.action === "highlightRect" && Array.isArray(obj.rect) && typeof obj.page === "number") {
          const rect = obj.rect as [number, number, number, number];
          sendPdfCmd({ type: "highlightRect", page: obj.page, rect, color: obj.color });
        } else if (obj.action === "clearHighlights") {
          sendPdfCmd({ type: "clearHighlights", page: obj.page });
        }
      } catch {}
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user" as const, text: input };
    setMessages((p) => [...p, userMsg]);
    setInput("");

    const pdfText = localStorage.getItem("pdfText") || "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text, pdfText }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let aiText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        aiText += chunk;

        // parse commands inside the stream
        parseAndDispatchCommands(chunk);

        // update streaming text
        setMessages((prev) => {
          const copy = [...prev];
          // replace last AI message if streaming, else push
          const last = copy[copy.length - 1];
          if (last && last.sender === "ai") {
            copy[copy.length - 1] = { sender: "ai", text: aiText };
          } else {
            copy.push({ sender: "ai", text: aiText });
          }
          return copy;
        });
      }

      speak(aiText.replace(/<cmd>[\s\S]*?<\/cmd>/g, "").trim()); // speak visible text only
    } catch (e) {
      setMessages((p) => [...p, { sender: "ai", text: "❌ Error contacting AI." }]);
    }
  };

  return (
    <div className="w-1/3 h-screen border-l flex flex-col bg-gray-50">
      <div className="p-3 border-b flex items-center gap-2 bg-white">
        <button
          onClick={() => setSpeaking(s => !s)}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded max-w-[85%] ${m.sender === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-gray-900 mr-auto"}`}>
            {/* hide command blocks in the bubble */}
            {m.text.replace(/<cmd>[\s\S]*?<\/cmd>/g, "").trim()}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Ask about your PDF…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
}
