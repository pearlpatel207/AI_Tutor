import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // This clears the 'session' cookie
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
