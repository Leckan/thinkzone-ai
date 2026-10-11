import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Zone AI · A clear space for AI work",
  description: "Choose a model, keep useful conversations close, and focus on the work in front of you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
