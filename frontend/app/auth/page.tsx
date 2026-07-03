"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(true);

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
    <main className="min-h-screen bg-[#060814] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      
      {/* Background Grids */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 cyber-grid-dense opacity-[0.22]" />
        <div className="absolute top-[20%] left-[25%] w-[500px] h-[500px] rounded-full bg-cyan-950/10 blur-[120px] opacity-60" />
      </div>

      {/* Gateway Panel */}
      <div className="w-full max-w-[420px] glass-card rounded-xl p-6 border border-white/10 bg-[#0d1117]/60 z-10 space-y-6">
        <div className="flex justify-center items-center gap-2.5">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-xs font-extrabold tracking-[0.2em] uppercase text-white">
            Cygnal Portal Node
          </span>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-white/5 text-xs">
          <button
            onClick={() => handleToggle("login")}
            className={`flex-1 pb-3 font-mono uppercase tracking-widest transition-all ${
              showLogin 
                ? "border-b border-cyan-400 text-cyan-400 font-bold" 
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleToggle("register")}
            className={`flex-1 pb-3 font-mono uppercase tracking-widest transition-all ${
              !showLogin 
                ? "border-b border-cyan-400 text-cyan-400 font-bold" 
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            Enlist Node
          </button>
        </div>

        {/* Form area */}
        <div className="min-h-[280px] flex items-center justify-center">
          {showLogin ? <LoginForm /> : <RegisterForm />}
        </div>

        {/* Security Warning */}
        <div className="pt-4 border-t border-white/5 text-[9px] text-slate-600 font-mono text-center leading-relaxed select-none uppercase tracking-wider">
          System gate enforces encrypted end-to-end sessions. Active audit logging is in progress.
        </div>
      </div>

    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060814] text-slate-500 flex items-center justify-center font-mono animate-pulse text-[10px] tracking-widest">
        INITIALIZING SYSTEM GATEWAY SESSION...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
