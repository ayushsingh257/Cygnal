"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
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
import "./Scanners.css"; // Updated CSS for tools

export default function Home() {
  const [activeTool, setActiveTool] = useState<number | null>(null);

  const tools = [
    { id: 0, name: "Header Scanner", component: <HeaderScanner /> },
    { id: 1, name: "WHOIS Lookup", component: <WhoisLookup /> },
    { id: 2, name: "Website Screenshot", component: <ScreenshotTool /> },
    { id: 3, name: "Metadata Recon Tool", component: <MetadataTool /> },
    { id: 4, name: "Reverse Image Search", component: <ReverseImageSearch /> },
  ];

  return (
    <main className="min-h-screen bg-black text-white font-sans px-6 py-10 relative overflow-hidden">
      {/* HERO SECTION */}
      <section className="hero-container text-center relative z-10">
        <div className="video-wrapper">
          <video
            autoPlay
            muted
            loop
            playsInline
            src="/cygnal-3d-logo.mp4"
            aria-label="Cygnal 3D rotating logo video"
          />
          <div className="video-text">
            <h1 className="hero-title">Cygnal</h1>
            <p className="hero-subtitle">From surface clues to silent signals</p>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section text-center mt-12 max-w-4xl mx-auto">
        <p className="text-lg text-gray-300 leading-relaxed">
          Cygnal leverages Open-Source Intelligence (OSINT) to uncover hidden insights from publicly available data. Our tools analyze websites, images, metadata, and more to empower investigators, researchers, and security professionals with actionable intelligence. Explore the power of OSINT with us!
        </p>
      </section>

      {/* SCANNERS SECTION */}
      <section className="scanners-section relative z-10 mt-16">
        <h2 className="text-4xl font-bold mb-10 text-center bg-gradient-to-r from-pink-500 to-purple-700 bg-clip-text text-transparent">
          Tools
        </h2>
        <div className="scanners-stack mx-auto max-w-4xl">
          {tools.map((tool) => (
            <div key={tool.id} className="tool-item">
              <button
                onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                className="tool-toggle w-full text-left p-6 bg-gray-800 rounded-t-lg font-semibold text-2xl hover:bg-gray-700 transition"
              >
                {tool.name}
              </button>
              <div
                className={`tool-content overflow-hidden transition-max-height ${
                  activeTool === tool.id ? "max-h-screen" : "max-h-0"
                }`}
              >
                {tool.component}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-24 text-center text-sm text-gray-500 pb-6 relative z-10">
        Built by <strong>Ayush Singh Kshatriya</strong> | © 2025 Cygnal Project
      </footer>
    </main>
  );
}