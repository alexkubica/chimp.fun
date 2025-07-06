"use client";

import React, { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export default function GoogleAnalytics({
  measurementId,
}: GoogleAnalyticsProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push(arguments);
      };

      // Initialize GA4
      window.gtag("js", new Date());
      window.gtag("config", measurementId);
    }
  }, [measurementId]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `,
        }}
      />
    </>
  );
}

// Custom hook for tracking events
export const useAnalytics = () => {
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, parameters);
    }
  };

  const trackPageView = (url: string, measurementId?: string) => {
    if (typeof window !== "undefined" && window.gtag && measurementId) {
      window.gtag("config", measurementId, {
        page_path: url,
      });
    }
  };

  return { trackEvent, trackPageView };
};
