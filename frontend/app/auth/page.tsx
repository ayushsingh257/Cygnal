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
    <main className="min-h-screen bg-[#020205] text-[#f1f5f9] flex flex-col items-center justify-center p-6 relative overflow-hidden cyber-grid">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-950/20 filter blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-950/20 filter blur-[120px] rounded-full pointer-events-none" />

      {/* Gateway Panel */}
      <div className="w-full max-w-[420px] glass-panel p-6 border border-white/5 bg-[#06060f]/90 z-10">
        <div className="flex justify-center items-center gap-2 mb-6 select-none">
          <Shield className="w-6 h-6 text-cyan-400 glow-cyan animate-pulse" />
          <span className="font-mono text-sm font-bold tracking-wider uppercase">Cygnal Security Node</span>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-white/5 mb-6">
          <button
            onClick={() => handleToggle("login")}
            className={`flex-1 pb-3 text-xs font-mono font-bold tracking-wider transition-all duration-200 border-b-2 ${
              showLogin 
                ? "border-cyan-400 text-cyan-400 font-bold" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            🔐 LOGIN
          </button>
          <button
            onClick={() => handleToggle("register")}
            className={`flex-1 pb-3 text-xs font-mono font-bold tracking-wider transition-all duration-200 border-b-2 ${
              !showLogin 
                ? "border-purple-500 text-purple-400 font-bold" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            👤 REGISTER
          </button>
        </div>

        {/* Dynamic Form wrapper */}
        <div className="min-h-[300px]">
          {showLogin ? <LoginForm /> : <RegisterForm />}
        </div>

        {/* Security Alert notice */}
        <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-gray-500 font-mono text-center leading-relaxed select-none">
          TACTICAL WARNING: SYSTEM GATEWAY ENFORCES ENCRYPTED HANDSHAKES. SESSION AUDITS IN PROGRESS.
        </div>
      </div>

    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020205] text-cyan-400 flex items-center justify-center font-mono animate-pulse">
        CONNECTING TO GATEWAY STREAM...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
