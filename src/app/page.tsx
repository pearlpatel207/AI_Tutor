"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ChatSidebar from "@/components/ChatSidebar";
import LogoutButton from "@/components/LogoutButton";
import { PdfControlProvider } from "@/contexts/PdfControlContext";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
});

export default function HomePage() {
  const [currentPdfId, setCurrentPdfId] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string[]>([]);

  return (
    <PdfControlProvider>
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-3 border-b">
          <h1 className="text-xl font-bold">📄 Pearl's PDF Tutor </h1>
          <div className="flex gap-2">
            <LogoutButton />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <PdfViewer
            onPdfSelected={(id, text) => {
              setCurrentPdfId(id);
              setPdfText(text);
            }}
          />
          <ChatSidebar pdfId={currentPdfId} />
        </div>
      </div>
    </PdfControlProvider>
  );
}
