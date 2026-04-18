"use client";

import { LifeBuoy } from "lucide-react";

export function SupportButton() {
  return (
    <a
      href="mailto:support@robojyotish.com"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-cosmic-700 hover:bg-cosmic-950 text-white text-sm font-medium shadow-2xl shadow-cosmic-700/40 px-4 py-2.5 transition hover:scale-105"
      aria-label="Contact support"
    >
      <LifeBuoy className="w-4 h-4" />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}
