import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

// Get FFmpeg path at runtime to avoid build-time path resolution issues
async function getFfmpegPath() {
  console.log("Getting FFmpeg path...");
  console.log(
    "Environment: VERCEL =",
    process.env.VERCEL,
    "AWS_LAMBDA =",
    process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
  console.log("Current working directory:", process.cwd());
  console.log("__dirname:", __dirname);

  // First, always try system FFmpeg since it's most reliable
  const systemPaths = [
    "ffmpeg", // System PATH
    "/usr/bin/ffmpeg", // Common system location
    "/opt/bin/ffmpeg", // Lambda layer location
  ];

  for (const path of systemPaths) {
    try {
      console.log(`Trying system FFmpeg at: ${path}`);
      await execAsync(`"${path}" -version`);
      console.log(`✅ Found working system FFmpeg at: ${path}`);
      return path;
    } catch (e) {
      console.log(`❌ System FFmpeg not found at: ${path}`);
      continue;
    }
  }

  console.log("No system FFmpeg found, trying package binary...");

  try {
    // Try the package approach as fallback
    const ffmpegStatic = require("ffmpeg-ffprobe-static");
    let ffmpegPath = ffmpegStatic.ffmpegPath;

    console.log("Package reported FFmpeg path:", ffmpegPath);

    // Check if the path exists
    if (existsSync(ffmpegPath)) {
      console.log("✅ Package FFmpeg binary exists");

      // Try to make it executable
      try {
        await execAsync(`chmod +x "${ffmpegPath}"`);
        console.log("Made FFmpeg executable");
      } catch (chmodError: any) {
        console.warn("Could not make FFmpeg executable:", chmodError.message);
      }

      // Test if it actually works
      try {
        await execAsync(`"${ffmpegPath}" -version`);
        console.log("✅ Package FFmpeg is working");
        return ffmpegPath;
      } catch (testError: any) {
        console.error("❌ Package FFmpeg failed test:", testError.message);
      }
    } else {
      console.log("❌ Package FFmpeg binary does not exist at reported path");

      // Try to find it in alternative locations
      const possiblePaths = [
        join(
          require.resolve("ffmpeg-ffprobe-static/package.json"),
          "..",
          "ffmpeg",
        ),
        join(process.cwd(), "node_modules", "ffmpeg-ffprobe-static", "ffmpeg"),
        join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "node_modules",
          "ffmpeg-ffprobe-static",
          "ffmpeg",
        ),
      ];

      console.log("Searching for FFmpeg in alternative locations...");
      for (const path of possiblePaths) {
        console.log(`Checking: ${path}`);
        try {
          if (existsSync(path)) {
            console.log(`Found FFmpeg at: ${path}`);

            // Try to make it executable
            try {
              await execAsync(`chmod +x "${path}"`);
            } catch (chmodError: any) {
              console.warn(
                "Could not make FFmpeg executable:",
                chmodError.message,
              );
            }

            // Test if it works
            try {
              await execAsync(`"${path}" -version`);
              console.log("✅ Alternative FFmpeg is working");
              return path;
            } catch (testError: any) {
              console.error(
                "❌ Alternative FFmpeg failed test:",
                testError.message,
              );
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    console.error("❌ No working FFmpeg binary found anywhere");
    throw new Error("FFmpeg not available - no working binary found");
  } catch (error) {
    console.error("Failed to load ffmpeg-ffprobe-static:", error);
    throw new Error("FFmpeg not available - package not found");
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const inputImageFile = formData.get("inputImage") as File;
    const reactionImageFile = formData.get("reactionImage") as File;
    const watermarkImageFile = formData.get("watermarkImage") as File | null;

    const x = parseInt(formData.get("x") as string);
    const y = parseInt(formData.get("y") as string);
    const scale = parseFloat(formData.get("scale") as string);
    const overlayEnabled = formData.get("overlayEnabled") === "true";
    const watermarkScale =
      parseFloat(formData.get("watermarkScale") as string) || 1;
    const watermarkPaddingX =
      parseInt(formData.get("watermarkPaddingX") as string) || 20;
    const watermarkPaddingY =
      parseInt(formData.get("watermarkPaddingY") as string) || 20;
    const imageExtension = formData.get("imageExtension") as string;

    if (!inputImageFile || !reactionImageFile) {
      return NextResponse.json(
        { error: "Missing required files" },
        { status: 400 },
      );
    }

    // Create unique temp directory
    const tempDir = join(
      tmpdir(),
      `ffmpeg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await mkdir(tempDir, { recursive: true });

    try {
      // Save input files
      const inputImagePath = join(tempDir, `input.${imageExtension}`);
      const reactionImagePath = join(tempDir, "reaction.png");
      const outputPath = join(tempDir, `output.${imageExtension}`);

      await writeFile(
        inputImagePath,
        new Uint8Array(await inputImageFile.arrayBuffer()),
      );
      await writeFile(
        reactionImagePath,
        new Uint8Array(await reactionImageFile.arrayBuffer()),
      );

      let ffmpegCommand: string;
      const ffmpegPath = await getFfmpegPath();

      if (overlayEnabled && watermarkImageFile) {
        // Save watermark file
        const watermarkImagePath = join(tempDir, "watermark.png");
        await writeFile(
          watermarkImagePath,
          new Uint8Array(await watermarkImageFile.arrayBuffer()),
        );

        // FFmpeg command with watermark
        ffmpegCommand = `"${ffmpegPath}" -y -i "${inputImagePath}" -i "${reactionImagePath}" -i "${watermarkImagePath}" -filter_complex "[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}[video1]; [2:v]scale=iw*${watermarkScale}:-1[scaled2]; [video1][scaled2]overlay=x=W-w-${watermarkPaddingX}:y=H-h-${watermarkPaddingY}" ${imageExtension === "gif" ? "-f gif" : ""} "${outputPath}"`;
      } else {
        // FFmpeg command without watermark
        ffmpegCommand = `"${ffmpegPath}" -y -i "${inputImagePath}" -i "${reactionImagePath}" -filter_complex "[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}" ${imageExtension === "gif" ? "-f gif" : ""} "${outputPath}"`;
      }

      // Execute FFmpeg command
      await execAsync(ffmpegCommand);

      // Read the output file
      const outputBuffer = await readFile(outputPath);

      // Clean up temp files
      await Promise.all([
        unlink(inputImagePath).catch(() => {}),
        unlink(reactionImagePath).catch(() => {}),
        watermarkImageFile
          ? unlink(join(tempDir, "watermark.png")).catch(() => {})
          : Promise.resolve(),
        unlink(outputPath).catch(() => {}),
      ]);

      // Return the processed image
      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          "Content-Type": `image/${imageExtension}`,
          "Content-Length": outputBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("FFmpeg processing error:", error);
      return NextResponse.json(
        { error: "Failed to process image" },
        { status: 500 },
      );
    } finally {
      // Clean up temp directory
      try {
        await execAsync(`rm -rf "${tempDir}"`);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
