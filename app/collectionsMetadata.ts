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
  }
> = {
  chimpers: {
    name: "Chimpers",
    cachePath: "chimpers-metadata",
    total: 5555,
    contract: "0x80336ad7a747236ef41f47ed2c7641828a480baa",
    gifOverride: (tokenId) =>
      `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/chimpers/pfp-bounce-pixel/${tokenId}.gif`,
    // scaleMultiplier: 2,
  },
  chimpersGenesis: {
    name: "Chimpers Genesis",
    cachePath: "chimpers-genesis-metadata",
    total: 98,
    contract: "0x4d55109a17a6914130ace90325dc98cf66ebfa00",
    // gifOverride: (tokenId) =>
    //   `https://chimp.lon1.cdn.digitaloceanspaces.com/assets/genesis/pfp-bounce-pixel/${tokenId}.gif`,
  },
};
