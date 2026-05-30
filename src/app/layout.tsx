import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceOps Guard",
  description: "Live voice-controlled terminal agent with guarded execution and evaluation loops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950">{children}</body>
    </html>
  );
}
