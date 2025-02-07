import dotenv from "dotenv";
import { collectionsMetadata } from "@/consts";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
dotenv.config();

const ensureFolder = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    console.log(`Creating folder at: ${folderPath}`);
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const writeMetadataFile = (folderPath: string, tokenId: number, data: any) => {
  const filePath = path.join(folderPath, `${tokenId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

console.log("Start caching metadata for collections");

for (const collection of collectionsMetadata) {
  console.log("Caching metadata for collection:", collection.name);
}
