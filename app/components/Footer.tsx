"use client";
import { Button } from "@/components/ui/button";
import { AiOutlineCopy } from "react-icons/ai";
import React from "react";

const Footer = () => {
  // Copy to clipboard function
  function handleCopy(text: string) {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  const addresses = [
    { label: "ETH", value: "0xd81B7A2a1bBf3e1c713f2A5C886f88EE5f862417" },
    { label: "SOL", value: "DMjh4rUhozxjXjVTRQhSBv8AzicPyQrGCD8UZZLXkEAe" },
    { label: "BTC", value: "bc1qygspwlmyy77eds53mszhlr77nr2vm9pl6k0rrk" },
  ];

  return (
    <footer className="w-full mt-8 flex flex-col items-center">
      <div className="w-full max-w-md px-6 pb-4 pt-2 text-xs text-muted-foreground text-center flex flex-col items-center">
        <div className="mb-2">Buy me a coffee ☕️</div>
        <div className="flex flex-col gap-2 w-full">
          {addresses.map((addr) => (
            <div
              key={addr.label}
              className="flex items-center gap-2 justify-center w-full"
            >
              <span>{addr.label}:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 text-center max-w-full overflow-x-auto whitespace-nowrap">
                {addr.value}
              </code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Copy ${addr.label} address`}
                onClick={() => handleCopy(addr.value)}
                className="ml-1"
              >
                <AiOutlineCopy />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full max-w-md px-6 pb-6 text-xs text-muted-foreground text-center">
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
};

export default Footer;
