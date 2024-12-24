import dotenv from "dotenv";
import { EtherscanProvider } from "ethers";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import readline from "readline";
import fetch from "node-fetch";

import { collectionsMetadata } from "../app/collectionsMetadata";
// Example: { chimpers: { name: "Chimpers", cachePath: "chimpers-metadata", total: 5555, contract: "0x..." }, ... }

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string, defaultAnswer = "y"): Promise<string> =>
  new Promise((resolve) =>
    rl.question(
      `${query} [${defaultAnswer === "y" ? "y" : "n"}/${defaultAnswer === "y" ? "n" : "y"}]: `,
      (input) => {
        resolve(input.trim().toLowerCase() || defaultAnswer);
      },
    ),
  );

const ensureFolder = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    console.log(`Creating folder at: ${folderPath}`);
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const getExistingTokens = (folderPath: string): Set<number> => {
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".json"));
  const tokenIds = files.map((file) => parseInt(file.replace(".json", ""), 10));
  return new Set(tokenIds);
};

const writeMetadataFile = (folderPath: string, tokenId: number, data: any) => {
  const filePath = path.join(folderPath, `${tokenId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const fetchWithTimeout = async (
  url: string,
  options: any,
  timeout = 30000,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response as any;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
};

const fetchMetadataForToken = async (
  contract: ethers.Contract,
  tokenId: number,
  retries = 3,
): Promise<any> => {
  const tokenURI = await contract.tokenURI(tokenId);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(tokenURI, {}, 30000);

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata for token ${tokenId}`);
      }

      const metadata = await response.json();
      metadata.refreshedAt = new Date().toISOString();
      return metadata;
    } catch (error: any) {
      console.error(
        `Attempt ${attempt}/${retries} failed for token ${tokenId}: ${error.message}`,
      );
      if (attempt === retries) {
        throw new Error(`All ${retries} attempts failed for token ${tokenId}`);
      }
    }
  }
};

const scanMissingTokens = (
  totalTokens: number,
  existingTokens: Set<number>,
): number[] => {
  const missingTokens = [];
  for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
    if (!existingTokens.has(tokenId)) {
      missingTokens.push(tokenId);
    }
  }
  return missingTokens;
};

