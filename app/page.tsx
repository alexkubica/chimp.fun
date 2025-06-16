import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

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
              src="/Chimpers-2956-!CHIMP.gif"
              alt="Chimpers PFP"
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
            <Link href="/game">Game</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
