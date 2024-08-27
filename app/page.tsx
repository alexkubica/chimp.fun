'use client';
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import GIF from "gif.js";

export default function Home() {
  const [gifNumber, setGifNumber] = useState(2956);
  const [overlayNumber, setOverlayNumber] = useState(1);

  const gifUrl = `https://r3bel-gifs-prod.s3.us-east-2.amazonaws.com/chimpers-main-portrait/${gifNumber}.gif`;

  async function downloadGif() {
      const container = document.getElementById('gif');

      // Ensure the GIF image is fully loaded before capturing
      const gifImage = document.getElementById('gif');
      if (!gifImage.complete) {
          await new Promise(resolve => gifImage.onload = resolve);
      }

      html2canvas(container).then(async canvas => {

              document.body.appendChild(canvas)


          const workerBlob = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js')
              .then(response => {
                  if (!response.ok) throw new Error("Network response was not OK");
                  return response.blob();
              });

          const gif = new GIF({
              workers: 4,
              workerScript: URL.createObjectURL(workerBlob),
              quality: 10,
              width: container.clientWidth,
              height: container.clientHeight
          });



          gif.addFrame(canvas, { delay: 200 });

          gif.on('finished', function (blob) {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = 'image.gif';
              link.click();
          });

          gif.render();
      });
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

      {/* <h2>Download Result</h2>
      <div>
          <button onClick={downloadGif}>Download as GIF</button>
      </div> */}

      <div id="gifContainer">
          <Image id="gif" src={gifUrl} alt="chimp will be displayed here" height={400} width={400}/>
          <Image id="overlayContainer" src={`/reactions/${overlayNumber}.png`} alt="overlay will be displayed here" height={150} width={150} />
      </div>
    </div>

  );
}
