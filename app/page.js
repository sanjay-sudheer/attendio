// app/page.js
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/spotlight";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
          <span className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-600/10 ring-1 ring-indigo-200 group-hover:bg-indigo-600/20 transition">
            <Image src="/fingerprint.svg" alt="Attendio" width={20} height={20} className="sm:w-6 sm:h-6 text-indigo-600" />
          </span>
          <span className="text-lg sm:text-xl font-semibold tracking-tight">Attendio</span>
        </Link>
        <Link
          href="/admin-login"
          className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gray-900 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          Admin Login
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-gray-100/50 -z-10" />
        
        {/* Spotlight */}
        <Spotlight
          className="-top-40 -left-20 sm:-top-64 sm:-left-32 md:-top-48 md:left-24"
          fill="#6366f1"
          opacity={0.22}
          blur={220}
          gradient
          mode="light"
        />
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight px-2">
            Smart Attendance
            <br />
            <span className="text-indigo-600">Made Simple</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-8 sm:mb-10 lg:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
            IoT-powered fingerprint attendance system with real-time tracking and intelligent reporting
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 max-w-sm sm:max-w-none mx-auto">
            <a
              href="/admin-login"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-full text-base sm:text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg text-center"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 rounded-full text-base sm:text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors text-center"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll indicator - hidden on mobile */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden sm:block">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              Why Choose Attendio?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
              Seamless integration of hardware and software for modern attendance management
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                title: "Real-Time Enrollment",
                description: "Instantly enroll fingerprints through your web dashboard with ESP32 integration",
                icon: "⚡"
              },
              {
                title: "Smart Tracking",
                description: "Automated attendance logging with R307 sensor and Firestore database",
                icon: "📊"
              },
              {
                title: "Modern Dashboard",
                description: "Intuitive web interface for monitoring, reporting, and user management",
                icon: "💻"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
            Ready to modernize your attendance system?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 px-2">
            Start tracking attendance with IoT technology today
          </p>
          <a
            href="/admin-login"
            className="inline-block w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-full text-base sm:text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg max-w-xs mx-auto sm:max-w-none"
          >
            Get Started Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-gray-500">© 2025 Attendio. Built with modern IoT technology.</p>
        </div>
      </footer>
    </main>
  );
}
