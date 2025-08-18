"use client";

import { useState } from "react";

type Message = {
  sender: "user" | "ai" | "ai-streaming";
  text: string;
};

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value);
        setMessages((prev) => [
          ...prev.filter((m) => m.sender !== "ai-streaming"),
          { sender: "ai-streaming", text: aiText },
        ]);
      }

      // Final AI message
      setMessages((prev) => [
        ...prev.filter((m) => m.sender !== "ai-streaming"),
        { sender: "ai", text: aiText },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Error: Failed to get response from AI." },
      ]);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="w-80 h-full border-l border-gray-300 p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-2">AI Chat</h2>

      <div className="flex-1 overflow-y-auto mb-2 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.sender === "user" ? "bg-blue-100 self-end" : "bg-gray-100 self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 border border-gray-300 rounded-l p-2 focus:outline-none"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white rounded-r px-4 hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
