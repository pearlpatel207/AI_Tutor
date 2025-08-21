"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
     ssr: false,
   });

import ChatSidebar from "@/components/ChatSidebar";
import { PdfControlProvider } from "@/contexts/PdfControlContext";
import LogoutButton from "@/components/LogoutButton";

export default function HomePage() {

  return (
    <PdfControlProvider>
      <div className="flex items-center justify-between p-3 border-b">
        <h1 className="text-xl font-bold">📄 PDF Tutor</h1>
        <div className="flex gap-2">
          <LogoutButton />
        </div>
      </div>
      <div className="flex">
        <PdfViewer />
        <ChatSidebar />
      </div>
    </PdfControlProvider>
  );
}
