"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, ShieldAlert, Cpu } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Greetings investigator. Ask me security questions about open ports, missing headers, or case indicators registered in cygnal.db." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      let reply = "I've scanned the database index. I see 0 active critical alerts but 3 open cases. If you want, I can coordinate with Agent Beta to run domain sweeps on those targets.";
      if (userMessage.toLowerCase().includes("port")) {
        reply = "Open ports discovery details: Target domain example.com reports ports 80 (HTTP) and 443 (HTTPS) open. Active sweeps confirm zero vulnerabilities detected.";
      } else if (userMessage.toLowerCase().includes("case") || userMessage.toLowerCase().includes("incident")) {
        reply = "I see 3 active incident case cards filed. Case 01: 'Internal Sweep Review' holds 2 evidence documents vault records verified under SHA-256.";
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="h-[calc(100vh-140px)] flex flex-col justify-between space-y-4 font-sans text-left">
        
        {/* Title */}
        <div className="border-b border-white/5 pb-4 select-none">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            RAG AI Assistant Chat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Interrogate scanned indicators, open cases, and logs indices</p>
        </div>

        {/* Messages Logs view */}
        <div className="flex-1 overflow-y-auto bg-[#0d1117]/35 border border-white/5 rounded-xl p-5 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 max-w-xl ${m.role === "user" ? "ml-auto flex-row-reverse text-right" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "assistant" ? "bg-blue-550/10 border border-blue-500/20 text-blue-400" : "bg-slate-800 text-white border border-white/5"
              }`}>
                {m.role === "assistant" ? <Cpu size={14} /> : <span className="text-[10px] font-mono font-bold">INV</span>}
              </div>
              <div className={`p-4 rounded-xl text-xs leading-relaxed ${
                m.role === "assistant" ? "bg-[#0d1117]/70 text-slate-300 border border-white/5" : "bg-blue-500 text-white"
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-xl">
              <div className="h-8 w-8 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center shrink-0 animate-pulse text-blue-400">
                <Cpu size={14} />
              </div>
              <div className="p-4 bg-[#0d1117]/70 border border-white/5 rounded-xl text-xs text-slate-500 font-mono animate-pulse">
                Consulting threat vector registry database...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} className="flex gap-3 select-none">
          <Input
            type="text"
            placeholder="Type your security queries or ask about scanned hosts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="px-5">
            <Send size={13} />
          </Button>
        </form>

      </div>
    </DashboardShell>
  );
}
