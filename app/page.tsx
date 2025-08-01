import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export const metadata = {
  title: "CHIMP.FUN",
  description:
    "NFT tools, banner maker, and game for Chimpers and web3 communities.",
  keywords: [
    "NFT",
    "Chimpers",
    "Banner Maker",
    "Game",
    "Web3",
    "Editor",
    "Ethereum",
    "Community",
  ],
  openGraph: {
    title: "CHIMP.FUN",
    description:
      "NFT tools, banner maker, and game for Chimpers and web3 communities.",
    url: "https://chimp.fun",
    siteName: "CHIMP.FUN",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "CHIMP.FUN Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CHIMP.FUN",
    description:
      "NFT tools, banner maker, and game for Chimpers and web3 communities.",
    images: ["/icon.png"],
  },
};

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center bg-[#f8fbff] px-2 py-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#222] mt-2 text-center drop-shadow-sm">
          <a href="/" className="text-inherit no-underline">
            CHIMP.FUN
          </a>
        </h1>
        <div className="bg-[#8DC7FF] rounded-2xl shadow-lg flex items-center justify-center">
          <Avatar className="w-64 h-64 rounded-xl">
            <AvatarImage
              src="/icon.png"
              alt="CHIMP.FUN Logo"
              className="rounded-xl m-0 p-0"
            />
          </Avatar>
        </div>
        <div className="flex flex-col gap-4 w-full mt-4 mx-auto">
          <Button
            asChild
            className="text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md box-border"
          >
            <Link href="/editor">NFT Editor</Link>
          </Button>
          <Button
            asChild
            className="text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md box-border"
          >
            <Link href="/banner">Banner Maker</Link>
          </Button>
          <Button
            asChild
            className="text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md box-border"
          >
            <Link href="/collage">Collage Generator</Link>
          </Button>
          <Button
            asChild
            className="text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md box-border"
          >
            <Link href="/game">Game</Link>
          </Button>
          <Button
            asChild
            className="text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md box-border"
          >
            <Link href="/chimper-simulation">!CHIMP SIMULATION</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
