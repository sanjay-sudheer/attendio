"use client";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function AdminLogin() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left column: form */}
      <div className="flex flex-col gap-4 p-6 md:p-12 bg-gradient-to-b from-white via-gray-50 to-gray-100">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-3 font-medium text-gray-900 group">
            <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10 ring-1 ring-indigo-200 group-hover:bg-indigo-600/20 transition">
              <Image src="/fingerprint.svg" alt="Attendio" width={24} height={24} className="text-indigo-600" />
            </span>
            <span className="font-semibold tracking-tight text-lg">Attendio Admin</span>
          </Link>
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
        
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-2 h-2 bg-white rounded-full animate-ping" style={{animationDuration: '3s'}}></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
          <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{animationDuration: '5s', animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 right-20 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDuration: '3.5s', animationDelay: '0.5s'}}></div>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative fp-animate-wrapper" aria-hidden="true">
            {/* Pulse rings - now with proper sizing */}
            <div className="fp-pulse-rings pointer-events-none">
              <span></span>
              <span></span>
              <span></span>
            </div>
            
            {/* Rotating orbit ring */}
            <div className="absolute -inset-20 pointer-events-none opacity-40" style={{animation: 'fp-rotate 20s linear infinite'}}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-200 rounded-full shadow-lg shadow-indigo-200/50"></div>
            </div>
            
            {/* Enhanced glow with multiple layers */}
            <div className="absolute -inset-16 pointer-events-none">
              <div className="fp-glow absolute inset-0 rounded-full bg-white/20 blur-3xl" />
              <div className="fp-glow absolute inset-4 rounded-full bg-indigo-300/30 blur-2xl" style={{animationDelay: '1s'}} />
            </div>
            
            {/* Fingerprint with enhanced styling */}
            <div className="relative">
              <Image 
                src="/fingerprint.svg" 
                alt="" 
                width={420} 
                height={420} 
                className="w-[420px] h-[420px] text-white opacity-95 drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)] relative filter brightness-110" 
              />
              {/* Inner glow ring */}
              <div className="absolute inset-0 rounded-full ring-2 ring-white/20 ring-offset-4 ring-offset-transparent animate-pulse" style={{animationDuration: '4s'}}></div>
            </div>
          </div>
        </div>
        
        {/* Enhanced overlay gradient */}
        <div className="absolute inset-0 mix-blend-overlay bg-[radial-gradient(circle_at_70%_40%,rgba(255,255,255,0.3),transparent_65%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 via-transparent to-transparent" />
      </div>
    </div>
  );
}
