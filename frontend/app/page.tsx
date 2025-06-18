"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import logo from "../assets/cygnal-logo.png";
import HeaderScanner from "../components/HeaderScanner";
import WhoisLookup from "../components/WhoisLookup";
import ScreenshotTool from "../components/ScreenshotTool";

// ✅ Dynamically import MetadataTool with SSR disabled
const MetadataTool = dynamic(() => import("../components/MetadataTool"), {
  ssr: false,
});

// ✅ Dynamically import ReverseImageSearch with SSR disabled
const ReverseImageSearch = dynamic(() => import("../components/ReverseImageSearch"), {
  ssr: false,
});

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
        <ScreenshotTool />
        <MetadataTool />

        {/* ✅ Reverse Image Search Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Reverse Image Search</h2>
          <ReverseImageSearch />
        </section>
      </section>

      {/* FOOTER */}
      <footer className="mt-24 text-center text-sm text-gray-500 pb-6 relative z-10">
        Built by <strong>Ayush Singh Kshatriya</strong> | © 2025 Cygnal Project
      </footer>
    </main>
  );
}

