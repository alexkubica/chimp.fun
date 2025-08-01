import { CollectionMetadata, ReactionMetadata } from "@/types";
import { fetchedOpenSeaCollections } from "../scripts/fetchOpenSeaCollections";

// Original collections (keeping existing ones for backward compatibility)
const originalCollections: CollectionMetadata[] = [
  {
    name: "Chimpers",
    total: 5555,
    contract: "0x80336ad7a747236ef41f47ed2c7641828a480baa",
    chain: "ethereum",
    gifOverride: (tokenId) =>
      `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/chimpers/pfp-bounce-pixel/${tokenId}.gif`,
  },
  {
    name: "Chimpers Genesis",
    total: 98,
    contract: "0x4d55109a17a6914130ace90325dc98cf66ebfa00",
    chain: "ethereum",
  },
  {
    name: "Muskers",
    total: 2222,
    contract: "0xE6e6B146aDBEe274Fa1A011FE91f6F708f9cBBF8",
    chain: "ethereum",
  },
  {
    name: "Azuki Elementals",
    total: 17502,
    contract: "0xB6a37b5d14D502c3Ab0Ae6f3a0E058BC9517786e",
    chain: "ethereum",
  },
  {
    name: "BEANZ",
    total: 19950,
    contract: "0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949",
    chain: "ethereum",
  },
  {
    name: "DSNRS",
    total: 8888,
    contract: "0x896BE40d15d1dbFA4F4Ff25A110F3CE770e07897",
    chain: "ape",
  },
  {
    name: "Less Than Three (L3T)",
    total: 5555,
    contract: "0x6ff0c1e1b674138de7f5dd4131bf76665c0ff54a",
    chain: "ethereum",
  },
  {
    name: "Secret Society of Whales (SSOW)",
    total: 9997,
    contract: "0x88091012eedf8dba59d08e27ed7b22008f5d6fe5",
    chain: "ethereum",
  },
  // check why ipfs times out
  //   {
  //     name: "Pixel Chibis",
  //     total: 9996,
  //     contract: "0x8bd99726c3af7e30b35d1537cdcbbd9d6fb1c6a8",
  //     chain: "polygon",
  //   },
];

// Filter out duplicates from fetched collections (by contract address or name)
const existingContracts = new Set(
  originalCollections.map((c) => c.contract?.toLowerCase()),
);
const existingNames = new Set(
  originalCollections.map((c) => c.name.toLowerCase()),
);

const uniqueNewCollections = fetchedOpenSeaCollections.filter((collection) => {
  const contractExists =
    collection.contract &&
    existingContracts.has(collection.contract.toLowerCase());
  const nameExists = existingNames.has(collection.name.toLowerCase());
  return !contractExists && !nameExists;
});

// Combine original collections with unique new ones
export const collectionsMetadata: CollectionMetadata[] = [
  ...originalCollections,
  ...uniqueNewCollections,
];

