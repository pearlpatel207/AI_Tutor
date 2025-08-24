"use client";
import { createContext, useContext, useMemo } from "react";

type PdfCommand =
  | { type: "goToPage"; page: number }
  | { type: "clearHighlights"; page?: number }
  | { type: "highlightText"; page: number; start: number, end: number, color: string };

  //| { type: "highlightText"; page: number; text: string; color: string };
  

type PdfControl = {
  send: (cmd: PdfCommand) => void;
  subscribe: (fn: (cmd: PdfCommand) => void) => () => void;
};

const Ctx = createContext<PdfControl | null>(null);

export function PdfControlProvider({ children }: { children: React.ReactNode }) {
  const subs = useMemo(() => new Set<(c: PdfCommand) => void>(), []);
  const value = useMemo<PdfControl>(() => ({
    send: (cmd) => subs.forEach(fn => fn(cmd)),
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); }
  }), [subs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePdfControl() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePdfControl must be used within PdfControlProvider");
  return ctx;
}
