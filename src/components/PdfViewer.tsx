"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { usePdfControl } from "@/contexts/PdfControlContext";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/pdf.worker.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

type Highlight = {
  page: number;
  rect: [number, number, number, number];
  color: string;
};

export default function PdfViewer() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { subscribe, send } = usePdfControl();

  // Handle PDF upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(pdf);

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    localStorage.setItem("pdfText", fullText);
    setNumPages(pdf.numPages);
  };

  // 🔍 Find rectangle of searched text
  const findTextRect = async (
    pageNum: number,
    searchText: string
  ): Promise<[number, number, number, number] | null> => {
    if (!pdfDoc) {
      console.error("❌ No PDF document loaded");
      return null;
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    for (const item of textContent.items as any[]) {
      if (item.str.toLowerCase().includes(searchText.toLowerCase())) {
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5] - item.height;
        const w = item.width;
        const h = item.height;

        const relX = x / viewport.width;
        const relY = y / viewport.height;
        const relW = w / viewport.width;
        const relH = h / viewport.height;

        return [relX, relY, relW, relH];
      }
    }

    return null;
  };

  useEffect(() => {
    if (!pdfDoc) return;

    const unsubscribe = subscribe((cmd) => {
      if (cmd.type === "goToPage") {
        setCurrentPage(cmd.page);
        setTimeout(() => {
          const pageEl = document.getElementById(`page_${cmd.page}`);
          if (pageEl && containerRef.current) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }

      if (cmd.type === "highlightRect") {
        const { page, rect, color = "yellow" } = cmd;
        setHighlights((prev) => [...prev, { page, rect, color }]);
      }

      if (cmd.type === "highlightText") {
        const { page, text, color = "yellow" } = cmd;
        findTextRect(page, text).then((rect) => {
          if (rect) {
            setHighlights((prev) => [...prev, { page, rect, color }]);
          } else {
            console.warn("Text not found on page", page, text);
          }
        });
      }

      if (cmd.type === "clearHighlights") {
        const page = cmd.page;
        if (page) {
          setHighlights((prev) => prev.filter((hl) => hl.page !== page));
        } else {
          setHighlights([]);
        }
      }
    });

    return () => unsubscribe();
  }, [subscribe, pdfDoc]);

  const renderHighlights = (pageNum: number) => {
    return highlights
      .filter((hl) => hl.page === pageNum)
      .map((hl, idx) => {
        const [x, y, w, h] = hl.rect;
        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              backgroundColor: hl.color,
              opacity: 0.4,
              pointerEvents: "none",
            }}
          />
        );
      });
  };

  return (
    <div className="w-2/3 h-screen overflow-auto p-4 border-r" ref={containerRef}>
      <div className="mb-4 space-y-2">
        {/* 🔘 Test Buttons */}
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
            onClick={() => send({ type: "goToPage", page: 3 })}
          >
            Go to Page 3
          </button>
          <button
            className="px-3 py-1 bg-yellow-500 text-black text-sm rounded"
            onClick={() =>
              send({
                type: "highlightRect",
                page: 3,
                rect: [0.1, 0.2, 0.3, 0.1],
                color: "orange",
              })
            }
          >
            Highlight on Page 3
          </button>
          <button
            className="px-3 py-1 bg-red-500 text-white text-sm rounded"
            onClick={() => send({ type: "clearHighlights", page: 3 })}
          >
            Clear Highlights (Page 3)
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white text-sm rounded"
            onClick={() =>
              send({
                type: "highlightText",
                text: "Culture",
                page: 3,
                color: "yellow",
              })
            }
          >
            Highlight "Culture" on Page 3
          </button>
        </div>
      </div>

      {/* PDF Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="text-sm"
        />
      </div>

      {/* PDF Viewer */}
      {fileUrl ? (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from(new Array(numPages), (_, index) => {
            const pageNumber = index + 1;
            return (
              <div
                key={pageNumber}
                id={`page_${pageNumber}`}
                className="relative mb-4"
              >
                <Page
                  pageNumber={pageNumber}
                  width={600}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                <div
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ pointerEvents: "none" }}
                >
                  {renderHighlights(pageNumber)}
                </div>
              </div>
            );
          })}
        </Document>
      ) : (
        <p className="text-gray-500 text-center mt-10">
          Upload a PDF to start!
        </p>
      )}
    </div>
  );
}
