// app/page.js
import React from "react";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/spotlight";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
  <nav className="flex justify-between items-center px-8 py-5 fixed w-full z-50 text-gray-900 bg-gradient-to-b from-white/80 via-white/40 to-transparent backdrop-blur-md">
        <a href="/" className="flex items-center gap-3 group">
          <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 ring-1 ring-indigo-200 group-hover:bg-indigo-600/20 transition">
            <img src="/fingerprint.svg" alt="Attendio" className="h-6 w-6 text-indigo-600" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Attendio</span>
        </a>
        <a
          href="/admin-login"
          className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Admin Login
        </a>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-24">
        {/* Subtle gradient background */}
  <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-gray-100/50" />
        
        {/* Enhanced brand spotlight */}
        <Spotlight
          className="-top-64 -left-32 md:-top-48 md:left-24 opacity-100"
          fill="#6366f1"
          opacity={0.22}
          blur={220}
          gradient
          mode="light"
        />
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-balance">
            Smart Attendance
            <br />
            <span className="text-indigo-600">Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed text-balance">
            IoT-powered fingerprint attendance system with real-time tracking and intelligent reporting
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/admin-login"
              className="px-8 py-4 bg-indigo-600 text-white rounded-full text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg btn-hover-scale"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors btn-hover-scale"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">
              Why Choose Attendio?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-balance">
              Seamless integration of hardware and software for modern attendance management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                className="group p-8 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 card-hover animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-balance">
            Ready to modernize your attendance system?
          </h2>
          <p className="text-xl text-gray-600 mb-8 text-balance">
            Start tracking attendance with IoT technology today
          </p>
          <a
            href="/admin-login"
            className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-full text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg btn-hover-scale"
          >
            Get Started Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-500">© 2025 Attendio. Built with modern IoT technology.</p>
        </div>
      </footer>
    </main>
  );
}
