import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://robojyotish.com";
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ?? "RoboJyotish";
export const PRICE_MYR = Number(process.env.STRIPE_PRICE_MYR_CENTS ?? 1990) / 100;

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "ms", label: "Bahasa Malaysia" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
