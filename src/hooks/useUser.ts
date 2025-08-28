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

  const fetchUser = async () => {
    const res = await fetch("/api/me");
    if (!res.ok) return;
    const data = await res.json();
    setUser(data);
  };

  // Fetch on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Log whenever user changes
  useEffect(() => {
    if (user) {
      console.log("🧑‍💻 User refreshed:", user);
      console.log("📂 Number of PDFs:", user.pdfs.length);
    }
  }, [user]);

  // Expose setUser in case we want to manually update locally
  return { user, refresh: fetchUser, setUser };
}
