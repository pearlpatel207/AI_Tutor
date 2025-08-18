"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

type Props = {
  file: File | string | null;
};

export default function PdfViewer({ file }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  if (!file) {
    return <p className="text-gray-500">No PDF loaded yet</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 border rounded"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => p - 1)}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 border rounded"
          disabled={numPages === null || pageNumber >= numPages}
          onClick={() => setPageNumber((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
