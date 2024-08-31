'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();
ffmpeg.on('log', ({ message }) => {
  console.log(message);
});

export default function Home() {
  const [gifNumber, setGifNumber] = useState(2956);
  const [overlayNumber, setOverlayNumber] = useState(1);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [loadedGifUrl, setLoadedGifUrl] = useState('');

  useEffect(() => {

    const loadFfmpeg = async () => {

      await ffmpeg.load();
      setFfmpegReady(true);
    }

    loadFfmpeg();
  }, [])

  const imageUrl = encodeURIComponent(`https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif`);
  const gifUrl = `/proxy?url=${imageUrl}`;

  async function downloadGif() {
    await ffmpeg.writeFile('reaction.png', await fetchFile(`/reactions/${overlayNumber}.png`));
    await ffmpeg.writeFile('input.gif', await fetchFile(gifUrl));
    await ffmpeg.exec([
      '-i', 'input.gif',
      '-i', 'reaction.png',
      '-filter_complex', '[1:v]scale=iw/4:ih/4[overlay];[0:v][overlay]overlay=320:0',
      '-f', 'gif', 'output.gif']);
    const data = await ffmpeg.readFile('output.gif');
    const url = URL.createObjectURL(new Blob([data], { type: 'image/gif' }));
    // setLoadedGifUrl(url)

    // Create a download link and trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.gif';
    a.click();

    // Clean up
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Chimpers Reactions Generator</h1>
      <div>
        <label >Chimper #(1-5555): </label>
        <input type="number" id="gifNumber" min="1" max="5555" value={gifNumber}
          onChange={(e => {
            const normalized = Number(e.target.value)
            setGifNumber(normalized);
          })} />
      </div>

      <div>
        <label>Select reaction (1-22): </label>
        <input type="number" id="overlayNumber" min="1" max="22" value={overlayNumber}
          onChange={(e => {
            const normalized = Number(e.target.value)
            setOverlayNumber(normalized);
          })}

        />
      </div>


      <div id="gifContainer">
        <Image id="gif" src={gifUrl} alt="chimp will be displayed here" height={400} width={400} />
        <Image id="overlayContainer" src={`/reactions/${overlayNumber}.png`} alt="overlay will be displayed here" height={150} width={150} />
      </div>

      <div>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={downloadGif} disabled={!ffmpegReady}>Download as GIF</button>
      </div>

      {loadedGifUrl && (
        <div>
          <h1>Result</h1>
          <Image src={loadedGifUrl} alt="generated gif" height={400} width={400} />
        </div>
      )}
    </div>

  );
}
