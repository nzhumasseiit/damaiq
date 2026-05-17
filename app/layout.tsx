import type { Metadata } from "next";
import { Inter } from "next/font/google";

import AuthInit from "@/app/components/AuthInit";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DamaIQ",
  description: "Russian draughts training app with AI coaching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preload" href="/mascot.svg" as="image" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthInit />
        {children}
      </body>
    </html>
  );
}
