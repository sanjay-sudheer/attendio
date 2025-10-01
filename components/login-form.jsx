"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const allowedAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function LoginForm({ className, ...props }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        setError("User record not found.");
        return;
      }
      const data = userDoc.data();
      const emailAllowed = !allowedAdminEmails.length || allowedAdminEmails.includes(user.email.toLowerCase());
      if (data.role === "admin" && emailAllowed) {
        router.push("/dashboard");
      } else {
        setError("Access denied. You are not an admin.");
      }
    } catch (err) {
      const code = err.code || "unknown";
      let msg = "Login failed. Please try again.";
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code)) msg = "Invalid email or password.";
      else if (code === "auth/too-many-requests") msg = "Too many attempts. Try again later.";
      else if (code === "auth/network-request-failed") msg = "Network error. Check your connection.";
      setError(msg + (process.env.NODE_ENV !== 'production' ? ` (code: ${code})` : ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
        <p className="text-muted-foreground text-sm text-balance">Access the secure dashboard</p>
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</div>
      )}
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">Authorised users only.</p>
    </form>
  );
}
