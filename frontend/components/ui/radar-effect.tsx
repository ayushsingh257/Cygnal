"use client";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import React from "react";

export const Circle = ({ className, children, idx, ...rest }: any) => {
  return (
    <motion.div
      {...rest}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: idx * 0.1, duration: 0.2 }}
      className={twMerge(
        "absolute inset-0 left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 transform rounded-full border border-neutral-800",
        className
      )}
    />
  );
};

export const Radar = ({ className }: { className?: string }) => {
  const circles = new Array(8).fill(1);
  return (
    <div
      className={twMerge(
        "relative flex h-20 w-20 items-center justify-center rounded-full",
        className
      )}
    >
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(20deg); }
          to   { transform: rotate(380deg); }
        }
        .animate-radar-spin {
          animation: radar-spin 10s linear infinite;
        }
      `}</style>
      {/* Rotating sweep line */}
      <div
        style={{ transformOrigin: "right center" }}
        className="animate-radar-spin absolute right-1/2 top-1/2 z-45 flex h-[5px] w-[300px] items-end justify-center overflow-hidden bg-transparent pointer-events-none"
      >
        <div className="relative z-45 h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#408A71]/50 to-transparent" />
      </div>
      {/* Concentric circles */}
      {circles.map((_, idx) => (
        <Circle
          style={{
            height: `${(idx + 1) * 4}rem`,
            width: `${(idx + 1) * 4}rem`,
            border: `1px solid rgba(64, 138, 113, ${0.4 - (idx + 1) * 0.04})`,
          }}
          key={`circle-${idx}`}
          idx={idx}
        />
      ))}
    </div>
  );
};

export const IconContainer = ({
  icon,
  text,
  delay,
}: {
  icon?: React.ReactNode;
  text?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: delay ?? 0 }}
      className="relative z-50 flex flex-col items-center justify-center space-y-1.5"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#408A71]/20 bg-[#0f2422]/60 shadow-[0_0_12px_rgba(64,138,113,0.1)] hover:border-[#408A71] transition-colors duration-300">
        {icon || (
          <svg className="h-6 w-6 text-[#B0E4CC]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="hidden rounded-md px-1.5 py-0.5 md:block">
        <div className="text-center text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
          {text}
        </div>
      </div>
    </motion.div>
  );
};
