// lib/auth.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getUserIdFromRequest() {
  const sessionToken = (await cookies()).get("session")?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!session) return null;

  const now = new Date();
  if (session.expiresAt < now) return null;

  return session.userId;
}
