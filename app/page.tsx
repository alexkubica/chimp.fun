import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f8fbff] px-2 py-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <div
          className="bg-[#8DC7FF] rounded-2xl shadow-lg flex items-center justify-center"
          style={{ width: 112, height: 112 }}
        >
          <Avatar className="w-28 h-28 rounded-xl">
            <AvatarImage
              src="/Chimpers-2956-!CHIMP.gif"
              alt="Chimpers PFP"
              className="rounded-xl m-0 p-0"
            />
          </Avatar>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#222] mt-2 text-center drop-shadow-sm">
          CHIMP.FUN
        </h1>
        <h2 className="text-lg text-[#444] font-medium text-center mb-2">
          Brought you by{" "}
          <Link
            href="https://linktr.ee/mrcryptoalex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8DC7FF] underline font-semibold hover:text-[#5bb0f7]"
          >
            Alex
          </Link>{" "}
          !CHIMP 🙉
        </h2>
        <div className="flex flex-col gap-4 w-full mt-4 mx-auto">
          <Button
            asChild
            className="w-full max-w-full text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md"
          >
            <Link href="/editor">NFT Editor</Link>
          </Button>
          <Button
            asChild
            className="w-full max-w-full text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md"
          >
            <Link href="/banner">Banner Maker</Link>
          </Button>
          <Button
            asChild
            className="w-full max-w-full text-lg py-6 bg-[#8DC7FF] hover:bg-[#5bb0f7] font-bold rounded-xl shadow-md"
          >
            <Link href="/game">Game</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
