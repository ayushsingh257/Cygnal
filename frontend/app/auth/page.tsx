"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import "./auth.css";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function AuthPage() {
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
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <h1 className="text-center text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-700 bg-clip-text text-transparent mb-10">
        🔐 Cygnal Authentication
      </h1>

      <div className="flex justify-center">
        <div>
          {showLogin ? <LoginForm /> : <RegisterForm />}

          <div className="auth-text">
            {showLogin ? (
              <>
                <span>Don't have an account?</span>
                <a
                  href="/auth?mode=register"
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle("register");
                  }}
                >
                  /Register
                </a>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <a
                  href="/auth?mode=login"
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle("login");
                  }}
                >
                  /Login
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
