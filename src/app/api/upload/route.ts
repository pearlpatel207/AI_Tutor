import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdf(buffer);

  return NextResponse.json({
    text: data.text, // full text of PDF
    info: data.info,
    numpages: data.numpages,
  });
}
