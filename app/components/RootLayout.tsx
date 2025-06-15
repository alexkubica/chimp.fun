import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import React from "react";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <Analytics />
      <SpeedInsights />
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="w-full mt-8">
      <div className="px-6 pb-4 pt-2 text-xs text-muted-foreground text-center">
        <div className="mb-2">Buy me a coffee ☕️</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-center">
            <span>ETH:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 text-center max-w-full overflow-x-auto whitespace-nowrap">
              0xd81B7A2a1bBf3e1c713f2A5C886f88EE5f862417
            </code>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span>SOL:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 text-center max-w-full overflow-x-auto whitespace-nowrap">
              DMjh4rUhozxjXjVTRQhSBv8AzicPyQrGCD8UZZLXkEAe
            </code>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span>BTC:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 text-center max-w-full overflow-x-auto whitespace-nowrap">
              bc1qygspwlmyy77eds53mszhlr77nr2vm9pl6k0rrk
            </code>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 text-xs text-muted-foreground text-center">
        Made with ❤️ by{" "}
        <a
          href="https://linktr.ee/mrcryptoalex"
          className="underline text-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Alex
        </a>{" "}
        !CHIMP 🙉
      </div>
    </footer>
  );
}
