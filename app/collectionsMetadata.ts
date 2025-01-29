import { CollectionNames } from "./types";

export const collectionsMetadata: Record<
  CollectionNames,
  {
    name: string;
    cachePath: string;
    total: number;
    contract: string;
    gifOverride?: (tokenId: string) => string;
    scaleMultiplier?: number;
    chain?: string;
  }
> = {
  chimpers: {
    name: "Chimpers",
    cachePath: "chimpers-metadata",
    total: 5555,
    contract: "0x80336ad7a747236ef41f47ed2c7641828a480baa",
    chain: "ethereum",
    gifOverride: (tokenId) =>
      `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/chimpers/pfp-bounce-pixel/${tokenId}.gif`,
    // scaleMultiplier: 2,
  },
  chimpersGenesis: {
    name: "Chimpers Genesis",
    cachePath: "chimpers-genesis-metadata",
    total: 98,
    contract: "0x4d55109a17a6914130ace90325dc98cf66ebfa00",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
  ssow: {
    name: "Secret Society of Whales",
    cachePath: "ssow-metadata",
    total: 9997,
    contract: "0x88091012eedf8dba59d08e27ed7b22008f5d6fe5",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
  // FishBallerz: {
  //   name: "FishBallerz",
  //   cachePath: "FishBallerz-metadata",
  //   total: 4444,
  //   contract: "0x7e7d01e39ae07ba3653ae967ca35abbe73fd5b44",
  //   chain: "polygon",
  //   // gifOverride: (tokenId) =>
  //   //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  // },
  chibis: {
    name: "Pixel Chibis",
    cachePath: "chibis-metadata",
    total: 9996,
    contract: "0x8bd99726c3af7e30b35d1537cdcbbd9d6fb1c6a8",
    chain: "polygon",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
  coolCats: {
    name: "Cool Cats",
    cachePath: "cool-cats-metadata",
    total: 9968,
    contract: "0x1a92f7381b9f03921564a437210bb9396471050c",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
  bayc: {
    name: "Bored Ape Yacht Club",
    cachePath: "bayc-metadata",
    total: 9998,
    contract: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
mayc: {
    name: "Mutant Ape Yacht Club",
    cachePath: "mayc-metadata",
    total: 19542,
    contract: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
  muskers: {
    name: "Muskers",
    cachePath: "muskers-metadata",
    total: 2222,
    contract: "0xE6e6B146aDBEe274Fa1A011FE91f6F708f9cBBF8",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
azuki: {
    name: "Azuki",
    cachePath: "azuki-metadata",
    total: 9999,
    contract: "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
azukiElementals: {
    name: "Azuki Elementals",
    cachePath: "azuki-elementals-metadata",
    total: 17502,
    contract: "0xB6a37b5d14D502c3Ab0Ae6f3a0E058BC9517786e",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
beanz: {
    name: "BEANZ",
    cachePath: "beanz-metadata",
    total: 19950,
    contract: "0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949",
    chain: "ethereum",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
};
