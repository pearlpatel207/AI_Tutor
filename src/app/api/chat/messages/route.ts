import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth"; // or however you're managing auth

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pdfId = searchParams.get("pdfId");

  if (!pdfId) {
    return NextResponse.json({ error: "Missing pdfId" }, { status: 400 });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        userId,
        pdfId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
