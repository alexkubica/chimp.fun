"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";

export default function BannerPage() {
  // Banner sources
  const bannerSources = {
    official: [
      "Untitled_Artwork-9.png",
      "Untitled_Artwork-1.png",
      "Untitled_Artwork-2.png",
      "Untitled_Artwork-3.png",
      "Untitled_Artwork-4.png",
      "Untitled_Artwork-5.png",
      "Untitled_Artwork-6.png",
      "Untitled_Artwork-7.png",
      "Untitled_Artwork-8.png",
      "OB 5.png",
      "OB 6.png",
      "OB 7.png",
      "OB 8.png",
      "OB 9.png",
      "OB 4.png",
      "OB 10.png",
      "OB 3.PNG",
      "OB 2.PNG",
      "OB 1.JPG",
    ],
    community: [
      "CB 12.PNG",
      "CB 11.PNG",
      "CB 13.PNG",
      "CB 20.PNG",
      "CB 19.PNG",
      "CB 18.PNG",
      "CB 17.PNG",
      "CB 10.PNG",
      "CB 14.PNG",
      "CB 15.PNG",
      "CB 16.PNG",
      "CB 9.PNG",
      "CB 2.PNG",
      "CB 3.PNG",
      "CB 4.PNG",
      "CB 5.PNG",
      "CB 6.PNG",
      "CB 7.PNG",
      "CB 8.PNG",
      "CB 1.PNG",
    ],
  };

  const collections = [
    { label: "Chimpers", value: "chimpers" },
    // Future: add more collections here
  ];
  const [bannerType, setBannerType] = useState<"official" | "community">(
    Math.random() < 0.5 ? "official" : "community",
  );
  const [collection, setCollection] = useState("chimpers");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pick a random banner on load or when type changes
  useEffect(() => {
    const banners = bannerSources[bannerType];
    setCurrentIndex(Math.floor(Math.random() * banners.length));
  }, [bannerType]);

  const banners = useMemo(() => bannerSources[bannerType], [bannerType]);
  const currentBanner = banners[currentIndex];
  const bannerPath = `/chimpers-x-banners/${bannerType === "official" ? "officials" : "community"}/${currentBanner}`;

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }
  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }
  function handleRandom() {
    const types: ("official" | "community")[] = ["official", "community"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setBannerType(randomType);
    // setCurrentIndex will be handled by useEffect when bannerType changes
  }

  return (
    <main className="flex flex-col items-center justify-start p-4 bg-gray-50">
      <h1>CHIMP.FUN</h1>
      <h2>Banner Maker</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-6 w-full max-w-xl justify-center items-center">
        <div>
          <label className="block text-sm font-medium mb-1">Collection</label>
          <select
            className="border rounded px-3 py-2 w-40"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            disabled
          >
            {collections.map((col) => (
              <option key={col.value} value={col.value}>
                {col.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Banner Type</label>
          <select
            className="border rounded px-3 py-2 w-40"
            value={bannerType}
            onChange={(e) =>
              setBannerType(e.target.value as "official" | "community")
            }
          >
            <option value="official">Official</option>
            <option value="community">Community</option>
          </select>
        </div>
      </div>
      <button
        className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold text-lg shadow"
        onClick={handleRandom}
      >
        🎲 Random
      </button>
      <div className="flex flex-col items-center w-full max-w-2xl">
        <div className="relative w-full aspect-[2/1] bg-white rounded-lg shadow mb-2 overflow-hidden">
          <Image
            src={bannerPath}
            alt={currentBanner}
            fill
            className="object-contain rounded select-none"
            priority
            sizes="(max-width: 800px) 100vw, 800px"
          />
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 rounded-full p-2 text-2xl z-20"
            onClick={handlePrev}
            aria-label="Previous banner"
            style={{ pointerEvents: "auto" }}
          >
            &#8592;
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 rounded-full p-2 text-2xl z-20"
            onClick={handleNext}
            aria-label="Next banner"
            style={{ pointerEvents: "auto" }}
          >
            &#8594;
          </button>
        </div>
        {/* Row of previews under the main banner */}
        <div className="flex flex-row items-center justify-center gap-2 mb-4 w-full overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => {
            const offset = i - 3;
            const idx =
              (currentIndex + offset + banners.length) % banners.length;
            const isSelected = offset === 0;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`border-2 rounded transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? "border-yellow-500 scale-110 shadow-lg"
                    : "border-transparent opacity-80 hover:opacity-100"
                } bg-white`}
                style={{ minWidth: 64 }}
                aria-label={
                  isSelected ? "Current banner" : `Banner preview ${idx + 1}`
                }
              >
                <Image
                  src={`/chimpers-x-banners/${bannerType === "official" ? "officials" : "community"}/${banners[idx]}`}
                  alt={
                    isSelected ? "Current banner" : `Banner preview ${idx + 1}`
                  }
                  width={120}
                  height={60}
                  className="object-contain rounded"
                />
              </button>
            );
          })}
        </div>
        {/* Move credit and download here */}
        <div className="mb-2 text-sm text-gray-600">
          {bannerType === "official" ? (
            <span>
              Credit:{" "}
              <a
                href="https://chimpers.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-700"
              >
                Chimpers
              </a>
            </span>
          ) : (
            <span>
              Credit:{" "}
              <a
                href="https://x.com/rafalors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-700"
              >
                RafaSimon
              </a>
            </span>
          )}
        </div>
        <a
          href={bannerPath}
          download={currentBanner}
          className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold text-lg shadow inline-block text-center"
        >
          Download
        </a>
      </div>
    </main>
  );
}
