// app/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
});
import ChatSidebar from "@/components/ChatSidebar";

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side: PDF viewer */}
      <div className="flex-1 flex flex-col">
        <div className="p-2 border-b">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="block text-sm"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <PdfViewer file={pdfUrl} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Upload a PDF to get started
            </div>
          )}
        </div>
      </div>

      {/* Right side: Chat */}
      <ChatSidebar />
    </div>
  );
}