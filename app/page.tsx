'use client';

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const fileToDataUri = (file: File) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    resolve(event?.target?.result)
  };
  reader.readAsDataURL(file);
})

type ReactionMetadata = {
  title: string;
  scale: number;
  x: number;
  y: number;
  filename: string;

}

const reactionsMap: { [key: number]: string | ReactionMetadata } = {
  1: 'OK!',
  2: 'YES!',
  3: 'NO!',
  4: 'COOL!',
  5: 'LOL!',
  6: 'NICE!',
  7: 'WHAT?',
  8: 'WHY?',
  9: 'GREAT!',
  10: 'LOL!',
  11: 'SURE!',
  12: 'LFC!',
  13: '!CHIMP',
  14: '?',
  15: 'WOW!',
  16: 'XD',
  17: '<3',
  18: 'GM!',
  19: 'GN!',
  20: 'F4F',
  21: 'WLTC!',
  22: 'G(Y)M!',
  23: 'HAPPY CHUESDAY',
  24: {
    title: 'I AM !CHIMP AND !CHIMP IS ME',
    scale: 1.7,
    x: 270,
    y: 50,
    filename: 'I AM !CHIMP AND !CHIMP IS ME.png',
  },
  25: {
    title: '#CHOOSECUTE',
    scale: 1.5,
    x: 270,
    y: 50,
    filename: 'CHOOSECUTE.png',
  },
  26: {
    title: 'HAPPY 100K!',
    scale: 1.5,
    x: 270,
    y: 50,
    filename: 'happy 100k.png',
  }
}

