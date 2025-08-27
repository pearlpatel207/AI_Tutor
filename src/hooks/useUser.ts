// hooks/useUser.ts
import { useEffect, useState } from "react";

export type PdfData = {
  id: string;
  name: string;
  content: string;
  text: string;
};

export type UserData = {
  userId: string;
  pdfs: PdfData[];
};

export default function useUser() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
    };
    fetchUser();
  }, []);

  return user;
}
