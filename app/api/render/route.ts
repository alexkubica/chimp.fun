import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { ffmpegPath } from "ffmpeg-ffprobe-static";

const execAsync = promisify(exec);

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
