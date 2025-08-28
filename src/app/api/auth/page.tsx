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

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setMsg("Please enter both email and password.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMsg("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMsg(data.error || "Something went wrong");
        return;
      }

      // ✅ Reset form fields
      setEmail("");
      setPassword("");

      if (mode === "signup") {
        // Show success + switch to login
        setMsg("✅ Account created! Please log in.");
        setMode("login");
      } else {
        // On login, redirect
        router.push("/");
      }
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

        <form onSubmit={submit}>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              className="border p-2 mt-1 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <label className="block mb-4 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              className="border p-2 mt-1 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <button
            type="submit"
            className={`w-full px-4 py-2 rounded text-white font-medium transition ${
              loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : mode === "signup"
              ? "Sign Up"
              : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-3 text-center">
          {mode === "signup"
            ? "Already have an account?"
            : "Don’t have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMsg("");
              setEmail("");
              setPassword("");
            }}
            className="text-blue-600 underline"
            disabled={loading}
          >
            {mode === "signup" ? "Login here" : "Sign up here"}
          </button>
        </p>

        {msg && (
          <div
            className={`mt-4 text-sm text-center ${
              msg.startsWith("✅")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
