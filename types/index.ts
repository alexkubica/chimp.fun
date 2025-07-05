export type Chain = "polygon" | "ethereum" | "ape";

export type ReactionMetadata = {
  title: string;
  scale: number;
  x: number;
  y: number;
  filename: string;
  isCustom?: boolean;
};

export type CollectionMetadata = {
  name: string;
  total: number;
  tokenIdOffset?: number;
  contract: string;
  gifOverride?: (tokenId: string) => string;
  chain: Chain;
};
