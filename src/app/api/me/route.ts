// api/me
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: { include: { pdfs: true } } },
  });

  if (!session || new Date() > session.expiresAt) {
    return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.user.id,
    pdfs: session.user.pdfs, // Array of PDFs with ids, names, etc.
  });
}
