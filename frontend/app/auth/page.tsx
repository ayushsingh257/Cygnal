"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import "./auth.css";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "login") setShowLogin(true);
    else if (mode === "register") setShowLogin(false);
  }, [searchParams]);

  const handleToggle = (mode: "login" | "register") => {
    setShowLogin(mode === "login");
    router.push(`/auth?mode=${mode}`);
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-6 relative overflow-hidden cyber-grid">
      
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-950/5 filter blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-950/5 filter blur-[150px] rounded-full pointer-events-none" />

      {/* Gateway Panel */}
      <div className="w-full max-w-[400px] glass-panel p-6 border border-white/5 bg-[#0c0c0e]/95 z-10">
        <div className="flex justify-center items-center gap-2 mb-6 select-none">
          <Shield className="w-5 h-5 text-cyan-500" />
          <span className="font-mono text-xs font-semibold tracking-wider uppercase text-white">Cygnal Security Node</span>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-white/5 mb-5 select-none">
          <button
            onClick={() => handleToggle("login")}
            className={`flex-1 pb-2.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 border-b-2 ${
              showLogin 
                ? "border-cyan-500 text-cyan-400 font-bold" 
                : "border-transparent text-zinc-500 hover:text-zinc-400"
            }`}
          >
            🔐 LOGIN
          </button>
          <button
            onClick={() => handleToggle("register")}
            className={`flex-1 pb-2.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 border-b-2 ${
              !showLogin 
                ? "border-cyan-500 text-cyan-400 font-bold" 
                : "border-transparent text-zinc-500 hover:text-zinc-400"
            }`}
          >
            👤 REGISTER
          </button>
        </div>

        {/* Form area */}
        <div className="min-h-[290px]">
          {showLogin ? <LoginForm /> : <RegisterForm />}
        </div>

        {/* Security Warning */}
        <div className="mt-4 pt-3.5 border-t border-white/5 text-[8px] text-zinc-650 font-mono text-center leading-relaxed select-none">
          TACTICAL WARNING: SYSTEM GATEWAY ENFORCES ENCRYPTED HANDSHAKES. SESSION AUDITS IN PROGRESS.
        </div>
      </div>

    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] text-zinc-500 flex items-center justify-center font-mono animate-pulse text-xs">
        CONNECTING TO GATEWAY STREAM...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
