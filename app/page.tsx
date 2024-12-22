"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { EtherscanProvider } from "ethers";

const fetchChimpersImageUrl = async ({
  tokenId,
  contractAddress = "0x80336ad7a747236ef41f47ed2c7641828a480baa",
}: {
  tokenId: number;
  contractAddress?: string;
}): Promise<string> => {
  if (tokenId < 1 || tokenId > 5555) {
    throw new Error("Token ID must be between 1 and 5555.");
  }

  // Define the ABI for the tokenURI function
  const abi = [
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
  ];

  try {
    // Use EtherscanProvider from ethers.js
    const provider = new EtherscanProvider(
      "mainnet",
      process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
    );

    // Connect to the contract
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Fetch the tokenURI
    const tokenURI: string = await contract.tokenURI(tokenId);

    // Fetch the metadata JSON from the tokenURI
    const response = await fetch(tokenURI);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const metadata = await response.json();

    // Validate and return the image URL
    if (!metadata.image) {
      throw new Error("Image field not found in metadata.");
    }

    return metadata.image;
  } catch (error) {
    console.error("Error fetching Chimpers image URL:", error);
    throw error;
  }
};

const fileToDataUri = (file: File) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event?.target?.result);
    };
    reader.readAsDataURL(file);
  });

type ReactionMetadata = {
  title: string;
  scale: number;
  x: number;
  y: number;
  filename: string;
};

const reactionsMap: { [key: number]: string | ReactionMetadata } = {
  1: {
    title: "OK!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "1.png",
  },
  2: {
    title: "YES!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "2.png",
  },
  3: {
    title: "NO!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "3.png",
  },
  4: {
    title: "COOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "4.png",
  },
  5: {
    title: "LOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "5.png",
  },
  6: {
    title: "NICE!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "6.png",
  },
  7: {
    title: "WHAT?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "7.png",
  },
  8: {
    title: "WHY?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "8.png",
  },
  9: {
    title: "GREAT!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "9.png",
  },
  10: {
    title: "LOL!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "10.png",
  },
  11: {
    title: "SURE!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "11.png",
  },
  12: {
    title: "LFC!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "12.png",
  },
  13: {
    title: "!CHIMP",
    x: 650,
    y: 70,
    scale: 3,
    filename: "13.png",
  },
  14: {
    title: "?",
    x: 650,
    y: 70,
    scale: 3,
    filename: "14.png",
  },
  15: {
    title: "WOW!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "15.png",
  },
  16: {
    title: "XD",
    x: 650,
    y: 70,
    scale: 3,
    filename: "16.png",
  },
  17: {
    title: "<3",
    x: 650,
    y: 70,
    scale: 3,
    filename: "17.png",
  },
  18: {
    title: "GM!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "18.png",
  },
  19: {
    title: "GN!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "19.png",
  },
  20: {
    title: "F4F",
    x: 650,
    y: 70,
    scale: 3,
    filename: "20.png",
  },
  21: {
    title: "WLTC!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "21.png",
  },
  22: {
    title: "G(Y)M!",
    x: 650,
    y: 70,
    scale: 3,
    filename: "22.png",
  },
  23: {
    title: "HAPPY CHUESDAY",
    x: 650,
    y: 70,
    scale: 3,
    filename: "23.png",
  },
  24: {
    title: "I AM !CHIMP AND !CHIMP IS ME",
    scale: 1.7,
    x: 270,
    y: 50,
    filename: "I AM !CHIMP AND !CHIMP IS ME.png",
  },
  25: {
    title: "#CHOOSECUTE",
    scale: 1.5,
    x: 270,
    y: 50,
    filename: "CHOOSECUTE.png",
  },
  26: {
    title: "HAPPY 100K!",
    scale: 1.5,
    x: 270,
    y: 50,
    filename: "happy 100k.png",
  },
  27: {
    title: "WE ALWAYS !CHIMP",
    scale: 1.5,
    x: 250,
    y: 50,
    filename: "WE ALWAYS !CHIMP.gif",
  },
  28: {
    title: "WELCOME!",
    scale: 1,
    x: 300,
    y: 30,
    filename: "welcome!.png",
  },
  29: {
    title: "THANKS!",
    scale: 1,
    x: 300,
    y: 30,
    filename: "thanks.png",
  },
  30: {
    title: "LFCHIMP!",
    scale: 1,
    x: 300,
    y: 30,
    filename: "LFCHIMP.png",
  },
  31: {
    title: "WEN MINT?",
    scale: 1,
    x: 300,
    y: 30,
    filename: "wen mint.png",
  },
  32: {
    title: "FEELING !CHIMPISH",
    scale: 0.8,
    x: 650,
    y: 70,
    filename: "feeling chimpish.png",
  },
  33: {
    title: "WE LOVE $PENGU",
    scale: 1.4,
    x: 320,
    y: 25,
    filename: "we love pengu.png",
  },
  34: {
    title: "$PENGU TO THE MOON!",
    scale: 1.4,
    x: 320,
    y: 25,
    filename: "pengu to the moon.png",
  },
};

