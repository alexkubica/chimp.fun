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
    setCurrentIndex(Math.floor(Math.random() * banners.length));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4 bg-gray-50">
      <h1 className="text-3xl md:text-5xl font-bold mb-4 mt-6 text-center">
        CHIMP.FUN Banner Maker
      </h1>
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
      <div className="flex flex-col items-center w-full max-w-2xl">
        <div className="relative flex items-center justify-center w-full h-64 md:h-96 bg-white rounded-lg shadow mb-4">
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 rounded-full p-2 text-2xl"
            onClick={handlePrev}
            aria-label="Previous banner"
          >
            &#8592;
          </button>
          <div className="flex-1 flex items-center justify-center h-full">
            <Image
              src={bannerPath}
              alt={currentBanner}
              width={800}
              height={400}
              className="object-contain max-h-full max-w-full rounded"
              priority
            />
          </div>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 rounded-full p-2 text-2xl"
            onClick={handleNext}
            aria-label="Next banner"
          >
            &#8594;
          </button>
        </div>
        <button
          className="mb-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded font-bold text-lg shadow"
          onClick={handleRandom}
        >
          <span role="img" aria-label="cube" className="mr-2">
            🧊
          </span>
          Random
        </button>
      </div>
    </main>
  );
}
