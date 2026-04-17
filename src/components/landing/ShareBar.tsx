"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Share2 } from "lucide-react";

const SHARE_TEXT = encodeURIComponent(
  "I just got a FREE AI Vedic Jyotish reading from RoboJyotish — claim yours in the first 1,000 users 👇 https://robojyotish.com",
);

const SHARE_LINKS = [
  {
    label: "WhatsApp",
    href: `https://wa.me/?text=${SHARE_TEXT}`,
    color: "bg-[#25D366]",
  },
  {
    label: "Telegram",
    href: `https://t.me/share/url?url=https://robojyotish.com&text=${SHARE_TEXT}`,
    color: "bg-[#229ED9]",
  },
  {
    label: "X / Twitter",
    href: `https://twitter.com/intent/tweet?text=${SHARE_TEXT}`,
    color: "bg-black",
  },
  {
    label: "Facebook",
    href: `https://www.facebook.com/sharer/sharer.php?u=https://robojyotish.com`,
    color: "bg-[#1877F2]",
  },
];

export function ShareBar() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/80 mb-4">
          <Share2 className="w-4 h-4" />
          Share with family & friends — help them claim their free reading
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {SHARE_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.color} text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
