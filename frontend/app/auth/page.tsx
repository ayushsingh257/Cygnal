"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, Sparkles, Activity, Award } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

const testimonials = [
  {
    quote: "Consolidated all subdomain sweeps and file hash checking into a single compliant ledger index.",
    author: "VP of Security Operations, Fortune 500"
  },
  {
    quote: "The SHA-256 evidence vault and access auditing logs have simplified forensic audit readiness.",
    author: "Principal Threat Investigator, Global Financial Services"
  }
];

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "login") setShowLogin(true);
    else if (mode === "register") setShowLogin(false);
  }, [searchParams]);

  // Testimonial slider timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = (mode: "login" | "register") => {
    setShowLogin(mode === "login");
    router.push(`/auth?mode=${mode}`);
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 flex items-stretch relative overflow-hidden select-none">
      
      {/* LEFT SIDE: Brand Presentation (hidden on small devices) */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#0b0f19]/35 border-r border-white/5 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid lines background overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 cyber-grid-dense opacity-[0.08]" />
          <div className="absolute bottom-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-blue-900/5 blur-[100px] opacity-75" />
        </div>

        {/* Logo and branding */}
        <div className="flex items-center gap-2.5 z-10">
          <Shield className="w-5.5 h-5.5 text-blue-500" />
          <span className="text-xs font-bold tracking-[0.2em] text-white uppercase font-sans">
            Cygnal Enterprise
          </span>
        </div>

        {/* Testimonial slider */}
        <div className="space-y-6 z-10 max-w-md my-auto select-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-black/25 px-3 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            <Award className="h-3.5 w-3.5 text-blue-450" /> Secure Recon Registry
          </div>
          
          <div className="min-h-[140px] flex flex-col justify-center">
            <blockquote className="text-xl font-medium text-white leading-relaxed">
              "{testimonials[currentTestimonial].quote}"
            </blockquote>
            <cite className="block text-[11px] font-mono text-slate-500 uppercase tracking-widest mt-4.5 not-italic">
              — {testimonials[currentTestimonial].author}
            </cite>
          </div>
        </div>

        {/* System metrics footer */}
        <div className="flex gap-8 text-[10px] font-mono text-slate-500 z-10 border-t border-white/5 pt-6 select-none uppercase tracking-widest">
          <span>SHA-256 SEALS COMPLIANCE</span>
          <span>•</span>
          <span>ISO27001 AUDITING READY</span>
        </div>
      </section>

      {/* RIGHT SIDE: centered login/registration card */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Grid lines background overlay for mobile */}
        <div className="lg:hidden absolute inset-0 z-0 select-none">
          <div className="absolute inset-0 cyber-grid-dense opacity-[0.08]" />
        </div>

        <div className="w-full max-w-[380px] glass-card rounded-xl p-6 bg-[#0b0f19]/65 border border-white/5 shadow-2xl z-10 space-y-6">
          <div className="flex justify-center items-center gap-2.5 lg:hidden">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-sans text-xs font-bold tracking-[0.15em] uppercase text-white">
              Cygnal Gateway
            </span>
          </div>

          {/* Tab triggers */}
          <div className="flex border-b border-white/5 text-xs select-none">
            <button
              onClick={() => handleToggle("login")}
              className={`flex-1 pb-3 font-semibold uppercase tracking-wider transition-all ${
                showLogin 
                  ? "border-b border-blue-500 text-blue-400 font-bold" 
                  : "text-slate-500 hover:text-slate-350"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleToggle("register")}
              className={`flex-1 pb-3 font-semibold uppercase tracking-wider transition-all ${
                !showLogin 
                  ? "border-b border-blue-500 text-blue-400 font-bold" 
                  : "text-slate-500 hover:text-slate-350"
              }`}
            >
              Enlist Node
            </button>
          </div>

          {/* Form area */}
          <div className="min-h-[260px] flex items-center justify-center">
            {showLogin ? <LoginForm /> : <RegisterForm />}
          </div>

          <div className="pt-4 border-t border-white/5 text-[9px] text-slate-550 font-mono text-center leading-relaxed select-none uppercase tracking-wider">
            Securing SSL session channel parameters...
          </div>
        </div>
      </section>

    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-slate-500 flex items-center justify-center font-sans animate-pulse text-xs tracking-widest select-none uppercase">
        Establishing security socket connection...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
