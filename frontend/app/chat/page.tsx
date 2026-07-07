"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { MessageSquare, Send, Sparkles, AlertCircle, RefreshCw, Cpu } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIChatPage() {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "### 🧠 Welcome to Cygnal Cognitive RAG Assistant\n\nI am connected directly to your operational SQLite ledger databases. Ask me about:\n- Active cases and incident metrics (e.g. `Show active cases`)\n- Timeline event records for specific Case Numbers (e.g. `Summarize case CYG-2026-0001`)\n- Cryptographic hashes of evidence files inside the vault\n- Telemetry scans history from multi-sensor engines",
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) setInput("");

    // Append user message
    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: query })
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        toast.error(data.error || "RAG engine query execution error.");
      }
    } catch {
      toast.error("RAG agent connection timed out.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Summarize cases registry",
    "List evidence file hashes",
    "Describe active alerts",
    "Help check recent WHOIS scans"
  ];

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Header HUD banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Cognitive RAG Workspace
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Interrogate database logs, forensic timelines, and passive scan records using natural language.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#091413]/60 border border-[#408A71]/15 px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#B0E4CC]">
            <Cpu className="w-3.5 h-3.5" /> Context Window: Active
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 text-left">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              disabled={loading}
              className="text-[10px] font-mono border border-[#408A71]/10 bg-[#0f2422]/5 text-[#a3c2b4] hover:text-[#B0E4CC] hover:border-[#408A71]/35 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              ✨ {s}
            </button>
          ))}
        </div>

        {/* Chat Interface Container */}
        <div className="border border-[#408A71]/15 rounded-2xl bg-[#0f2422]/5 overflow-hidden flex flex-col h-[550px] relative">
          
          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-left">
            {messages.map((m, idx) => (
              <div 
                key={idx}
                className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <div className="w-8 h-8 rounded-lg bg-[#408A71]/15 border border-[#408A71]/25 flex items-center justify-center text-[#B0E4CC] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div className="space-y-1 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      {m.role === "user" ? "Investigator Node" : "Cygnal RAG"}
                    </span>
                    <span className="text-[8px] font-mono text-slate-650">
                      {m.timestamp}
                    </span>
                  </div>
                  <div 
                    className={`rounded-2xl p-4 text-xs leading-relaxed border font-sans whitespace-pre-line ${
                      m.role === "user"
                        ? "bg-[#285A48]/15 border-[#408A71]/20 text-white rounded-tr-none"
                        : "bg-[#091413]/70 border-[#408A71]/10 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-[#285A48]/15 border border-[#408A71]/25 flex items-center justify-center text-[#B0E4CC] shrink-0 font-mono text-xs font-bold uppercase select-none">
                    IN
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-lg bg-[#408A71]/15 border border-[#408A71]/25 flex items-center justify-center text-[#B0E4CC] shrink-0 animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    Cygnal RAG
                  </span>
                  <div className="bg-[#091413]/70 border border-[#408A71]/10 rounded-2xl p-4 text-xs text-slate-450 italic">
                    Querying databases and correlates artifacts...
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Chat Input Cockpit */}
          <div className="border-t border-[#408A71]/15 bg-[#091413]/80 p-4">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-3 items-center"
            >
              <div className="relative flex-1">
                <MessageSquare className="absolute left-4 top-3.5 w-4 h-4 text-[#408A71]/60" />
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="Ask about active cases, evidence hashes, or scanner logs..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-[#091413]/60 border border-[#408A71]/15 rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white p-3.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(64,138,113,0.2)] shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
