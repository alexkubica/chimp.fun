"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
import React from "react";
import ClientSdkProvider from "./SdkProvider";

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
        <ClientSdkProvider>{children}</ClientSdkProvider>
        <Footer />
      </body>
    </html>
  );
}
