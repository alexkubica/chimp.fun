export type Chain = "polygon" | "ethereum" | "ape";

export type ReactionMetadata = {
  title: string;
  scale: number;
  x: number;
  y: number;
  filename: string;
};

export type CollectionMetadata = {
  name: string;
  total: number;
  firstTokenId?: number;
  contract: string;
  gifOverride?: (tokenId: string) => string;
  chain: Chain;
};
