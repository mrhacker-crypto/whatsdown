import React from "react";

interface AvatarProps {
  name: string;
  code: string;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  isOnline?: boolean;
}

const colors = [
  "bg-emerald-500 text-white",
  "bg-teal-500 text-white",
  "bg-cyan-500 text-white",
  "bg-sky-500 text-white",
  "bg-indigo-500 text-white",
  "bg-violet-500 text-white",
  "bg-purple-500 text-white",
  "bg-pink-500 text-white",
  "bg-rose-500 text-white",
  "bg-amber-500 text-white",
  "bg-orange-500 text-white",
];

export default function Avatar({
  name,
  code,
  size = "md",
  showStatus = false,
  isOnline = false,
}: AvatarProps) {
  // Select color deterministically based on code
  const charSum = code
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[charSum % colors.length];

  // Initials
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : code.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs font-semibold",
    md: "w-10 h-10 text-sm font-semibold",
    lg: "w-12 h-12 text-base font-semibold",
    xl: "w-16 h-16 text-xl font-bold",
  };

  const statusSizeClasses = {
    sm: "w-2.5 h-2.5 border border-[#15191C]",
    md: "w-3.5 h-3.5 border-2 border-[#15191C]",
    lg: "w-4 h-4 border-2 border-[#15191C]",
    xl: "w-5 h-5 border-2 border-[#15191C]",
  };

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      <div
        className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center shadow-inner tracking-wider`}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${
            statusSizeClasses[size]
          } ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`}
        />
      )}
    </div>
  );
}
