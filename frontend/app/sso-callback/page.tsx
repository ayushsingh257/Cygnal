"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, Loader } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

function SSOCallbackComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("SAMLResponse");
    const state = searchParams.get("state") || "";

    if (!code) {
      setErrorMsg("SSO Authorization code missing.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/sso-callback`;
        const res = await fetch("/api/auth/sso/callback/entra_id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: redirectUri, state })
        });

        const data = await res.json();
        if (data.success) {
          login(data.token, data.user);
          toast.success("SSO Link Established!");
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
        } else {
          setErrorMsg(data.error || "SSO Callback verification failed.");
        }
      } catch (err) {
        setErrorMsg("Failed to synchronize with SSO provider.");
      }
    };

    exchangeCode();
  }, [searchParams, login, router]);

  return (
    <div className="w-full max-w-[390px] bg-[#0f2422]/20 backdrop-blur-xl border border-[#408A71]/15 rounded-2xl p-8 shadow-[0_0_50px_rgba(64,138,113,0.1)] text-center space-y-6 z-10">
      <div className="flex justify-center">
        <Shield className="h-10 w-10 text-[#B0E4CC] animate-pulse" />
      </div>
      
      <h2 className="text-xl font-extrabold tracking-wide text-white uppercase font-mono">
        {errorMsg ? "Link Failure" : "SSO Link Handshake"}
      </h2>

      {errorMsg ? (
        <div className="space-y-4">
          <p className="text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/30 rounded-xl p-3">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-xs font-bold tracking-widest uppercase font-mono transition-all"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <Loader className="h-5 w-5 text-[#B0E4CC] animate-spin" />
          <p className="text-[10px] text-[#a3c2b4] uppercase tracking-widest font-mono opacity-80">
            Exchanging federated security assertions...
          </p>
        </div>
      )}
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      <Toaster />
      <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-[#408A71]/[0.03] rounded-full blur-[130px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="w-full max-w-[390px] bg-[#0f2422]/20 backdrop-blur-xl border border-[#408A71]/15 rounded-2xl p-8 shadow-[0_0_50px_rgba(64,138,113,0.1)] text-center space-y-6 z-10 flex flex-col items-center">
          <Shield className="h-10 w-10 text-[#B0E4CC] animate-pulse" />
          <h2 className="text-xl font-extrabold tracking-wide text-white uppercase font-mono">Loading SSO...</h2>
          <Loader className="h-5 w-5 text-[#B0E4CC] animate-spin" />
        </div>
      }>
        <SSOCallbackComponent />
      </Suspense>
    </div>
  );
}