const formatElapsedTime = (startTime: number): string => {
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const seconds = elapsedSeconds % 60;
  const minutes = Math.floor(elapsedSeconds / 60) % 60;
  const hours = Math.floor(elapsedSeconds / 3600);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const showProgressBar = (
  completed: number,
  total: number,
  startTime: number,
) => {
  const percentage = ((completed / total) * 100).toFixed(2);
  const progress = Math.round((completed / total) * 20);
  const bar = `${"█".repeat(progress)}${".".repeat(20 - progress)}`;
  const elapsed = formatElapsedTime(startTime);

  process.stdout.clearLine(0); // Clear the current line
  process.stdout.cursorTo(0); // Move cursor to the start of the line
  process.stdout.write(
    `Progress: [${bar}] ${percentage}% (${completed}/${total}) | Elapsed: ${elapsed}`,
  );
};

async function fetchCollectionMetadata(
  collectionKey: keyof typeof collectionsMetadata,
) {
  // Get collection details from the imported metadata
  const { name, contract, cachePath, total } =
    collectionsMetadata[collectionKey];
  console.log(`\nSelected collection: ${name}`);

  console.log(
    "Warning: API calls are rate-limited to 5 calls per second. The script will respect this limit.",
  );

  // Check for ETHERSCAN_API_KEY in .env
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("Error: ETHERSCAN_API_KEY is missing in your .env file.");
    process.exit(1);
  }

  const provider = new EtherscanProvider(
    "mainnet",
    process.env.ETHERSCAN_API_KEY,
  );
  const abi = [
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
  ];
  const contractInstance = new ethers.Contract(contract, abi, provider);

  // Prepare the folder path where metadata will be stored
  const metadataFolderPath = path.resolve("./public/", cachePath);
  ensureFolder(metadataFolderPath);

  // Find existing tokens on disk
  const existingTokens = getExistingTokens(metadataFolderPath);
  const missingTokensBeforeStart = scanMissingTokens(total, existingTokens);
  console.log(
    `Found ${missingTokensBeforeStart.length} missing tokens before starting.`,
  );

  // Ask user if they want to start
  const startResponse = await askQuestion(
    `Start fetching metadata for ${missingTokensBeforeStart.length} tokens? (default: y)`,
    "y",
  );

  if (startResponse !== "y") {
    console.log("Operation canceled.");
    rl.close();
    process.exit(0);
  }

  // Begin fetching
  const startTime = Date.now();

  for (const tokenId of missingTokensBeforeStart) {
    try {
      const metadata = await fetchMetadataForToken(contractInstance, tokenId);
      writeMetadataFile(metadataFolderPath, tokenId, metadata);
    } catch (error) {
      // If there's an error, write an error JSON
      const errorMetadata = {
        error: "Failed to fetch metadata",
        refreshedAt: new Date().toISOString(),
      };
      writeMetadataFile(metadataFolderPath, tokenId, errorMetadata);
    }

    showProgressBar(
      missingTokensBeforeStart.indexOf(tokenId) + 1,
      missingTokensBeforeStart.length,
      startTime,
    );

    // Rate limit: after every 5 tokens, pause for 1 second
    if ((missingTokensBeforeStart.indexOf(tokenId) + 1) % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Retry any still-missing tokens
  console.log(
    "\nInitial fetching complete. Scanning for any remaining tokens...",
  );
  const finalExistingTokens = getExistingTokens(metadataFolderPath);
  const missingTokensAfterFetch = scanMissingTokens(total, finalExistingTokens);

  if (missingTokensAfterFetch.length > 0) {
    console.log(
      `Found ${missingTokensAfterFetch.length} missing tokens after initial fetch. Starting retry...`,
    );

    for (const tokenId of missingTokensAfterFetch) {
      try {
        const metadata = await fetchMetadataForToken(contractInstance, tokenId);
        writeMetadataFile(metadataFolderPath, tokenId, metadata);
      } catch (error) {
        const errorMetadata = {
          error: "Failed to fetch metadata",
          refreshedAt: new Date().toISOString(),
        };
        writeMetadataFile(metadataFolderPath, tokenId, errorMetadata);
      }

      showProgressBar(
        missingTokensAfterFetch.indexOf(tokenId) + 1,
        missingTokensAfterFetch.length,
        startTime,
      );

      // Rate limit again
      if ((missingTokensAfterFetch.indexOf(tokenId) + 1) % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.log("\nMetadata fetching complete.");
  console.log(`Metadata saved to: ${metadataFolderPath}`);
  rl.close();
}

async function main() {
  // 1. List all collections
  const collectionKeys = Object.keys(collectionsMetadata) as Array<
    keyof typeof collectionsMetadata
  >;

  // 2. Prompt user to select a collection
  console.log("Available collections:");
  collectionKeys.forEach((key, index) => {
    console.log(`${index + 1}. ${collectionsMetadata[key].name}`);
  });

  const userSelection = await new Promise<number>((resolve) => {
    rl.question(
      "Enter the number of the collection you want to cache: ",
      (answer) => {
        resolve(parseInt(answer.trim(), 10));
      },
    );
  });

  // Basic validation
  if (
    isNaN(userSelection) ||
    userSelection < 1 ||
    userSelection > collectionKeys.length
  ) {
    console.log("Invalid selection. Exiting...");
    rl.close();
    process.exit(0);
  }

  // 3. Fetch metadata for the selected collection
  const selectedCollectionKey = collectionKeys[userSelection - 1];
  await fetchCollectionMetadata(selectedCollectionKey);
}

main().catch((error) => {
  console.error("Unexpected error during script execution:", error);
  rl.close();
  process.exit(1);
});
