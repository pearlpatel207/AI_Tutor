"use client";

import { useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/pdf.worker.min.mjs";

type Props = {
  fileUrl: string;
};

export default function PDFViewer({ fileUrl }: Props) {
  useEffect(() => {
    const loadPdf = async () => {
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;
      let allText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        allText += strings.join(" ") + "\n";
      }

      // ✅ Save text so ChatSidebar can access it
      localStorage.setItem("pdfText", allText);
      console.log("✅ Extracted PDF text saved to localStorage:", allText.slice(0, 200) + "...");
    };

    if (fileUrl) loadPdf();
  }, [fileUrl]);

  return (
    <div className="w-full h-full flex items-center justify-center text-gray-600">
      <embed src={fileUrl} type="application/pdf" className="w-full h-full" />
    </div>
  );
}
