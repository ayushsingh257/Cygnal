"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

export default function MarketingFooter() {
  // Footer link data
  const footerLinks = [
    {
      title: "Cygnal Platform",
      links: [
        { label: "About Cygnal", href: "/about" },
        { label: "Security & Disclosure", href: "/security" },
        { label: "Contact Operations", href: "/contact" },
      ],
    },
    {
      title: "Legal & Compliance",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Disclosures", href: "/cookie-policy" },
      ],
    },
  ];

  // Contact info data (logos present, text empty as requested)
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#ea580c]" />,
      text: "",
      href: "",
    },
    {
      icon: <Phone size={18} className="text-[#ea580c]" />,
      text: "",
      href: "",
    },
    {
      icon: <MapPin size={18} className="text-[#ea580c]" />,
      text: "",
    },
  ];

  // Social media icons with user's specific Instagram and LinkedIn accounts
  const socialLinks = [
    { icon: <FaInstagram size={20} />, label: "Instagram", href: "https://www.instagram.com/a.s.kshatriya99/" },
    { icon: <FaLinkedin size={20} />, label: "LinkedIn", href: "https://www.linkedin.com/in/ayush-singh-kshatriya/" },
  ];

  return (
    <footer className="bg-[#0F0F11]/90 relative h-fit rounded-t-3xl overflow-hidden border-t border-[var(--border-subtle)] z-10">
      <div className="max-w-7xl mx-auto px-6 py-14 md:py-10 lg:py-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-8">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#ea580c] text-3xl font-extrabold select-none">
                &hearts;
              </span>
              <span className="text-white text-3xl font-bold uppercase tracking-wider">Cygnal</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
              Secure Cryptographic Triage Systems. Decoupled real-time incident orchestration.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-sm font-semibold mb-6 uppercase tracking-wider font-mono">
                {section.title}
              </h4>
              <ul className="space-y-3 text-xs">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[var(--text-secondary)] hover:text-[#ea580c] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-6 uppercase tracking-wider font-mono">
              Contact Coordinates
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-xs text-[var(--text-secondary)]">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-[#ea580c] transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-[#ea580c] transition-colors">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-[var(--border-subtle)] my-8" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs space-y-4 md:space-y-0">
          {/* Social icons */}
          <div className="flex space-x-6 text-gray-400">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="hover:text-[#ea580c] transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-left text-[var(--text-dimmed)]">
            &copy; {new Date().getFullYear()} Cygnal Operations. All rights reserved.
          </p>
        </div>
      </div>

      {/* Text hover effect - mapped to Cygnal text */}
      <div className="lg:flex hidden h-[22rem] -mt-36 -mb-24 relative z-10">
        <TextHoverEffect text="Cygnal" className="z-50" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
