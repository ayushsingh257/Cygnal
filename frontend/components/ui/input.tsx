import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "w-full bg-[#09090b] border border-white/5 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-500 font-mono transition-all duration-150 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
