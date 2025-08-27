/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const router = useRouter();

  const submit = async () => {
    if (!email || !password) {
      setMsg("Please enter both email and password.");
      return;
    }

    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMsg(data.error || "Something went wrong");
        return;
      }

      // ✅ Redirect on success
      router.push("/");
    } catch (err: any) {
      setLoading(false);
      setMsg(err.message || "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-xl font-bold mb-4 text-center">
          {mode === "signup" ? "Create an Account" : "Login"}
        </h1>

        <input
          type="email"
          className="border p-2 mb-2 w-full rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border p-2 mb-4 w-full rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={submit}
          className={`w-full px-4 py-2 rounded ${
            loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
          } text-white`}
          disabled={loading}
        >
          {loading ? "Loading..." : mode === "signup" ? "Sign Up" : "Login"}
        </button>

        <p className="text-sm text-gray-500 mt-3 text-center">
          {mode === "signup" ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMsg("");
            }}
            className="text-blue-600 underline"
          >
            {mode === "signup" ? "Login here" : "Sign up here"}
          </button>
        </p>

        {msg && (
          <div className="mt-4 text-sm text-red-600 text-center">{msg}</div>
        )}
      </div>
    </div>
  );
}
