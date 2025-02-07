import dotenv from "dotenv";
import { collectionsMetadata } from "@/consts";
import fs from "fs";
import path from "path";
import {
  fetchTokenMetadata,
  getCachePath,
  getEtherscanProvider,
} from "@/utils";
dotenv.config();

const ensureFolder = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    console.log(`Creating folder at: ${folderPath}`);
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const writeMetadataFile = (folderPath: string, filename: string, data: any) => {
  console.log("Writing metadata file", { folderPath, filename });
  const filePath = path.join(folderPath, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

console.log("Start caching metadata for collections");

(async () => {
  for (const collection of collectionsMetadata) {
    console.log("Caching metadata for collection:", collection.name);
    const etherscanProvider = getEtherscanProvider(collection.chain);
    const cachePath = getCachePath(collection);
    ensureFolder(cachePath);

    for (
      let tokenId = 1 + (collection.tokenIdOffset ?? 0);
      tokenId < collection.total + (collection.tokenIdOffset ?? 0);
      tokenId++
    ) {
      if (fs.existsSync(`${cachePath}/${tokenId}.json`)) {
        console.log("Metadata already cached for tokenId:", tokenId);
        continue;
      }

      console.log("Caching metadata for tokenId:", tokenId);
      const tokenMetadata = await fetchTokenMetadata(
        etherscanProvider,
        collection,
        tokenId,
      );

      console.log("fetched metadata", tokenMetadata);

      writeMetadataFile(cachePath, `${tokenId}.json`, tokenMetadata);
    }
  }
})();
