"use client"

import React, { useState } from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react"

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "general",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulated contact form submit
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 grid md:grid-cols-12 gap-12">
        {/* Contact Info Side */}
        <div className="md:col-span-5 space-y-8 text-left">
          <div className="space-y-4">
            <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              Get in touch
            </span>
            <h1 className="text-4xl font-black uppercase tracking-tight">Connect with Cygnal</h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              If you have enterprise licensing inquiries, technical support tickets, or partnership opportunities, reach out directly to our security response nodes.
            </p>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <Mail className="text-[#ea580c] shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-white uppercase tracking-wider">Secure Email</p>
                <p className="text-slate-400 mt-1">inquiries@cygnal.secure</p>
                <p className="text-[10px] text-slate-500 mt-0.5">PGP: 0x8F9321A8CD (Available on security node)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <Phone className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-white uppercase tracking-wider">Enterprise Desk</p>
                <p className="text-slate-400 mt-1">+1 (800) 555-CYGNAL</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mon–Fri 08:00–18:00 UTC</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <MapPin className="text-orange-400 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-white uppercase tracking-wider">HQ Coordinates</p>
                <p className="text-slate-400 mt-1">Node 14, Silicon Alley</p>
                <p className="text-slate-400">San Francisco, CA 94107</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Side */}
        <div className="md:col-span-7">
          <div className="p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            {submitted ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl font-bold font-mono uppercase text-white">Transmission Received</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                  Your ticket has been compiled and dispatched. A security engineer will reply within 4 hours.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="btn-cyber text-[10px] uppercase tracking-widest font-mono"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono border-b border-[var(--border-subtle)] pb-3 text-white">
                  Operational Inquiry Form
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Your Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Agent Smith"
                      className="cyber-input"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Your Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. smith@agency.gov"
                      className="cyber-input"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Department Node</label>
                  <select 
                    className="cyber-input"
                    value={formState.subject}
                    onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                  >
                    <option value="general">General Enquiries</option>
                    <option value="licensing">Enterprise Onboarding &amp; Licensing</option>
                    <option value="disclosure">Responsible Vulnerability Disclosure</option>
                    <option value="support">Incident Triage Support Desk</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Secure Payload (Message)</label>
                  <textarea 
                    required
                    placeholder="Enter details of your request here..."
                    className="cyber-input h-32"
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-semibold text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  <Send size={12} /> Dispatch Transmission
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
