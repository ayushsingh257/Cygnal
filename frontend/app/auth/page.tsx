"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "./auth.css"; // Import the new CSS file

// Dynamically import the form components
const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function AuthPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <h1 className="text-center text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-700 bg-clip-text text-transparent mb-10">
        🔐 Cygnal Authentication
      </h1>

      <div className="flex justify-center">
        <div>
          {showLogin ? <LoginForm /> : <RegisterForm />}

          {/* Toggle Link */}
          <div className="auth-text">
            {showLogin ? (
              <>
                <span>Don't have an account?</span>
                <a href="/auth#register" onClick={() => setShowLogin(false)}>
                  /Register
                </a>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <a href="/auth#login" onClick={() => setShowLogin(true)}>
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