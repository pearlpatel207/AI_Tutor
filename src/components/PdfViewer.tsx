/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { usePdfControl } from "@/contexts/PdfControlContext";
import * as pdfjsLib from "pdfjs-dist";
import useUser, { PdfData } from "@/hooks/useUser";

// PDF worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/pdf.worker.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

type Highlight = {
  page: number;
  rect: [number, number, number, number];
  color: string;
};

type TextChunk = {
  str: string;
  start: number;
  end: number;
  transform: number[];
  width: number;
  height: number;
};

export default function PdfViewer({ onPdfSelected }: { onPdfSelected: (pdfId: string, pageTexts: string[]) => void }) {
  const user = useUser();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [pageChunks, setPageChunks] = useState<Record<number, TextChunk[]>>({});
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { subscribe, send } = usePdfControl();

  const [currentPdfId, setCurrentPdfId] = useState<string | null>(null);

  // Track if initial PDF load has happened
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log(user);
    if (!user || !user.pdfs.length) return;
    // Load the latest PDF
    const latestPdf = user.pdfs[user.pdfs.length - 1];
    setFileUrl(latestPdf.content);

  }, [user]);

  // useEffect(() => {
  //   if (!user || user.pdfs.length === 0 || initialized) return;

  //   const pdf: PdfData = user.pdfs[0];
  //   setCurrentPdfId(pdf.id);
  //   setPageTexts([pdf.content]);
  //   onPdfSelected(pdf.id, [pdf.content]);

  //   setInitialized(true); // prevent re-running this effect
  // }, [user, onPdfSelected, initialized]);


  // 📂 Handle PDF upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();

    const url = URL.createObjectURL(file);
    setFileUrl(url);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(pdf);

    let allPageTexts: string[] = [];
    let allPageChunks: Record<number, TextChunk[]> = {};

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      let pageText = "";
      let chunks: TextChunk[] = [];
      let charCount = 0;

      for (const item of textContent.items as any[]) {
        const str = item.str;
        const start = charCount;
        const end = charCount + str.length;

        chunks.push({
          str,
          start,
          end,
          transform: item.transform,
          width: item.width,
          height: item.height,
        });

        pageText += str;
        charCount = end;
      }

      allPageTexts.push(pageText);
      allPageChunks[i] = chunks;
    }

    setPageTexts(allPageTexts);
    setPageChunks(allPageChunks);
    setNumPages(pdf.numPages);

    reader.onload = async () => {
      console.log("FileReader onload triggered");
      const base64 = reader.result as string;

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          content: base64,
          text: allPageTexts.join("\n\n"),
        }),
      });

      const data = await res.json();
      console.log("API response:", data);
    };

    reader.readAsDataURL(file);

    // localStorage.setItem("pdfText", allPageTexts.join("\n\n"));

  };

  useEffect(() => {
    const loadInitialPdf = async () => {
      if (!user || !user.pdfs.length || initialized) return;
  
      const pdf: PdfData = user.pdfs[0]; // or user.pdfs[user.pdfs.length - 1]
      setCurrentPdfId(pdf.id);
  
      const loadingTask = pdfjsLib.getDocument({ url: pdf.content });
      const loadedPdf = await loadingTask.promise;
  
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
  
      let allPageTexts: string[] = [];
      let allPageChunks: Record<number, TextChunk[]> = {};
  
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        const page = await loadedPdf.getPage(i);
        const textContent = await page.getTextContent();
  
        let pageText = "";
        let chunks: TextChunk[] = [];
        let charCount = 0;
  
        for (const item of textContent.items as any[]) {
          const str = item.str;
          const start = charCount;
          const end = charCount + str.length;
  
          chunks.push({
            str,
            start,
            end,
            transform: item.transform,
            width: item.width,
            height: item.height,
          });
  
          pageText += str;
          charCount = end;
        }
  
        allPageTexts.push(pageText);
        allPageChunks[i] = chunks;
      }
  
      setPageTexts(allPageTexts);
      setPageChunks(allPageChunks);
      onPdfSelected(pdf.id, allPageTexts);
      setFileUrl(pdf.content); // keep this for rendering
      setInitialized(true);
    };
  
    loadInitialPdf();
  }, [user, initialized, onPdfSelected]);
  

  // 🧠 React to incoming commands (from chat/AI/etc.)
  useEffect(() => {
    if (!pdfDoc) return;

    const unsubscribe = subscribe(async (cmd) => {
      console.log("PDF command received:", cmd);
      if (cmd.type === "goToPage") {
        setCurrentPage(cmd.page);
        setTimeout(() => {
          const pageEl = document.getElementById(`page_${cmd.page}`);
          if (pageEl && containerRef.current) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }

      if (cmd.type === "highlightText") {
        const { page, start, end, color = "yellow" } = cmd;
        const chunks = pageChunks[page];
        if (!chunks || !pdfDoc) return;
      
        const covered = chunks.filter(
          (c) => !(c.end < start || c.start > end)
        );
        if (covered.length === 0) return;
      
        const pageObj = await pdfDoc.getPage(page);
      
        // ✅ Match scale used in <Page width={600} />
        const scale = 600 / pageObj.view[2]; // view[2] = page width
        const viewport = pageObj.getViewport({ scale });
      
        function getItemBoundingBox(item: TextChunk) {
          const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const x = transform[4];
          const y = transform[5] - item.height;
          return {
            x,
            y,
            width: item.width,
            height: item.height,
          };
        }
      
        const newHighlights: Highlight[] = covered.map((item) => {
          const { x, y, width, height } = getItemBoundingBox(item);
          return {
            page,
            rect: [
              x / viewport.width,
              y / viewport.height,
              width / viewport.width,
              height / viewport.height,
            ],
            color,
          };
        });
      
        setHighlights((prev) => [...prev, ...newHighlights]);
      
        // 👀 Scroll to first highlight
        setTimeout(() => {
          const pageEl = document.getElementById(`page_${page}`);
          if (pageEl && containerRef.current) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 200);
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
  }, [subscribe, pdfDoc, pageChunks]);

  // 🖍️ Render highlight overlays
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
              borderRadius: "2px",
              boxShadow: "0 0 3px rgba(0,0,0,0.2)",
              pointerEvents: "none",
            }}
          />
        );
      });
  };

  return (
    <div className="w-2/3 h-full overflow-auto p-4 border-r" ref={containerRef}>
      <div className="mb-4 space-y-2">
        {/* 🔘 Test Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
            onClick={() => send({ type: "goToPage", page: 3 })}
          >
            Go to Page 3
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white text-sm rounded"
            onClick={() => {
              const page = 1;
              const start = 50;
              const end = 80;

              // ✅ Log the exact text being highlighted
              console.log(
                `Highlighting text on page ${page}:`,
                pageTexts[page - 1]?.slice(start, end)
              );

              send({
                type: "highlightText",
                page,
                start,
                end,
                color: "yellow",
              });
            }}
          >
            Highlight Span (50–80 on Page 1)
          </button>

          <button
            className="px-3 py-1 bg-red-500 text-white text-sm rounded"
            onClick={() => send({ type: "clearHighlights", page: 1 })}
          >
            Clear Highlights (Page 1)
          </button>
        </div>
      </div>

      {/* 📂 PDF Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="text-sm"
        />
      </div>

      {/* 📄 PDF Viewer */}
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
