"use client";

import Image from "next/image";
import logo from "../assets/cygnal-logo.png";
import HeaderScanner from "../components/HeaderScanner";
import WhoisLookup from "../components/WhoisLookup";
import ScreenshotTool from "../components/ScreenshotTool"; // ✅ Add this
import "./Hero.css";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white font-sans px-6 py-10 relative overflow-hidden">
      {/* HERO SECTION */}
      <section className="hero-container text-center relative z-10">
        <div className="logo-wrapper">
          <Image
            src={logo}
            alt="Cygnal Logo"
            width={500}
            height={500}
            className="rotating-logo glow-hover"
            id="cygnal-logo"
          />
          <h1 className="hero-title glow-hover">Cygnal</h1>
          <p className="hero-subtitle glow-hover">
            From surface clues to silent signals
          </p>
        </div>
      </section>

      {/* SCANNERS SECTION */}
      <section className="mt-32 space-y-20 relative z-10">
        <HeaderScanner />
        <WhoisLookup />
        <ScreenshotTool /> {/* ✅ Add this */}
      </section>

      {/* FOOTER */}
      <footer className="mt-24 text-center text-sm text-gray-500 pb-6 relative z-10">
        Built by <strong>Ayush Singh Kshatriya</strong> | © 2025 Cygnal Project
      </footer>
    </main>
  );
}
