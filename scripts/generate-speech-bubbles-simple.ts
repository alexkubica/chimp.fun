import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";

// List of strings to convert to speech bubbles
const speechTexts = ["!IKZ", "Welcome to\nthe garden!", "Please!"];

// Helper function to create safe filename from text
function createFilename(text: string): string {
  return (
    text
      .replace(/\n/g, " ")
      .replace(/[^a-zA-Z0-9\s$!]/g, "")
      .replace(/\s+/g, " ")
      .trim() + ".png"
  );
}

// Helper function to calculate position and scale based on text length
function calculateMetadata(text: string) {
  let scale = 1;
  let x = 500;
  let y = 60;

  // Adjust based on text characteristics
  if (text.includes("\n")) {
    y = 40; // Higher positioning for multi-line text
  }

  if (text.length > 10) {
    scale = 0.8; // Smaller scale for longer text
    x = 450;
  }

  return { scale, x, y };
}

function drawSpeechBubble(text: string): Buffer {
  const fontSize = 16;
  const padding = 20;
  const spikeHeight = 20;

  // Create a temporary canvas to measure text
  const tempCanvas = createCanvas(100, 100);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;

  // Support multi-line text
  const lines = text.split("\n");
  const textWidths = lines.map((line) => tempCtx.measureText(line).width);
  const textWidth = Math.max(...textWidths);
  const textHeight = fontSize * lines.length;

  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = textHeight + padding * 2 + spikeHeight;

  // Create the actual canvas
  const canvas = createCanvas(bubbleWidth, bubbleHeight);
  const ctx = canvas.getContext("2d");

  // Apply font settings
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  // Draw speech bubble background
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  // Draw bubble shape
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, bubbleHeight - spikeHeight);
  ctx.lineTo(bubbleWidth / 2 - 10, bubbleHeight - spikeHeight);
  ctx.lineTo(bubbleWidth / 2, bubbleHeight);
  ctx.lineTo(bubbleWidth / 2 + 10, bubbleHeight - spikeHeight);
  ctx.lineTo(bubbleWidth, bubbleHeight - spikeHeight);
  ctx.lineTo(bubbleWidth, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw text (multi-line)
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  lines.forEach((line, i) => {
    const x = bubbleWidth / 2;
    const y = padding + i * fontSize;
    ctx.fillText(line, x, y);
  });

  return canvas.toBuffer("image/png");
}

async function generateSpeechBubbles() {
  console.log("🚀 Starting speech bubble generation...");

  // Ensure download directory exists
  const downloadPath = path.resolve("./public/reactions");
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  const newReactions = [];

  for (const text of speechTexts) {
    try {
      console.log(`📝 Processing: "${text}"`);

      // Generate speech bubble image
      const imageBuffer = drawSpeechBubble(text);

      // Save the image
      const filename = createFilename(text);
      const filePath = path.join(downloadPath, filename);

      fs.writeFileSync(filePath, new Uint8Array(imageBuffer));
      console.log(`✅ Generated: ${filename}`);

      // Calculate metadata for this reaction
      const metadata = calculateMetadata(text);

      newReactions.push({
        title: text.replace(/\n/g, "\\n"), // Preserve newlines in title
        scale: metadata.scale,
        x: metadata.x,
        y: metadata.y,
        filename: filename,
      });
    } catch (error) {
      console.error(`❌ Error processing "${text}":`, error);
    }
  }

  // Update the reactions map
  if (newReactions.length > 0) {
    await updateReactionsMap(newReactions);
  }

  console.log("🎉 Speech bubble generation completed!");
  console.log(`Generated ${newReactions.length} new reactions.`);
}

async function updateReactionsMap(newReactions: any[]) {
  console.log("📝 Updating reactions map...");

  const constsFilePath = "./consts/index.ts";
  let fileContent = fs.readFileSync(constsFilePath, "utf8");

  // Find the end of the reactionsMap array (before the closing ];)
  const reactionsMapEndRegex = /(\s*)\];(\s*export const tokenURIABI)/;
  const match = fileContent.match(reactionsMapEndRegex);

  if (match) {
    // Format the new reactions
    const formattedReactions = newReactions
      .map((reaction) => {
        return `  {
    title: "${reaction.title}",
    scale: ${reaction.scale},
    x: ${reaction.x},
    y: ${reaction.y},
    filename: "${reaction.filename}",
  }`;
      })
      .join(",\n");

    // Insert the new reactions before the closing ];
    const replacement = `,
${formattedReactions},
${match[1]}];${match[2]}`;

    fileContent = fileContent.replace(reactionsMapEndRegex, replacement);

    // Write the updated file
    fs.writeFileSync(constsFilePath, fileContent, "utf8");
    console.log("✅ Updated reactions map in consts/index.ts");
  } else {
    console.error(
      "❌ Could not find reactionsMap array end in consts/index.ts",
    );
  }
}

// Run the script
generateSpeechBubbles().catch(console.error);
