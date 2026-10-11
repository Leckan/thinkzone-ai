import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Zone AI · Your AI workspace",
  description: "A clear, unified workspace for AI models, usage, and credits.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
