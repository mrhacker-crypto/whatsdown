import React from "react";
import { MessageSquare, ArrowDown } from "lucide-react";

interface WhatsDownLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function WhatsDownLogo({ size = "md", className = "" }: WhatsDownLogoProps) {
  const dimensions = {
    sm: { container: "h-10 w-10", icon: "h-6 w-6" },
    md: { container: "h-14 w-14", icon: "h-8 w-8" },
    lg: { container: "h-16 w-16", icon: "h-10 w-10" },
    xl: { container: "h-20 w-20", icon: "h-12 w-12" },
  };

  const selected = dimensions[size] || dimensions.md;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${selected.container} ${className}`}>
      {/* Outer ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-emerald-400/20 blur-xl rounded-full animate-pulse" />
      
      {/* Custom styled icon frame */}
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-[#1B2024] border border-teal-500/30 text-teal-400 shadow-xl shadow-teal-500/5">
        <MessageSquare className={`${selected.icon} text-teal-400 stroke-[1.5]`} />
        <ArrowDown className="absolute h-[38%] w-[38%] text-emerald-400 stroke-[2.5] mt-[-6%]" />
      </div>
    </div>
  );
}
