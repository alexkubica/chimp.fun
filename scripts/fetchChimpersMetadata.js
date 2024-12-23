import dotenv from "dotenv";
import { EtherscanProvider } from "ethers";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import readline from "readline";

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query, defaultAnswer = "y") =>
  new Promise((resolve) =>
    rl.question(
      `${query} [${defaultAnswer === "y" ? "y" : "n"}/${defaultAnswer === "y" ? "n" : "y"}]: `,
      (input) => {
        resolve(input.trim().toLowerCase() || defaultAnswer);
      },
    ),
  );

const askMultiChoice = (query, defaultOption = "1") =>
  new Promise((resolve) =>
    rl.question(`${query} Enter [${defaultOption}]/2/3: `, (input) => {
      resolve(input.trim() || defaultOption);
    }),
  );

const ensureFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    console.log(`Creating folder at: ${folderPath}`);
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

const getExistingTokens = (folderPath) => {
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".json"));
  const tokenIds = files.map((file) => parseInt(file.replace(".json", ""), 10));
  return new Set(tokenIds);
};

const writeMetadataFile = (folderPath, tokenId, data) => {
  const filePath = path.join(folderPath, `${tokenId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
};

const fetchMetadataForToken = async (contract, tokenId, retries = 3) => {
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
    } catch (error) {
      console.error(
        `Attempt ${attempt}/${retries} failed for token ${tokenId}: ${error.message}`,
      );
      if (attempt === retries) {
        throw new Error(`All ${retries} attempts failed for token ${tokenId}`);
      }
    }
  }
};

const scanMissingTokens = (totalTokens, existingTokens) => {
  const missingTokens = [];
  for (let tokenId = 1; tokenId <= totalTokens; tokenId++) {
    if (!existingTokens.has(tokenId)) {
      missingTokens.push(tokenId);
    }
  }
  return missingTokens;
};

const formatElapsedTime = (startTime) => {
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const seconds = elapsedSeconds % 60;
  const minutes = Math.floor(elapsedSeconds / 60) % 60;
  const hours = Math.floor(elapsedSeconds / 3600);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const showProgressBar = (completed, total, startTime) => {
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

const fetchChimpersMetadata = async () => {
  console.log("Starting to fetch Chimpers metadata...");
  console.log(
    "Warning: API calls are rate-limited to 5 calls per second. The script will respect this limit.",
  );

  const contractAddress = "0x80336ad7a747236ef41f47ed2c7641828a480baa";
  const abi = [
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
  ];

  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("Error: ETHERSCAN_API_KEY is missing in your .env file.");
    process.exit(1);
  }

  const provider = new EtherscanProvider(
    "mainnet",
    process.env.ETHERSCAN_API_KEY,
  );
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const totalTokens = 5555;
  const metadataFolderPath = path.resolve("./public/chimpers-metadata");

  ensureFolder(metadataFolderPath);
  const existingTokens = getExistingTokens(metadataFolderPath);

  const missingTokensBeforeStart = scanMissingTokens(
    totalTokens,
    existingTokens,
  );
  console.log(
    `Found ${missingTokensBeforeStart.length} missing tokens before starting.`,
  );

  const startResponse = await askQuestion(
    `Start fetching metadata for ${missingTokensBeforeStart.length} tokens? (default: y)`,
    "y",
  );

  if (startResponse !== "y") {
    console.log("Operation canceled.");
    rl.close();
    process.exit(0);
  }

  const startTime = Date.now();

  for (const tokenId of missingTokensBeforeStart) {
    try {
      const metadata = await fetchMetadataForToken(contract, tokenId);
      writeMetadataFile(metadataFolderPath, tokenId, metadata);
    } catch (error) {
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

    if ((missingTokensBeforeStart.indexOf(tokenId) + 1) % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause to respect rate limits
    }
  }

  console.log(
    "\nInitial fetching complete. Scanning for any remaining tokens...",
  );
  const finalExistingTokens = getExistingTokens(metadataFolderPath);
  const missingTokensAfterFetch = scanMissingTokens(
    totalTokens,
    finalExistingTokens,
  );

  if (missingTokensAfterFetch.length > 0) {
    console.log(
      `Found ${missingTokensAfterFetch.length} missing tokens after initial fetch. Starting retry...`,
    );

    for (const tokenId of missingTokensAfterFetch) {
      try {
        const metadata = await fetchMetadataForToken(contract, tokenId);
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

      if ((missingTokensAfterFetch.indexOf(tokenId) + 1) % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause to respect rate limits
      }
    }
  }

  console.log("\nMetadata fetching complete.");
  console.log(`Metadata saved to: ${metadataFolderPath}`);
  rl.close();
};

// Execute the script
fetchChimpersMetadata().catch((error) => {
  console.error("Unexpected error during script execution:", error);
  rl.close();
});
