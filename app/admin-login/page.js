"use client";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function AdminLogin() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left column: form */}
      <div className="flex flex-col gap-4 p-6 md:p-12 bg-gradient-to-b from-white via-gray-50 to-gray-100">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-3 font-medium text-gray-900 group">
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10 ring-1 ring-indigo-200 group-hover:bg-indigo-600/20 transition">
              <Image src="/fingerprint.svg" alt="Attendio" width={24} height={24} className="text-indigo-600" />
            </span>
            <span className="font-semibold tracking-tight text-lg">Attendio Admin</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow p-8">
            <LoginForm />
          </div>
        </div>
      </div>
      {/* Right column: fingerprint illustration */}
      <div className="relative hidden lg:block overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative fp-animate-wrapper" aria-hidden="true">
            {/* Pulse rings */}
            <div className="fp-pulse-rings pointer-events-none">
              <span></span>
              <span></span>
              <span></span>
            </div>
            {/* Glow */}
            <div className="fp-glow absolute -inset-14 rounded-full bg-indigo-300/30 blur-3xl" />
            {/* Fingerprint */}
            <Image src="/fingerprint.svg" alt="" width={420} height={420} className="w-[420px] h-[420px] text-white opacity-95 drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)] relative" />
          </div>
        </div>
        <div className="absolute inset-0 mix-blend-overlay bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.3),transparent_65%)]" />
      </div>
    </div>
  );
}
