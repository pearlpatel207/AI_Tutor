// app/api/pdf/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";


export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, content, text } = await req.json();
  if (!name || !content) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  try {
    const pdf = await prisma.pdf.create({
      data: {
        userId,
        name,
        content,
        text,
      },
    });

    return NextResponse.json({ success: true, pdf }, { status: 201 });
  } catch (error) {
    console.error("Error creating PDF:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