export default function Home() {
  const ffmpegRef = useRef(new FFmpeg());
  const [gifNumber, setGifNumber] = useState(2956);
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [overlayNumber, setOverlayNumber] = useState(32);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (gifNumber < 1 || gifNumber > 5555) {
        return null;
      }

      const url = await fetchChimpersImageUrl({ tokenId: gifNumber });

      // r3bell api
      // return encodeURIComponent( `/proxy?url=${https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif}`,);

      setImageUrl(url);
    })();
  }, [gifNumber]);

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

      if (typeof reactionsMap[overlayNumber] === "string") {
        overlaySettings.filename = overlayNumber + ".png";
      } else {
        overlaySettings = reactionsMap[overlayNumber];
      }

      try {
        await ffmpegRef.current.writeFile(
          "reaction.png",
          await fetchFile(`/reactions/${overlaySettings.filename}`),
        );
        await ffmpegRef.current.writeFile(
          "credit.png",
          await fetchFile(`/credit.png`),
        );

        let filedata;
        if (uploadedImageUri) {
          filedata = await fetchFile(uploadedImageUri);
        } else {
          // filedata = await fetchFile(encodedImageUrl);
          filedata = await fetchFile(imageUrl);
        }
        console.log("File data type:", typeof filedata);
        console.log("File data length:", filedata.length);
        console.log("File data (first bytes):", filedata.slice(0, 10));

        await ffmpegRef.current.writeFile("input.png", filedata);

        await ffmpegRef.current.exec([
          "-i",
          "input.png",
          "-i",
          "reaction.png",
          "-i",
          "credit.png",
          "-filter_complex",
          `[1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
                     [0:v][scaled1]overlay=${x}:${y}[video1]; \
                     [2:v]scale=iw/1.5:-1[scaled2]; \
                     [video1][scaled2]overlay=x=(W-w)/2:y=H-h`,
          "output.png",
        ]);
        console.log("FFmpeg command executed successfully");

        // kubica debug why this is not working
        const data = await ffmpegRef.current.readFile("output.png");
        console.log("Output file size:", data.length);
        console.log("Output file (first bytes):", data.slice(0, 10));
        const url = URL.createObjectURL(
          new Blob([data], { type: "image/png" }),
        );

        // Update the state to trigger re-render
        setFinalResult(url);
        console.log("Image URL generated:", url);
      } catch (error) {
        console.error("Error during FFmpeg execution:", error);
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
    let overlaySettings = reactionsMap[overlayNumber];

    if (typeof overlaySettings !== "string") {
      setX(overlaySettings.x);
      setY(overlaySettings.y);
      setScale(overlaySettings.scale);
    } else {
      setX(320);
      setY(0);
      setScale(4);
    }
  }, [gifNumber, overlayNumber]);

  async function downloadGif() {
    console.log("downloading gif");

    if (!finalResult) {
      console.warn("can't download gif, no final result");
      return;
    }

    // Create a download link and trigger the download
    const a = document.createElement("a");
    a.href = finalResult;
    a.download = "output.gif";
    a.click();
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        console.log("upload file");
        setFile(e.target.files[0]);
      }
    },
    [],
  );

  const handleChimpNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGifNumber(Number(e.target.value));
    },
    [],
  );

  return (
    <div className="flex items-center justify-center flex-col gap-2 p-0">
      <h1>CHIMP.FUN 🐒</h1>
      <p>
        {`There's an issue with loading the GIFs and we're working to resolve this, stay tuned!`}
        <br />
        {`Meantime a static asset is provided 🙏`}
      </p>
      <div className="flex flex-col sm:flex-row gap-1">
        <label>Chimp #(1-5555): </label>
        <input
          type="number"
          id="gifNumber"
          min="1"
          max="5555"
          value={gifNumber}
          onChange={handleChimpNumberChange}
        />
        <input
          type="range"
          min="1"
          max="5555"
          value={gifNumber}
          onChange={handleChimpNumberChange}
        />
      </div>
      <button
        className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          console.log("clicked random");
          setGifNumber(Math.floor(Math.random() * 5555) + 1);
        }}
      >
        RANDOM !CHIMP
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
        {finalResult && (
          <Image
            id="gif"
            src={finalResult}
            alt="chimp will be displayed here"
            unoptimized
            sizes="(max-width: 300px) 100vw, 300px"
            className="max-w-[300px] max-h-[300px] w-full h-auto"
            height={300}
            width={300}
          />
        )}
        {!finalResult && "CHIMPLOADING..."}
      </div>

      <div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={downloadGif}
        >
          Download GIF
        </button>
      </div>

      <div>
        <h2>Settings:</h2>
      </div>

      <div className="flex gap-1 flex-col sm:flex-row ">
        <div className="flex flex-col gap-1">
          <label>X: </label>
          <input
            type="number"
            id="x"
            value={x}
            onChange={(e) => {
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
              const normalized = Number(e.target.value);
              setScale(normalized);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label>Select a reaction: </label>

        <div className="flex flex-wrap justify-center items-center gap-1 max-w-md">
          {Object.entries(reactionsMap).map(([key, value]) => {
            return (
              <button
                key={key}
                className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  console.log("change reaction to", key);
                  setOverlayNumber(Number(key));
                }}
              >
                {typeof value === "string" ? value : value.title}
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
        Made with ❤️ by <a href="https://linktr.ee/alexkueth">Alex !CHIMP 🐒</a>
      </div>
    </div>
  );
}
