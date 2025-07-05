"use client";

import { Button } from "@/components/ui/button";

interface EditorHeaderProps {
  onFeelingLucky: () => void;
}

export function EditorHeader({ onFeelingLucky }: EditorHeaderProps) {
  return (
    <header className="text-center mb-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">
        <a href="/" className="text-inherit no-underline">
          CHIMP.FUN
        </a>
      </h1>
      <p className="text-lg font-medium mb-2">NFT Editor</p>
      <div className="flex justify-center mt-2">
        <Button onClick={onFeelingLucky} variant="secondary">
          I&apos;m Feeling Lucky
        </Button>
      </div>
    </header>
  );
}