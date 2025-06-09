"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactionMetadata } from "@/types";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const fileToDataUri = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event?.target?.result);
    };
    reader.readAsDataURL(file);
  });

export default function Home() {
  const ffmpegRef = useRef(new FFmpeg());
  const [imageExtension, setImageExtension] = useState("gif");
  const [loading, setLoading] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(2956);
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  let collectionMetadata = collectionsMetadata[collectionIndex];
  let minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  let maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);

  useEffect(() => {
    (async () => {
      if (
        isNaN(Number(tokenID)) ||
        Number(tokenID) < minTokenID ||
        Number(tokenID) > maxTokenID
      ) {
        return;
      }

      if (collectionMetadata.gifOverride) {
        const gifUrl = collectionMetadata.gifOverride(tokenID.toString());
        // r3bell api
        // return encodeURIComponent( `/proxy?url=${https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif}`,);

        setImageUrl(`/proxy?url=${encodeURIComponent(gifUrl)}`);
        return;
      }

      const response = await fetch(
        `/fetchNFTImage?tokenId=${tokenID}&contract=${collectionMetadata.contract}`,
      );
      if (!response.ok) {
        throw new Error(
          `Error fetching Chimpers image URL: ${response.statusText}`,
        );
      }
      const { imageUrl } = await response.json();
      if (imageUrl.includes("ipfs")) {
        setImageUrl(imageUrl);
      } else {
        setImageUrl(`/proxy?url=${imageUrl}`);
      }
    })();
  }, [collectionIndex, collectionMetadata, maxTokenID, minTokenID, tokenID]);

  const encodedImageUrl = useMemo(() => {
    if (!imageUrl) {
      return null;
    }

    return encodeURIComponent(imageUrl);
  }, [imageUrl]);

  const debouncedRenderImageUrl = useCallback(
    debounce(async () => {
      if (!imageUrl || !encodedImageUrl) {
        return;
      }
      if (!ffmpegReady) {
        console.warn("FFmpeg not ready yet.");
        return;
      }

      let overlaySettings: Partial<ReactionMetadata> = {
        title: "",
        filename: "",
      };

      overlaySettings = reactionsMap[overlayNumber - 1];

      try {
        let filedata;
        setLoading(true);
        if (uploadedImageUri) {
          filedata = await fetchFile(uploadedImageUri);
        } else {
          filedata = await fetchFile(imageUrl);
        }
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

        const imageExtension = isPNG ? "png" : isGIF ? "gif" : "jpg";
        setImageExtension(imageExtension);

        await ffmpegRef.current.writeFile(`input.${imageExtension}`, filedata);
        await ffmpegRef.current.writeFile(
          "reaction.png",
          await fetchFile(`/reactions/${overlaySettings.filename}`),
        );
        let ffmpegArgs;
        if (overlayEnabled) {
          await ffmpegRef.current.writeFile(
            "credit.png",
            await fetchFile(`/credit.png`),
          );
          ffmpegArgs = [
            "-i",
            `input.${imageExtension}`,
            "-i",
            "reaction.png",
            "-i",
            "credit.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; \
   [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
   [scaled_input][scaled1]overlay=${x}:${y}[video1]; \
   [2:v]scale=iw/1.5:-1[scaled2]; \
   [video1][scaled2]overlay=x=(W-w)/2:y=H-h`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${imageExtension}`,
          ];
        } else {
          ffmpegArgs = [
            "-i",
            `input.${imageExtension}`,
            "-i",
            "reaction.png",
            "-filter_complex",
            `[0:v]scale=1080:1080[scaled_input]; \
   [1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
   [scaled_input][scaled1]overlay=${x}:${y}`,
            ...(isGIF ? ["-f", "gif"] : []),
            `output.${imageExtension}`,
          ];
        }
        await ffmpegRef.current.exec(ffmpegArgs);
        console.log("FFmpeg command executed successfully");

        const data = await ffmpegRef.current.readFile(
          `output.${imageExtension}`,
        );
        const url = URL.createObjectURL(
          new Blob([data], { type: `image/${imageExtension}` }),
        );

        setFinalResult(url);
        console.log("Image URL generated:", url);
      } catch (error) {
        console.error("Error during FFmpeg execution:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [
      ffmpegReady,
      uploadedImageUri,
      encodedImageUrl,
      overlayNumber,
      scale,
      x,
      y,
      overlayEnabled,
    ],
  );

  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
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
      } catch (e) {
        console.error(e);
      }
    };

    loadFfmpeg();
  }, []);

  useEffect(() => {
    if (file) {
      fileToDataUri(file).then((dataUri) => {
        setUploadedImageUri(dataUri as string);
      });
    } else {
      setUploadedImageUri(null);
    }
  }, [file]);

  useEffect(() => {
    if (ffmpegReady && (encodedImageUrl || uploadedImageUri)) {
      debouncedRenderImageUrl();
    }
  }, [ffmpegReady, uploadedImageUri, debouncedRenderImageUrl, encodedImageUrl]);

  useEffect(() => {
    return () => {
      debouncedRenderImageUrl.cancel(); // Cleanup the debounce on unmount
    };
  }, [debouncedRenderImageUrl]);

  useEffect(() => {
    let overlaySettings = reactionsMap[overlayNumber - 1];

    setX(overlaySettings.x);
    setY(overlaySettings.y);
    setScale(overlaySettings.scale);
  }, [tokenID, overlayNumber]);

  async function downloadOutput() {
    if (!finalResult) {
      console.warn("can't download gif, no final result");
      return;
    }

    // Create a download link and trigger the download
    const a = document.createElement("a");
    a.href = finalResult;
    a.download = `${collectionMetadata.name}-${tokenID}-${reactionsMap[overlayNumber - 1].title}.${imageExtension}`;
    a.click();
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setLoading(true);
        console.log("upload file");
        setFile(e.target.files[0]);
      }
    },
    [],
  );

  const handleTokenIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoading(true);
      setTokenID(e.target.value);
      setFile(null);
      setUploadedImageUri(null);
    },
    [],
  );

  return (
    <div className="flex items-center justify-center flex-col gap-2 p-0">
      <h1>CHIMP.FUN 🐒</h1>
      <select
        onChange={(e) => {
          const newCollectionIndex = e.target.value as unknown as number;
          setLoading(true);
          setCollectionIndex(newCollectionIndex);
          collectionMetadata = collectionsMetadata[newCollectionIndex];
          minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
          maxTokenID =
            collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);
          if (Number(tokenID) < minTokenID || Number(tokenID) > maxTokenID) {
            setTokenID(minTokenID);
          }
          setFile(null);
          setUploadedImageUri(null);
        }}
      >
        {collectionsMetadata.map((_, index) => {
          const collection = collectionsMetadata[index];

          return (
            <option key={collection.name} value={index}>
              {collection.name}
            </option>
          );
        })}
      </select>
      <div className="flex flex-col sm:flex-row gap-1">
        <label>
          Token ID #({minTokenID}-{maxTokenID}):{" "}
        </label>
        <input
          id="gifNumber"
          min={minTokenID}
          max={maxTokenID}
          value={tokenID}
          onChange={handleTokenIdChange}
        />
      </div>
      <button
        className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          console.log("clicked random");
          setTokenID(Math.floor(Math.random() * maxTokenID) + 1);
          setLoading(true);
          setFile(null);
          setUploadedImageUri(null);
        }}
      >
        RANDOM 🎲
      </button>
      <label>Or upload your image: </label>
      <div className="flex gap-1 justify-center align-center">
        <input
          className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
          id="file"
          type="file"
          onChange={handleFileChange}
        />
      </div>
      <small>
        For best results use a 1080x1080 image, you can use{" "}
        <a href="https://www.iloveimg.com/resize-image">this tool</a>.
      </small>
      <div id="gifContainer">
        <div className="flex justify-center mb-2">
          <button
            className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
            onClick={async () => {
              try {
                const clipboardItems = await navigator.clipboard.read();
                for (const clipboardItem of clipboardItems) {
                  for (const type of clipboardItem.types) {
                    if (type.startsWith("image/")) {
                      const blob = await clipboardItem.getType(type);
                      const file = new File([blob], "pasted-image", { type });
                      setFile(file);
                      return;
                    }
                  }
                }
                alert("No image found in clipboard");
              } catch (err) {
                console.error("Failed to read clipboard:", err);
                alert("Failed to read clipboard");
              }
            }}
          >
            Paste Image From Clipboard
          </button>
        </div>
        <div className="relative max-w-[300px] max-h-[300px] w-full h-auto">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg">
              <AiOutlineLoading3Quarters className="animate-spin text-white text-8xl" />
            </div>
          )}
          <Image
            id="gif"
            src={finalResult ?? "placeholder.png"}
            alt=""
            unoptimized
            height={300}
            width={300}
          />
        </div>
      </div>
      <div>
        <div className="flex gap-2 justify-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={downloadOutput}
          >
            Download
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={async () => {
              if (finalResult) {
                try {
                  const response = await fetch(finalResult);
                  const blob = await response.blob();

                  // Check if the browser supports writing this type to clipboard
                  if (!navigator.clipboard.write) {
                    alert(
                      "Your browser does not support copying images to clipboard",
                    );
                    return;
                  }

                  // Try to write to clipboard
                  try {
                    await navigator.clipboard.write([
                      new ClipboardItem({
                        [blob.type]: blob,
                      }),
                    ]);
                    alert("Image copied to clipboard successfully!");
                  } catch (writeError) {
                    // If direct write fails, offer to download instead
                    if (
                      confirm(
                        "Your browser does not support copying this image type directly. Would you like to download it instead?",
                      )
                    ) {
                      downloadOutput();
                    }
                  }
                } catch (err) {
                  console.error("Failed to copy image:", err);
                  alert(
                    "Failed to copy image. You can use the Download button instead.",
                  );
                }
              }
            }}
          >
            Copy Result To Clipboard
          </button>
        </div>
      </div>
      <div>
        <h2>Settings:</h2>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          id="overlayEnabled"
          checked={overlayEnabled}
          onChange={(e) => setOverlayEnabled(e.target.checked)}
        />
        <label htmlFor="overlayEnabled">Show credit overlay</label>
      </div>
      <div className="flex gap-1 flex-col sm:flex-row ">
        <div className="flex flex-col gap-1">
          <label>X: </label>
          <input
            type="number"
            id="x"
            value={x}
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setX(normalized);
            }}
          />
          <input
            type="range"
            value={x}
            min="-1000"
            max="1000"
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setX(normalized);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label>Y: </label>
          <input
            type="number"
            id="y"
            value={y}
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setY(normalized);
            }}
          />
          <input
            type="range"
            value={y}
            min="-1000"
            max="1000"
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setY(normalized);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label>Scale: </label>
          <input
            type="number"
            id="scale"
            value={scale}
            min="-2"
            max="5"
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setScale(normalized);
            }}
          />
          <input
            type="range"
            value={scale}
            min="-2"
            max="5"
            onChange={(e) => {
              setLoading(true);
              const normalized = Number(e.target.value);
              setScale(normalized);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label>Select a reaction: </label>

        <div className="flex flex-wrap justify-center items-center gap-1 max-w-md">
          {reactionsMap.map((value, index) => {
            return (
              <button
                key={index + 1}
                className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  setLoading(true);
                  setOverlayNumber(Number(index + 1));
                }}
              >
                {value.title}
              </button>
            );
          })}
        </div>
      </div>
      <div className="m-4 flex flex-col gap-1">
        <div>For donations:</div>
        <div>ETH: 0xd81B7A2a1bBf3e1c713f2A5C886f88EE5f862417</div>
        <div>SOL: DMjh4rUhozxjXjVTRQhSBv8AzicPyQrGCD8UZZLXkEAe</div>
        <div>BTC: bc1qygspwlmyy77eds53mszhlr77nr2vm9pl6k0rrk</div>
      </div>
      <div className="m-4">
        Made with ❤️ by{" "}
        <a href="https://linktr.ee/mrcryptoalex">Alex !CHIMP 🐒</a>
      </div>
    </div>
  );
}
