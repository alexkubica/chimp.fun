"use client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React from "react";
import { Button } from "@/components/ui/button";
import { AiOutlineCopy } from "react-icons/ai";
import dynamic from "next/dynamic";

interface RootLayoutProps {
  children: React.ReactNode;
}

const Footer = dynamic(() => import("./Footer"), { ssr: false });

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <Analytics />
      <SpeedInsights />
      <body className="bg-[#f8fbff]">
        {children}
        <Footer />
      </body>
    </html>
  );
}
