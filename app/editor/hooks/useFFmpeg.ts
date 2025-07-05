import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import { reactionsMap } from "@/consts";
import { fileToDataUri } from "../utils";

export function useFFmpeg() {
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);
  const [imageExtension, setImageExtension] = useState("gif");

  // Initialize FFmpeg
  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        setFfmpegLoading(true);
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {
          console.log(message);
        });
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript",
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm",
          ),
        });
        setFfmpegReady(true);
        return true;
      } catch (e) {
        console.error("FFmpeg loading failed:", e);
        return false;
      } finally {
        setFfmpegLoading(false);
      }
    };

    if (!ffmpegLoadPromise.current) {
      ffmpegLoadPromise.current = loadFfmpeg();
    }
  }, []);

  // Process image with FFmpeg
  const processImage = useCallback(
    async (
      imageSource: string, // Either encoded image URL or uploaded image URI
      file: File | null,
      overlayNumber: number,
      x: number,
      y: number,
      scale: number,
      overlayEnabled: boolean,
      watermarkStyle: "oneline" | "twoline" = "twoline",
      watermarkPaddingX: number = -170,
      watermarkPaddingY: number = -30,
      watermarkScale: number = 3,
    ): Promise<string | null> => {
      if (!ffmpegReady) return null;

      try {
        let filedata: ArrayBuffer;

        if (file) {
          // Use uploaded file
          const dataUri = await fileToDataUri(file);
          const response = await fetch(dataUri as string);
          filedata = await response.arrayBuffer();
        } else if (imageSource) {
          // Use image from URL
          const response = await fetch(imageSource);
          filedata = await response.arrayBuffer();
        } else {
          return null;
        }

        const overlaySettings = reactionsMap[overlayNumber - 1];
        if (!overlaySettings) return null;

        const imageBytes = new Uint8Array(filedata);

        const isPNG =
          imageBytes[0] === 0x89 &&
          imageBytes[1] === 0x50 &&
          imageBytes[2] === 0x4e &&
          imageBytes[3] === 0x47;

        const isGIF =
          imageBytes[0] === 0x47 &&
          imageBytes[1] === 0x49 &&
          imageBytes[2] === 0x46;

        const currentImageExtension = isPNG ? "png" : isGIF ? "gif" : "jpg";
        setImageExtension(currentImageExtension);

        await ffmpegRef.current.writeFile(`input.${currentImageExtension}`, new Uint8Array(filedata));
        await ffmpegRef.current.writeFile(
          "reaction.png",
          await fetchFile(`/reactions/${overlaySettings.filename}`),
        );

        let ffmpegArgs: string[];
        if (overlayEnabled) {
          const watermarkFile =
            watermarkStyle === "oneline" ? "credit-oneline.png" : "credit.png";
          const watermarkPath =
            watermarkStyle === "oneline"
              ? "/credit-oneline.png"
              : "/credit.png";

          // Try to load the specific watermark, fallback to credit.png if not found
          let watermarkData;
          try {
            watermarkData = await fetchFile(watermarkPath);
          } catch (error) {
            console.log(
              `Fallback: ${watermarkPath} not found, using credit.png`,
            );
            watermarkData = await fetchFile("/credit.png");
          }

          await ffmpegRef.current.writeFile(watermarkFile, watermarkData);
          ffmpegArgs = [
            "-i",
            `input.${currentImageExtension}`,
            "-i",
            "reaction.png",
            "-i",
            watermarkFile,
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}[video1]; [2:v]scale=iw*${watermarkScale}:-1[scaled2]; [video1][scaled2]overlay=x=W-w-${watermarkPaddingX}:y=H-h-${watermarkPaddingY}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${currentImageExtension}`,
          ];
        } else {
          ffmpegArgs = [
            "-i",
            `input.${currentImageExtension}`,
            "-i",
            "reaction.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; [scaled_input][scaled1]overlay=${x}:${y}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${currentImageExtension}`,
          ];
        }

        await ffmpegRef.current.exec(ffmpegArgs);
        console.log("FFmpeg command executed successfully");

        const data = await ffmpegRef.current.readFile(
          `output.${currentImageExtension}`,
        );
        const url = URL.createObjectURL(
          new Blob([data], { type: `image/${currentImageExtension}` }),
        );

        console.log("Image URL generated:", url);
        return url;
      } catch (error) {
        console.error("Error during FFmpeg execution:", error);
        return null;
      }
    },
    [ffmpegReady],
  );

  // Debounced version of processImage
  const debouncedProcessImage = useMemo(
    () => ffmpegReady ? debounce(processImage, 200) : null,
    [processImage, ffmpegReady],
  );

  return {
    ffmpegReady,
    ffmpegLoading,
    imageExtension,
    processImage,
    debouncedProcessImage,
  };
}