export default function Home() {
  const ffmpegRef = useRef(new FFmpeg());
  const [gifNumber, setGifNumber] = useState(2956);
  const [x, setX] = useState(270);
  const [y, setY] = useState(50);
  const [scale, setScale] = useState(1.5);
  const [overlayNumber, setOverlayNumber] = useState(13);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      console.log('upload file')
      setFile(e.target.files[0]);
    }
  };



  useEffect(() => {

    const loadFfmpeg = async () => {
      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on('log', ({ message }) => {
          // messageRef.current.innerHTML = message;
          console.log(message);
        });
        // toBlobURL is used to bypass CORS issue, urls with the same
        // domain can be used directly.
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegReady(true);
        //   await ffmpegRef.current.load();
        //   setFfmpegReady(true);
      } catch (e) {
        console.error(e)
      }
    }

    loadFfmpeg();
  }, [])

  const imageUrl = encodeURIComponent(`https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif`);
  const currentChimpGif = `/proxy?url=${imageUrl}`;

  const renderImageUrl = useCallback(async () => {
    let overlaySettings: Partial<ReactionMetadata> = {
      title: '',
      filename: '',
    }

    if (typeof reactionsMap[overlayNumber] === 'string') {
      overlaySettings.filename = overlayNumber + '.png';
    } else {
      overlaySettings = reactionsMap[overlayNumber];
    }
    await ffmpegRef.current.writeFile('reaction.png', await fetchFile(`/reactions/${overlaySettings.filename}`));
    await ffmpegRef.current.writeFile('credit.png', await fetchFile(`/credit.png`));
    let filedata;
    if (uploadedImageUri) {
      filedata = await fetchFile(uploadedImageUri);
    } else {
      filedata = await fetchFile(currentChimpGif);
    }
    await ffmpegRef.current.writeFile('input.gif', filedata);
    await ffmpegRef.current.exec([
      '-i', 'input.gif',
      '-i', 'reaction.png',
      '-i', 'credit.png',
      '-filter_complex', `[1:v]scale=iw/${scale}:ih/${scale}[scaled1]; \
                   [0:v][scaled1]overlay=${x}:${y}[video1]; \
                   [2:v]scale=iw/2.5:-1[scaled2]; \
                   [video1][scaled2]overlay=x=(W-w)/2:y=H-h`,
      '-f', 'gif', 'output.gif']);
    const data = await ffmpegRef.current.readFile('output.gif');
    const url = URL.createObjectURL(new Blob([data], { type: 'image/gif' }));
    setFinalResult(url);
  }, [currentChimpGif, overlayNumber, scale, uploadedImageUri, x, y]);

  useEffect(() => {
    if (file) {

      fileToDataUri(file)
        .then(dataUri => {
          setUploadedImageUri(dataUri as string)
        })
    } else {
      setUploadedImageUri(null)
    }
  }, [file, renderImageUrl])

  useEffect(() => {
    if (ffmpegReady && (currentChimpGif || uploadedImageUri)) {
      renderImageUrl();
    }
  }, [ffmpegReady, currentChimpGif, renderImageUrl, uploadedImageUri])

  useEffect(() => {
    let overlaySettings = reactionsMap[overlayNumber]

    if (typeof overlaySettings !== 'string') {
      setX(overlaySettings.x);
      setY(overlaySettings.y);
      setScale(overlaySettings.scale);
    } else {
      setX(320);
      setY(0);
      setScale(4);
    }
  }, [gifNumber, overlayNumber])


  async function downloadGif() {
    console.log('downloading gif')

    if (!finalResult) {
      console.warn("can't download gif, no final result")
      return
    }

    // Create a download link and trigger the download
    const a = document.createElement('a');
    a.href = finalResult;
    a.download = 'output.gif';
    a.click();
  }


  return (
    <div className="flex items-center justify-center flex-col gap-2 p-0">
      <h1 >CHIMP.FUN 🐒</h1>
      <div>
        <button className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={() => {
          console.log('clicked random')
          setGifNumber(Math.floor(Math.random() * 5555) + 1)
        }} >RANDOM !CHIMP</button>
      </div>

      <div>
        <input className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded" id="file" type="file" onChange={handleFileChange} />
      </div>


      <div className="flex flex-col gap-1">
        <label >Chimp #(1-5555): </label>
        <input type="number" id="gifNumber" min="1" max="5555" value={gifNumber}
          onChange={(e => {
            const normalized = Number(e.target.value)
            console.log('change chimp to', normalized)
            setGifNumber(normalized);
            setFile(null)
          })} />
        <input type="range" min="1" max="5555" value={gifNumber} onChange={e => {
          const normalized = Number(e.target.value)
          console.log('change chimp to', normalized)
          setGifNumber(normalized);
        }} />
      </div>

      <div className="flex flex-row gap-1">
        <div className="flex flex-col gap-1">
          <label >X: </label>
          <input type="number" id="x" value={x}
            onChange={(e => {
              const normalized = Number(e.target.value)
              setX(normalized);
            })} />
          <input type="range" value={x} min="0" max="1000" onChange={e => {
            const normalized = Number(e.target.value)
            setX(normalized);
          }} />
        </div>


        <div className="flex flex-col gap-1">
          <label >Y: </label>
          <input type="number" id="y" value={y}
            onChange={(e => {
              const normalized = Number(e.target.value)
              setY(normalized);
            })} />
          <input type="range" value={y} min="0" max="1000" onChange={e => {
            const normalized = Number(e.target.value)
            setY(normalized);
          }} />
        </div>

        <div className="flex flex-col gap-1">
          <label >Scale: </label>
          <input type="number" id="scale" value={scale}
            onChange={(e => {
              const normalized = Number(e.target.value)
              setScale(normalized);
            })} />
          <input type="range" value={scale} min="0" max="1000" onChange={e => {
            const normalized = Number(e.target.value)
            setScale(normalized);
          }} />
        </div>

      </div>

      <div className="flex flex-col gap-1">
        <label>Select a reaction: </label>

        <div className="grid grid-cols-3 lg:grid-cols-6 md:grid-cols-4 gap-1">
          {Object.entries(reactionsMap).map(([key, value]) => {
            return (
              <button key={key} className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded" onClick={() => {
                console.log('change reaction to', key)
                setOverlayNumber(Number(key))
              }}>{typeof value === 'string' ? value : value.title}</button>
            )
          })}
        </div>

      </div>

      <div id="gifContainer">
        {finalResult &&
          <Image id="gif" src={finalResult} alt="chimp will be displayed here" unoptimized height={300} width={300} />
        }
        {!finalResult && 'CHIMPLOADING...'}
      </div>

      <div>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={downloadGif} >Download GIF</button>
      </div>

      <div>
        Made with ❤️ by <a href="https://linktr.ee/alexkueth">Alex !CHIMP 🐒</a>
      </div>

    </div>

  );
}
