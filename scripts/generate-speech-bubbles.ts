import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// List of strings to convert to speech bubbles
const speechTexts = ["Happy 4th\nof July!"];

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
  const textLength = text.replace(/\n/g, "").length;
  let scale = 0.8;
  let x = 600;
  let y = 80;

  // Adjust scale based on text length
  if (textLength > 15) {
    scale = 0.6;
    x = 500;
    y = 60;
  } else if (textLength > 10) {
    scale = 0.7;
    x = 550;
    y = 70;
  }

  return { scale, x, y };
}

async function generateSpeechBubbles() {
  console.log("🚀 Starting speech bubble generation...");

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
  });

  const page = await browser.newPage();

  // Set download behavior
  const downloadPath = path.resolve("./public/reactions");

  // Ensure download directory exists
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  // Enable downloads
  await page.setDefaultNavigationTimeout(60000);
  await page.setViewport({ width: 1200, height: 800 });

  const newReactions = [];

  for (const text of speechTexts) {
    try {
      console.log(`📝 Processing: "${text}"`);

      // Navigate to the speech bubble website
      await page.goto("https://pixelspeechbubble.com/", {
        waitUntil: "networkidle2",
      });

      // Debug: Check what elements are on the page
      const pageContent = await page.evaluate(() => {
        return {
          textareas: Array.from(document.querySelectorAll("textarea")).map(
            (t) => t.tagName,
          ),
          inputs: Array.from(document.querySelectorAll("input")).map((i) => ({
            tag: i.tagName,
            type: i.type,
            value: i.value,
          })),
          buttons: Array.from(document.querySelectorAll("button")).map((b) => ({
            text: b.textContent?.trim(),
            type: b.type,
          })),
          allButtons: Array.from(
            document.querySelectorAll(
              'input[type="button"], input[type="submit"], button',
            ),
          ).map((b) => ({
            text: b.textContent?.trim() || (b as HTMLInputElement).value,
            type: (b as HTMLInputElement).type,
            tag: b.tagName,
          })),
        };
      });

      console.log("Page elements found:", pageContent);

      // Try to find text input (might be input type="text" instead of textarea)
      let textInput = (await page.$("textarea")) as any;
      if (!textInput) {
        textInput = (await page.$('input[type="text"]')) as any;
      }

      if (!textInput) {
        console.log("❌ No text input found, skipping:", text);
        continue;
      }

      // Clear any existing text and input our text
      await textInput.click({ clickCount: 3 }); // Select all
      await page.keyboard.press("Backspace");
      await textInput.type(text);

      // Find the Create button (it's an input type="button")
      let createButton = (await page.$(
        'input[type="button"][value="Create"]',
      )) as any;
      if (!createButton) {
        createButton = (await page.$('input[type="submit"]')) as any;
      }
      if (!createButton) {
        createButton = (await page.$('input[type="button"]')) as any;
      }
      if (!createButton) {
        createButton = (await page.$("button")) as any;
      }

      if (createButton) {
        await createButton.click();
        console.log("✅ Clicked create button");
      } else {
        console.log("❌ No create button found, skipping:", text);
        continue;
      }

      // Wait for the image to be generated - try different possible selectors
      let imageSelector = "#bubbleImage";
      try {
        await page.waitForSelector(imageSelector, { timeout: 15000 });
      } catch {
        // Try alternative selectors
        const alternativeSelectors = [
          "img",
          "canvas",
          '[src*="data:image"]',
          'img[src*="blob:"]',
        ];
        let imageFound = false;

        for (const selector of alternativeSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            imageSelector = selector;
            imageFound = true;
            console.log(`Found image with selector: ${selector}`);
            break;
          } catch {
            // Continue trying
          }
        }

        if (!imageFound) {
          console.log("❌ No image found after creation, skipping:", text);
          continue;
        }
      }

      // Wait a bit more to ensure the image is fully loaded
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get the image source or take screenshot
      let imageSrc = null;
      try {
        imageSrc = await page.evaluate((selector) => {
          const img = document.querySelector(selector) as HTMLImageElement;
          return img ? img.src : null;
        }, imageSelector);
      } catch {
        console.log("Could not get image src, will try screenshot approach");
      }

      if (imageSrc && imageSrc !== "about:blank") {
        try {
          // Download the image
          const filename = createFilename(text);
          const filePath = path.join(downloadPath, filename);

          // Fetch the image data
          const imageResponse = await page.goto(imageSrc);
          const imageBuffer = await imageResponse?.buffer();

          if (imageBuffer) {
            // @ts-ignore - Buffer type compatibility issue
            fs.writeFileSync(filePath, imageBuffer);
            console.log(`✅ Downloaded: ${filename}`);

            // Calculate metadata for this reaction
            const metadata = calculateMetadata(text);

            newReactions.push({
              title: text.replace(/\n/g, "\\n"), // Preserve newlines in title
              scale: metadata.scale,
              x: metadata.x,
              y: metadata.y,
              filename: filename,
            });
          }
        } catch (error) {
          console.log("❌ Error downloading image:", error);
        }
      } else {
        // Try to take a screenshot of the image element as fallback
        try {
          const imageElement = await page.$(imageSelector);
          if (imageElement) {
            const filename = createFilename(text);
            const filePath = path.join(
              downloadPath,
              filename,
            ) as `${string}.png`;

            await imageElement.screenshot({ path: filePath });
            console.log(`✅ Screenshot saved: ${filename}`);

            // Calculate metadata for this reaction
            const metadata = calculateMetadata(text);

            newReactions.push({
              title: text.replace(/\n/g, "\\n"), // Preserve newlines in title
              scale: metadata.scale,
              x: metadata.x,
              y: metadata.y,
              filename: filename,
            });
          }
        } catch (error) {
          console.log("❌ Error taking screenshot:", error);
        }
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Error processing "${text}":`, error);
    }
  }

  await browser.close();

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
