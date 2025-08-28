// api/auth/login/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const res = NextResponse.json({ message: "Logged in!" });
  res.cookies.set({
    name: "session",
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}

