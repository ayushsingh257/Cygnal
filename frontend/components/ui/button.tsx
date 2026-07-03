import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "danger";
  size?: "default" | "sm" | "lg";
}

const buttonVariants = {
  default: "btn-cyber text-white",
  outline: "border border-white/5 bg-[#0d1117]/65 hover:bg-white/[0.03] text-slate-350 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest",
  danger: "border border-red-500/25 bg-red-950/15 hover:bg-red-900/20 text-red-450 transition-colors text-xs font-mono uppercase tracking-widest",
};

const sizeVariants = {
  default: "px-4 py-2 rounded-md",
  sm: "px-2.5 py-1 text-[10px] tracking-wide rounded",
  lg: "px-6 py-3.5 rounded-lg text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed",
          buttonVariants[variant],
          sizeVariants[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
