"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { ReactionMetadata } from "@/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineCopy } from "react-icons/ai";
import { ImagePicker } from "@/components/ui/ImagePicker";

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
  const [tempTokenID, setTempTokenID] = useState<string | number>(2956);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let collectionMetadata = collectionsMetadata[collectionIndex];
  let minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  let maxTokenID =
    collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);

  useEffect(() => {
    if (isFirstRender) {
      setLoading(true);
      setIsFirstRender(false);
    }
  }, [isFirstRender]);

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
      setTempTokenID(e.target.value);
    },
    [],
  );

  const handleTokenIdSubmit = useCallback(() => {
    const tokenIdNum = Number(tempTokenID);
    if (
      isNaN(tokenIdNum) ||
      tokenIdNum < minTokenID ||
      tokenIdNum > maxTokenID
    ) {
      setErrorMessage(
        `Invalid Token ID, please choose between ${minTokenID} and ${maxTokenID}`,
      );
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    setTokenID(tempTokenID);
    setFile(null);
    setUploadedImageUri(null);
  }, [tempTokenID, minTokenID, maxTokenID]);

  const handleRandomClick = useCallback(() => {
    console.log("clicked random");
    const randomId = Math.floor(Math.random() * maxTokenID) + 1;
    setTempTokenID(randomId);
    setTokenID(randomId);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
  }, [maxTokenID]);

  const copyBlobToClipboard = async (blobUrl: string) => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      if (blob.type === "image/gif") {
        if (
          confirm(
            "Copying GIFs isn't supported by current browser. Would you like to download instead?",
          )
        ) {
          downloadOutput();
        }
        return;
      }

      if (!navigator.clipboard.write) {
        alert("Your browser does not support copying images to clipboard");
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      alert("Image copied to clipboard successfully!");
    } catch (err) {
      console.error("Failed to copy image:", err);
      if (
        confirm("Failed to copy image. Would you like to download it instead?")
      ) {
        downloadOutput();
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            CHIMP.FUN
          </h1>
          <p className="text-lg font-medium mb-2">NFT Editor</p>
        </header>
        <section className="flex flex-col gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* First column: collection, token id, image, tip */}
            <div className="flex flex-col gap-8">
              {/* Upload controls */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="collection">Collection</Label>
                <Select
                  value={collectionIndex.toString()}
                  onValueChange={(val) => {
                    const newCollectionIndex = Number(val);
                    setLoading(true);
                    setCollectionIndex(newCollectionIndex);
                    collectionMetadata =
                      collectionsMetadata[newCollectionIndex];
                    minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
                    maxTokenID =
                      collectionMetadata.total +
                      (collectionMetadata.tokenIdOffset ?? 0);
                    if (
                      Number(tokenID) < minTokenID ||
                      Number(tokenID) > maxTokenID
                    ) {
                      setTokenID(minTokenID);
                    }
                    setFile(null);
                    setUploadedImageUri(null);
                  }}
                >
                  <SelectTrigger id="collection">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionsMetadata.map((collection, index) => (
                      <SelectItem
                        key={collection.name}
                        value={index.toString()}
                      >
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gifNumber">
                  Token ID ({minTokenID}-{maxTokenID})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="gifNumber"
                    min={minTokenID}
                    max={maxTokenID}
                    value={tempTokenID}
                    onChange={handleTokenIdChange}
                    type="number"
                    className="flex-1 min-w-0"
                    style={{ minWidth: 0 }}
                  />
                  <Button variant="secondary" onClick={handleRandomClick}>
                    🎲
                  </Button>
                </div>
                {errorMessage && (
                  <div className="text-destructive text-sm mt-1">
                    {errorMessage}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <ImagePicker
                  id="file"
                  onFileChange={setFile}
                  accept="image/*"
                />
                <Button
                  variant="outline"
                  onClick={async function handlePasteImage() {
                    try {
                      const clipboardItems = await navigator.clipboard.read();
                      for (const clipboardItem of clipboardItems) {
                        for (const type of clipboardItem.types) {
                          if (type.startsWith("image/")) {
                            const blob = await clipboardItem.getType(type);
                            const file = new File([blob], "pasted-image", {
                              type,
                            });
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
                  Paste From Clipboard
                </Button>
                <small className="text-muted-foreground">
                  Tip: Use 1:1 aspect ratio for best results.
                </small>
                {/* Reaction and overlay moved here */}
                <div className="flex flex-col gap-2 mt-2">
                  <Label>Select a reaction</Label>
                  <Select
                    value={overlayNumber.toString()}
                    onValueChange={function handleReaction(val) {
                      setLoading(true);
                      setOverlayNumber(Number(val));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reaction" />
                    </SelectTrigger>
                    <SelectContent>
                      {reactionsMap.map((value, index) => (
                        <SelectItem
                          key={index + 1}
                          value={(index + 1).toString()}
                        >
                          {value.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Label htmlFor="overlayEnabled">Show credit overlay</Label>
                  <Switch
                    id="overlayEnabled"
                    checked={overlayEnabled}
                    onCheckedChange={setOverlayEnabled}
                  />
                </div>
                <Button className="mt-4" onClick={handleTokenIdSubmit}>
                  GENERATE
                </Button>
              </div>
            </div>
            {/* Second column: preview, download, copy only */}
            <div className="flex flex-col gap-4 justify-center h-full">
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50 mt-2">
                <Label>Preview</Label>
                <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                  {loading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : (
                    finalResult && (
                      <img
                        src={finalResult}
                        alt="Preview"
                        className="object-contain w-full h-full rounded-lg"
                        style={{ background: "transparent" }}
                      />
                    )
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full mt-2">
                  <Button onClick={downloadOutput} className="w-full md:w-auto">
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={function handleCopy() {
                      if (finalResult) {
                        copyBlobToClipboard(finalResult);
                      }
                    }}
                    className="w-full md:w-auto"
                    aria-label="Copy"
                  >
                    <AiOutlineCopy />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* X, Y, Scale controls under both columns */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex flex-col gap-2 flex-1">
              <Label>X</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  id="x"
                  value={x}
                  min={-1000}
                  max={1000}
                  onChange={function handleX(e) {
                    setLoading(true);
                    setX(Number(e.target.value));
                  }}
                  className="w-24"
                />
                <Slider
                  min={-1000}
                  max={1000}
                  step={1}
                  value={[x]}
                  onValueChange={function handleSliderX(val) {
                    setLoading(true);
                    setX(val[0]);
                  }}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label>Y</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  id="y"
                  value={y}
                  min={-1000}
                  max={1000}
                  onChange={function handleY(e) {
                    setLoading(true);
                    setY(Number(e.target.value));
                  }}
                  className="w-24"
                />
                <Slider
                  min={-1000}
                  max={1000}
                  step={1}
                  value={[y]}
                  onValueChange={function handleSliderY(val) {
                    setLoading(true);
                    setY(val[0]);
                  }}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label>Scale</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  id="scale"
                  value={scale}
                  min={-2}
                  max={5}
                  step={0.01}
                  onChange={function handleScale(e) {
                    setLoading(true);
                    setScale(Number(e.target.value));
                  }}
                  className="w-24"
                />
                <Slider
                  min={-2}
                  max={5}
                  step={0.01}
                  value={[scale]}
                  onValueChange={function handleSliderScale(val) {
                    setLoading(true);
                    setScale(val[0]);
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
