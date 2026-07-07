"use client";

import React, { useEffect, useRef } from "react";
import { Shield } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  fadeDelay: number;
  fadeStart: number;
  fadingOut: boolean;
  reset: () => void;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface ParticleLoaderProps {
  progress: number;
  statusMessage: string;
}

export default function ParticleLoader({ progress, statusMessage }: ParticleLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const createParticle = (canvas: HTMLCanvasElement): Particle => {
    const particle: Particle = {
      x: 0,
      y: 0,
      speed: 0,
      opacity: 1,
      fadeDelay: 0,
      fadeStart: 0,
      fadingOut: false,
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() / 3 + 0.15;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.fadeDelay = Math.random() * 800 + 200;
        this.fadeStart = Date.now() + this.fadeDelay;
        this.fadingOut = false;
      },
      update() {
        this.y -= this.speed;
        if (this.y < 0) {
          this.reset();
        }
        if (!this.fadingOut && Date.now() > this.fadeStart) {
          this.fadingOut = true;
        }
        if (this.fadingOut) {
          this.opacity -= 0.005;
          if (this.opacity <= 0) {
            this.reset();
          }
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        // Color theme: light winter night teal rgb(176, 228, 204)
        ctx.fillStyle = `rgba(176, 228, 204, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, 0.6, Math.random() * 2.5 + 1.5);
      },
    };
    particle.reset();
    particle.y = Math.random() * canvas.height;
    return particle;
  };

  const calculateParticleCount = (canvas: HTMLCanvasElement) => {
    return Math.floor((canvas.width * canvas.height) / 8000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sizeToContainer = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      const count = calculateParticleCount(canvas);
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(canvas));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((particle) => {
        particle.update();
        particle.draw(ctx);
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    sizeToContainer();
    animate();

    const resizeObserver = new ResizeObserver(sizeToContainer);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#091413] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden"
    >
      <style jsx>{`
        @keyframes spotlight-rotate {
          0% { transform: rotateZ(0deg) scale(1); opacity: 0.35; }
          50% { transform: rotateZ(180deg) scale(1.15); opacity: 0.5; }
          100% { transform: rotateZ(360deg) scale(1); opacity: 0.35; }
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(64, 138, 113, 0.15); }
          50% { transform: scale(1.03); box-shadow: 0 0 45px rgba(176, 228, 204, 0.25); }
        }
        @keyframes border-spin {
          100% { transform: rotate(360deg); }
        }
        .spotlight-element {
          animation: spotlight-rotate 25s linear infinite;
        }
        .shield-glow {
          animation: scale-pulse 3s ease-in-out infinite;
        }
        .loading-border {
          animation: border-spin 8s linear infinite;
        }
      `}</style>

      {/* Rotating Conic Spotlights representing cybersecurity telemetry scanlines */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="spotlight-element absolute inset-0 m-auto rounded-full w-[120vw] h-[120vh]"
            style={{
              backgroundImage:
                i === 0
                  ? "conic-gradient(from 0deg at 50% 50%, transparent 42%, rgba(40, 90, 72, 0.12) 48%, rgba(176, 228, 204, 0.18) 50%, rgba(40, 90, 72, 0.12) 52%, transparent 58%)"
                  : "conic-gradient(from 120deg at 50% 50%, transparent 44%, rgba(64, 138, 113, 0.08) 49%, rgba(176, 228, 204, 0.12) 50%, rgba(64, 138, 113, 0.08) 51%, transparent 56%)",
              filter: "blur(18px)",
              transformOrigin: "50% 50%",
              animationDirection: i === 0 ? "normal" : "reverse",
              animationDuration: i === 0 ? "35s" : "45s",
            }}
          />
        ))}
      </div>

      {/* Canvas for particle animations */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Loading HUD content overlay */}
      <div className="space-y-7 text-center z-20 max-w-sm flex flex-col items-center justify-center">
        {/* Animated Glowing Icon */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-[#091413]/70 border border-[#408A71]/25 shield-glow">
          <Shield className="w-9 h-9 text-[#B0E4CC]" />
          <div className="absolute inset-0 rounded-2xl border border-dashed border-[#B0E4CC]/35 loading-border" />
        </div>

        <div className="space-y-2">
          <h1 className="text-sm font-black tracking-[0.4em] uppercase text-white font-mono">
            CYGNAL SECURE
          </h1>
          <p className="text-[10px] text-[#a3c2b4] font-mono tracking-widest uppercase opacity-85">
            Operational Handshake Active
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#091413]/90 h-1.5 rounded-full overflow-hidden p-0.5 border border-[#408A71]/15">
          <div
            className="bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live log messages */}
        <div className="h-10 flex items-center justify-center px-4">
          <span className="text-[10px] font-mono text-[#B0E4CC] tracking-wide uppercase font-semibold drop-shadow-[0_0_10px_rgba(176,228,204,0.3)] animate-pulse">
            {statusMessage}
          </span>
        </div>
      </div>
    </div>
  );
}
