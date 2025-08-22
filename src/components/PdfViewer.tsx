////////
// "use client";
// import { useEffect, useRef, useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
// import { usePdfControl } from "@/contexts/PdfControlContext";

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

// export default function PdfViewer({ file }: { file: string | File | null }) {
//   const { subscribe } = usePdfControl();
//   const [numPages, setNumPages] = useState<number>(0);
//   const [pageNumber, setPageNumber] = useState<number>(1);
//   const [overlays, setOverlays] = useState<
//     { page: number; rect: [number, number, number, number]; color?: string }[]
//   >([]);

//   // listen for commands
//   useEffect(() => {
//     return subscribe((cmd) => {
//       if (cmd.type === "goToPage") {
//         const p = Math.min(Math.max(cmd.page, 1), numPages || 1);
//         setPageNumber(p);
//       } else if (cmd.type === "clearHighlights") {
//         setOverlays((prev) =>
//           cmd.page ? prev.filter(o => o.page !== cmd.page) : []
//         );
//       } else if (cmd.type === "highlightRect") {
//         setOverlays((prev) => [...prev, { page: cmd.page, rect: cmd.rect, color: cmd.color }]);
//         if (cmd.page !== pageNumber) setPageNumber(cmd.page);
//       }
//     });
//   }, [subscribe, numPages, pageNumber]);

//   const onDocLoad = ({ numPages }: { numPages: number }) => setNumPages(numPages);

//   // overlay container size calc
//   const pageContainerRef = useRef<HTMLDivElement>(null);
//   const [pageSize, setPageSize] = useState<{w:number,h:number}>({w:0,h:0});
//   useEffect(() => {
//     const el = pageContainerRef.current;
//     if (!el) return;
//     const obs = new ResizeObserver(() => {
//       const r = el.getBoundingClientRect();
//       setPageSize({ w: r.width, h: r.height });
//     });
//     obs.observe(el);
//     return () => obs.disconnect();
//   }, []);

//   return (
//     <div className="w-2/3 h-screen overflow-auto relative bg-white">
//       {!file ? (
//         <div className="p-6 text-gray-500">Upload a PDF to begin.</div>
//       ) : (
//         <div className="relative">
//           <div ref={pageContainerRef} className="relative">
//             <Document file={file} onLoadSuccess={onDocLoad}>
//               <Page pageNumber={pageNumber} renderTextLayer={true} renderAnnotationLayer={true} />
//             </Document>

//             {/* overlays for current page */}
//             <svg
//               className="pointer-events-none absolute inset-0"
//               width="100%"
//               height="100%"
//             >
//               {overlays
//                 .filter(o => o.page === pageNumber)
//                 .map((o, i) => {
//                   const [x,y,w,h] = o.rect;
//                   return (
//                     <rect
//                       key={i}
//                       x={x * pageSize.w}
//                       y={y * pageSize.h}
//                       width={w * pageSize.w}
//                       height={h * pageSize.h}
//                       fill="none"
//                       stroke={o.color || "red"}
//                       strokeWidth={3}
//                       rx={6}
//                     />
//                   );
//                 })}
//             </svg>
//           </div>

//           <div className="flex items-center gap-2 p-2 border-t">
//             <button className="px-2 py-1 border rounded" onClick={() => setPageNumber(p => Math.max(1, p-1))}>Prev</button>
//             <span>Page {pageNumber} / {numPages || "…"}</span>
//             <button className="px-2 py-1 border rounded" onClick={() => setPageNumber(p => Math.min(numPages || p, p+1))}>Next</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

//// JUST THE VIEWER
// "use client";

// import { useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";

// import * as pdfjsLib from "pdfjs-dist";

// pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/pdf.worker.min.mjs";

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

// export default function PdfViewer() {
//   const [fileUrl, setFileUrl] = useState<string | null>(null);
//   const [numPages, setNumPages] = useState<number>(0);

//   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!e.target.files || !e.target.files[0]) return;

//     const file = e.target.files[0];
//     const url = URL.createObjectURL(file);
//     setFileUrl(url);
//     const arrayBuffer = await file.arrayBuffer();
//     const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

//     let fullText = "";
//     for (let i = 1; i <= pdf.numPages; i++) {
//       const page = await pdf.getPage(i);
//       const textContent = await page.getTextContent();
//       const pageText = textContent.items.map((item: any) => item.str).join(" ");
//       fullText += pageText + "\n";
//     }

//     localStorage.setItem("pdfText", fullText);
//     setNumPages(pdf.numPages);
//   };

//   return (
//     <div className="w-2/3 h-screen overflow-auto p-4 border-r">
//       <div className="mb-4">
//         <input
//           type="file"
//           accept="application/pdf"
//           onChange={handleUpload}
//           className="text-sm"
//         />
//       </div>

//       {fileUrl ? (
//         <Document
//           file={fileUrl}
//           onLoadSuccess={({ numPages }) => setNumPages(numPages)}
//         >
//           {Array.from(new Array(numPages), (_, index) => (
//             <Page key={index + 1} pageNumber={index + 1} />
//           ))}
//         </Document>
//       ) : (
//         <p className="text-gray-500 text-center mt-10">
//           Upload a PDF to start!
//         </p>
//       )}
//     </div>
//   );
// }


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

  const containerRef = useRef<HTMLDivElement>(null);
  const { subscribe } = usePdfControl();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

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

  // 🧠 Handle incoming commands from the AI/chat
  useEffect(() => {
    const unsubscribe = subscribe((cmd) => {
      if (cmd.type === "goToPage") {
        setCurrentPage(cmd.page);
        setTimeout(() => {
          const pageEl = document.getElementById(`page_${cmd.page}`);
          if (pageEl && containerRef.current) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100); // delay to allow page render
      }

      if (cmd.type === "highlightRect") {
        const { page, rect, color = "yellow" } = cmd;
        setHighlights((prev) => [...prev, { page, rect, color }]);
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
  }, [subscribe]);

  // 🖍️ Render highlights as overlays
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

  const { send } = usePdfControl();

  return (
    <div className="w-2/3 h-screen overflow-auto p-4 border-r" ref={containerRef}>
      <div className="mb-4 space-y-2">
        {/* <input type="file" accept="application/pdf" onChange={handleUpload} className="text-sm" /> */}

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
        </div>
      </div>
      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="text-sm"
        />
      </div>

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
                <Page pageNumber={pageNumber} width={600} renderTextLayer={false}  renderAnnotationLayer={false}/>
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
