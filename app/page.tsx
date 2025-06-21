import HomePageClient from "./HomePageClient";

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
        url: "/Chimpers-2956-!CHIMP.gif",
        width: 512,
        height: 512,
        alt: "Chimpers PFP",
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
    images: ["/Chimpers-2956-!CHIMP.gif"],
  },
};

export default function Home() {
  return <HomePageClient />;
}
