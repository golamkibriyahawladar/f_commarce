import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Autozy — Automation Suite",
  description: "Autozy Automation Suite — Omnichannel inbox, Meta Ads, CRM, and AI-powered commerce automation.",
  keywords: ["AI Chatbot", "Omnichannel Inbox", "CRM", "Meta Ads Automation", "E-commerce Automation", "Autozy"],
  authors: [{ name: "Autozy Team" }],
  openGraph: {
    title: "Autozy — Automation Suite",
    description: "Omnichannel inbox, Meta Ads, CRM, and AI-powered commerce automation.",
    url: "https://autozy.app",
    siteName: "Autozy",
    images: [
      {
        url: "/og-image.png", // Ensure you add this image to public/ folder
        width: 1200,
        height: 630,
        alt: "Autozy Automation Suite",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Autozy — Automation Suite",
    description: "Omnichannel inbox, Meta Ads, CRM, and AI-powered commerce automation.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${geistSans.variable} ${geistMono.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-geist-sans), var(--font-noto-bengali), sans-serif' }}>{children}</body>
    </html>
  );
}