export const reactionsMap: ReactionMetadata[] = [
  {
    title: "OK!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "1.png",
  },
  {
    title: "YES!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "2.png",
  },
  {
    title: "NO!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "3.png",
  },
  {
    title: "COOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "4.png",
  },
  {
    title: "LOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "5.png",
  },
  {
    title: "NICE!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "6.png",
  },
  {
    title: "WHAT?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "7.png",
  },
  {
    title: "WHY?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "8.png",
  },
  {
    title: "GREAT!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "9.png",
  },
  {
    title: "LOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "10.png",
  },
  {
    title: "SURE!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "11.png",
  },
  {
    title: "LFC!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "12.png",
  },
  {
    title: "!CHIMP",
    x: 650,
    y: 70,
    scale: 3,
    filename: "13.png",
  },
  {
    title: "?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "14.png",
  },
  {
    title: "WOW!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "15.png",
  },
  {
    title: "XD",
    x: 650,
    y: 70,
    scale: 3,
    filename: "16.png",
  },
  {
    title: "<3",
    x: 650,
    y: 70,
    scale: 3,
    filename: "17.png",
  },
  {
    title: "GM!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "18.png",
  },
  {
    title: "GN!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "19.png",
  },
  {
    title: "F4F",
    x: 650,
    y: 70,
    scale: 3,
    filename: "20.png",
  },
  {
    title: "WLTC!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "21.png",
  },
  {
    title: "G(Y)M!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "22.png",
  },
  {
    title: "HAPPY CHUESDAY",
    x: 650,
    y: 70,
    scale: 3,
    filename: "23.png",
  },
  {
    title: "I AM !CHIMP AND !CHIMP IS ME",
    scale: 0.9,
    x: 500,
    y: 100,
    filename: "I AM !CHIMP AND !CHIMP IS ME.png",
  },
  {
    title: "#CHOOSECUTE",
    scale: 0.9,
    x: 550,
    y: 100,
    filename: "CHOOSECUTE.png",
  },
  {
    title: "HAPPY 100K!",
    scale: 0.9,
    x: 550,
    y: 100,
    filename: "happy 100k.png",
  },
  // 27: {
  //   title: "WE ALWAYS !CHIMP",
  //   scale: 0.9,
  //   x: 550,
  //   y: 100,
  //   filename: "WE ALWAYS !CHIMP.gif",
  // },
  {
    title: "WELCOME!",
    scale: 0.7,
    x: 600,
    y: 100,
    filename: "welcome!.png",
  },
  {
    title: "THANKS!",
    scale: 0.7,
    x: 600,
    y: 100,
    filename: "thanks.png",
  },
  {
    title: "LFCHIMP!",
    scale: 0.7,
    x: 600,
    y: 100,
    filename: "LFCHIMP.png",
  },
  {
    title: "WEN MINT?",
    scale: 0.7,
    x: 600,
    y: 100,
    filename: "wen mint.png",
  },
  {
    title: "FEELING !CHIMPISH",
    scale: 0.8,
    x: 650,
    y: 70,
    filename: "feeling chimpish.png",
  },
  {
    title: "WE LOVE $PENGU",
    scale: 0.9,
    x: 700,
    y: 80,
    filename: "we love pengu.png",
  },
  {
    title: "$PENGU TO THE MOON!",
    scale: 0.9,
    x: 700,
    y: 80,
    filename: "pengu to the moon.png",
  },
  {
    title: "HAPPY CHRISTMAS EVE!",
    scale: 0.9,
    x: 550,
    y: 100,
    filename: "Happy Christmas Eve.png",
  },
  {
    title: "MERRY CHRISTMAS!",
    scale: 0.8,
    x: 600,
    y: 100,
    filename: "merry christmas.png",
  },
  {
    title: "MERRY CHIMPMAS!",
    scale: 0.8,
    x: 400,
    y: 100,
    filename: "Merry Chimpmas.png",
  },
  {
    title: "HAPPY NEW YEAR!",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "happy new year.png",
  },
  {
    title: "TOGETHER WE WHALE!",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "together we whale.png",
  },
  {
    title: "RUMOR IS !CHIMP IS THE ALPHA",
    scale: 0.8,
    x: 450,
    y: 50,
    filename: "rumor is chimp is the alpha.png",
  },
  {
    title: "HANDSOME!",
    scale: 0.7,
    x: 550,
    y: 70,
    filename: "handsome.png",
  },
  {
    title: "Happy Wisebeard Wednesday!",
    scale: 0.9,
    x: 600,
    y: 20,
    filename: "Happy Wisebeard Wednesday!.png",
  },
  {
    title: "Happy WBW!",
    scale: 0.7,
    x: 550,
    y: 60,
    filename: "Happy WBW.png",
  },
  {
    title: "$DOOD",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "$DOOD.png",
  },
  {
    title: "$ANIME",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "$ANIME.png",
  },
  {
    title: "yo",
    scale: 0.6,
    x: 600,
    y: 80,
    filename: "yo.png",
  },
  {
    title: "HMM!",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "HMM!.png",
  },
  {
    title: "Happy\nMutant Monday!",
    scale: 1,
    x: 500,
    y: 60,
    filename: "Happy Mutant Monday!.png",
  },
  {
    title: "Happy Thursday!",
    scale: 1,
    x: 550,
    y: 70,
    filename: "Happy Thursday!.png",
  },
  {
    title: "Happy\nHump Day!",
    scale: 0.7,
    x: 550,
    y: 70,
    filename: "Happy Hump Day!.png",
  },
  {
    title: "Raid it.",
    scale: 1,
    x: 600,
    y: 80,
    filename: "Raid it.png",
  },
  {
    title: "HAPPY\nFRIDAY!",
    scale: 0.7,
    x: 550,
    y: 70,
    filename: "HAPPY FRIDAY!.png",
  },
  {
    title: "SIUUU",
    scale: 0.6,
    x: 600,
    y: 80,
    filename: "SIUUU.png",
  },
  {
    title: "AYOOO!",
    scale: 0.8,
    x: 600,
    y: 80,
    filename: "AYOOO!.png",
  },
  {
    title: "Where the Heck\nis Blue?",
    scale: 0.9,
    x: 550,
    y: 120,
    filename: "Where the Heck is Blue.png",
  },
  {
    title: "Happy 4th\nof July!",
    scale: 0.8,
    x: 550,
    y: 60,
    filename: "Happy 4th of July!.png",
  },
  {
    title: "CHIMPERS SZN\nIS COMING!",
    scale: 1,
    x: 500,
    y: 60,
    filename: "CHIMPERS SZN IS COMING!.png",
  },
  {
    title: "Custom Speech Bubble",
    scale: 1,
    x: 650,
    y: 70,
    filename: "custom-speech-bubble",
    isCustom: true,
  },
  {
    title: "Congrats on\n1M followers\nin TikTok!",
    scale: 1,
    x: 500,
    y: 60,
    filename: "Congrats on 1M followers in TikTok!.png",
  },
  {
    title: "CHIMPERS JUST REACHED\n1M FOLLOWERS IN TIKTOK!",
    scale: 1,
    x: 400,
    y: 60,
    filename: "CHIMPERS JUST REACHED 1M FOLLOWERS IN TIKTOK!.png",
  },
  {
    title: "DO IT.",
    scale: 0.5,
    x: 500,
    y: 60,
    filename: "DO IT.png",
  },

  {
    title: "!IKZ",
    scale: 0.5,
    x: 500,
    y: 60,
    filename: "!IKZ.png",
  },

  {
    title: "Welcome to\nthe garden!",
    scale: 0.8,
    x: 500,
    y: 60,
    filename: "Welcome to the garden!.png",
  },

  {
    title: "!CHIMPKUZO",
    scale: 0.6,
    x: 500,
    y: 60,
    filename: "!CHIMPKUZO.png",
  },

  {
    title: "!LFC",
    scale: 0.6,
    x: 500,
    y: 60,
    filename: "!LFC.png",
  },

  {
    title: "!LFCHIMP",
    scale: 0.6,
    x: 500,
    y: 60,
    filename: "!LFCHIMP.png",
  },
];

export const tokenURIABI = [
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
];
