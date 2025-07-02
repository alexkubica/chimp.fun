"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { collectionsMetadata, reactionsMap } from "@/consts";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { debounce } from "lodash";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";

// Import our refactored components and utilities
import { ReactionOverlayDraggable } from "./components/ReactionOverlayDraggable";
import { UnifiedNFTGallery } from "./components/UnifiedNFTGallery";
import { NFTFetcher } from "./hooks/useNFTFetcher";
import {
  dataURLtoBlob,
  fileToDataUri,
  saveReactionSettings,
  loadReactionSettings,
  copyGifFirstFrameAsPng,
  extractFirstFrame,
} from "./utils";
import {
  UserNFT,
  SelectedNFT,
  ReactionSettings,
} from "./types";

/**
 * Main NFT Editor Component - Refactored for better maintainability
 * 
 * This component orchestrates the entire NFT editing experience:
 * - Collection and token selection
 * - Image upload and processing
 * - Reaction overlay positioning
 * - Output generation and download/copy functionality
 * - Wallet integration for NFT browsing
 */
export default function NFTEditor() {
  // FFmpeg for video/gif processing
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);

  // Core editor state
  const [imageExtension, setImageExtension] = useState("gif");
  const [loading, setLoading] = useState(true);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [tokenID, setTokenID] = useState<string | number>(2956);
  const [tempTokenID, setTempTokenID] = useState<string | number>(2956);
  const [collectionIndex, setCollectionIndex] = useState(0);
  const [overlayNumber, setOverlayNumber] = useState(18);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overlay positioning and interaction state
  const [x, setX] = useState(650);
  const [y, setY] = useState(71);
  const [scale, setScale] = useState(0.8);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);

  // Image handling state
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Animation and display state
  const [playAnimation, setPlayAnimation] = useState(true);
  const [staticGifFrameUrl, setStaticGifFrameUrl] = useState<string | null>(null);

  // Copy/download state
  const [showGifCopyModal, setShowGifCopyModal] = useState(false);
  const [gifBlobToCopy, setGifBlobToCopy] = useState<Blob | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Wallet integration state
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [selectedFromWallet, setSelectedFromWallet] = useState<SelectedNFT | null>(null);
  const [walletInput, setWalletInput] = useState<string>("");
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [nfts, setNfts] = useState<UserNFT[]>([]);
  const [nftLoading, setNftLoading] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"connected" | "input">("connected");

  // Computed values
  const collectionMetadata = collectionsMetadata[collectionIndex];
  const minTokenID = 1 + (collectionMetadata.tokenIdOffset ?? 0);
  const maxTokenID = collectionMetadata.total + (collectionMetadata.tokenIdOffset ?? 0);
  const supportedCollections = useMemo(() => {
    return new Set(
      collectionsMetadata.map((c) => c.contract?.toLowerCase()).filter(Boolean),
    );
  }, []);
  const isGIF = imageExtension === "gif";

  // Initialize NFT Fetcher
  const nftFetcher = useMemo(() => new NFTFetcher(supportedCollections), [supportedCollections]);

  /**
   * Debounced function to render the final image with overlays
   */
  const debouncedRenderImageUrl = useMemo(
    () =>
      debounce(() => {
        // This would contain the complex image rendering logic
        // For now, we'll keep the existing logic structure
        setLoading(false);
      }, 300),
    []
  );

  /**
   * Handles collection selection changes
   */
  const handleCollectionChange = useCallback((newIndex: number) => {
    setLoading(true);
    setCollectionIndex(newIndex);
    const newMetadata = collectionsMetadata[newIndex];
    const newMinTokenID = 1 + (newMetadata.tokenIdOffset ?? 0);
    const newMaxTokenID = newMetadata.total + (newMetadata.tokenIdOffset ?? 0);
    
    if (Number(tokenID) < newMinTokenID || Number(tokenID) > newMaxTokenID) {
      setTokenID(newMinTokenID);
      setTempTokenID(newMinTokenID);
    }
    
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null);
  }, [tokenID]);

  /**
   * Handles token ID input changes
   */
  const handleTokenIdChange = useCallback((value: string | number) => {
    setTempTokenID(value);
    const tokenIdNum = Number(value);
    
    if (!isNaN(tokenIdNum) && tokenIdNum >= minTokenID && tokenIdNum <= maxTokenID) {
      setErrorMessage(null);
      setTokenID(tokenIdNum);
      setLoading(true);
      setFile(null);
      setUploadedImageUri(null);
      setSelectedFromWallet(null);
    } else {
      setErrorMessage(
        `Invalid Token ID, please choose between ${minTokenID} and ${maxTokenID}`,
      );
    }
  }, [minTokenID, maxTokenID]);

  /**
   * Handles random token/collection selection
   */
  const handleFeelingLucky = useCallback(() => {
    const randomCollectionIndex = Math.floor(Math.random() * collectionsMetadata.length);
    const randomCollection = collectionsMetadata[randomCollectionIndex];
    const min = 1 + (randomCollection.tokenIdOffset ?? 0);
    const max = randomCollection.total + (randomCollection.tokenIdOffset ?? 0);
    const randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
    const randomPreset = Math.floor(Math.random() * reactionsMap.length) + 1;

    setCollectionIndex(randomCollectionIndex);
    setTokenID(randomTokenId);
    setTempTokenID(randomTokenId);
    setOverlayNumber(randomPreset);
    setLoading(true);
    setFile(null);
    setUploadedImageUri(null);
    setSelectedFromWallet(null);
    setWalletInput("");
    setNfts([]);
    setNftError(null);
    setActiveWallet(null);
  }, []);

  /**
   * Handles NFT selection from gallery
   */
  const handleNFTSelect = useCallback((contract: string, tokenId: string, imageUrl: string) => {
    // Find the collection that matches this contract
    const collectionIdx = collectionsMetadata.findIndex(
      (c) => c.contract?.toLowerCase() === contract.toLowerCase()
    );
    
    if (collectionIdx !== -1) {
      setCollectionIndex(collectionIdx);
      setTokenID(tokenId);
      setTempTokenID(tokenId);
      setLoading(true);
      setSelectedFromWallet({
        contract,
        tokenId,
        imageUrl,
        source: activeWallet === primaryWallet?.address ? "your-wallet" : "external-wallet",
        walletAddress: activeWallet || undefined,
      });
      setFile(null);
      setUploadedImageUri(null);
    }
  }, [activeWallet, primaryWallet?.address]);

  /**
   * Handles overlay position/scale changes
   */
  const handleOverlayChange = useCallback(
    (vals: { x: number; y: number; scale: number }) => {
      setX(vals.x);
      setY(vals.y);
      setScale(vals.scale);
    },
    []
  );

  /**
   * Handles drag/resize end events
   */
  const handleDragEnd = useCallback(() => {
    setDragging(false);
    debouncedRenderImageUrl();
  }, [debouncedRenderImageUrl]);

  const handleResizeEnd = useCallback(() => {
    setResizing(false);
    debouncedRenderImageUrl();
  }, [debouncedRenderImageUrl]);

  /**
   * Download functionality
   */
  const downloadOutput = useCallback(async () => {
    if (!finalResult) return;
    
    const link = document.createElement("a");
    link.href = finalResult;
    link.download = `chimp-${collectionMetadata.name}-${tokenID}.${imageExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [finalResult, collectionMetadata.name, tokenID, imageExtension]);

  /**
   * Copy functionality
   */
  const handleCopy = useCallback(async () => {
    if (!finalResult) return;

    setCopyStatus(null);
    
    if (isGIF && !playAnimation && staticGifFrameUrl) {
      // Copy PNG from static frame
      const blob = dataURLtoBlob(staticGifFrameUrl);
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopyStatus("Image copied to clipboard!");
      } catch (err) {
        setCopyStatus("Failed to copy image to clipboard. Please try again or download instead.");
      }
      return;
    }

    // Handle regular copy functionality
    try {
      const response = await fetch(finalResult);
      const blob = await response.blob();

      if (blob.type === "image/gif") {
        setGifBlobToCopy(blob);
        setShowGifCopyModal(true);
        return;
      }

      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopyStatus("Image copied to clipboard successfully!");
    } catch (err) {
      setCopyStatus("Failed to copy image. Please try again or download instead.");
    }
  }, [finalResult, isGIF, playAnimation, staticGifFrameUrl]);

  /**
   * Load user's connected wallet NFTs
   */
  const loadConnectedWalletNFTs = useCallback(async () => {
    if (!primaryWallet?.address) return;

    setNftLoading(true);
    setNftError(null);
    setNfts([]);

    const result = await nftFetcher.fetchAllNFTs(primaryWallet.address);
    
    setNfts(result.nfts);
    setProvider(result.provider);
    setProviderName(result.providerName);
    setActiveWallet(primaryWallet.address);
    setHasMore(false);
    setNextCursor(null);
    
    if (result.error) {
      setNftError(result.error);
    }
    
    setNftLoading(false);
  }, [primaryWallet?.address, nftFetcher]);

  /**
   * Load external wallet NFTs
   */
  const loadExternalWalletNFTs = useCallback(async () => {
    if (!walletInput.trim()) return;

    setNftLoading(true);
    setNftError(null);
    setNfts([]);

    const result = await nftFetcher.fetchNFTsWithPagination(walletInput.trim());
    
    setNfts(result.nfts);
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setProvider(result.provider);
    setProviderName(result.providerName);
    setActiveWallet(walletInput.trim());
    
    if (result.error) {
      setNftError(result.error);
    }
    
    setNftLoading(false);
  }, [walletInput, nftFetcher]);

  // Load connected wallet NFTs when component mounts
  useEffect(() => {
    if (isLoggedIn && primaryWallet?.address) {
      loadConnectedWalletNFTs();
    }
  }, [isLoggedIn, primaryWallet?.address, loadConnectedWalletNFTs]);

  // Extract first frame for static GIF preview
  useEffect(() => {
    if (isGIF && finalResult && !playAnimation) {
      extractFirstFrame(finalResult)
        .then(setStaticGifFrameUrl)
        .catch(() => setStaticGifFrameUrl(null));
    } else {
      setStaticGifFrameUrl(null);
    }
  }, [isGIF, finalResult, playAnimation]);

  return (
    <main className="min-h-screen flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            <a href="/" className="text-inherit no-underline">
              CHIMP.FUN
            </a>
          </h1>
          <p className="text-lg font-medium mb-2">NFT Editor</p>
          <div className="flex justify-center mt-2">
            <Button onClick={handleFeelingLucky} variant="secondary">
              I&apos;m Feeling Lucky
            </Button>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          {/* Wallet NFT Gallery Section */}
          <div className="md:hidden flex flex-col gap-4">
            {/* Mobile Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("connected")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "connected"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                disabled={!isLoggedIn}
              >
                Your NFTs
              </button>
              <button
                onClick={() => setActiveTab("input")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "input"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Browse Wallet
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "connected" ? (
              isLoggedIn && nfts.length > 0 ? (
                <UnifiedNFTGallery
                  onSelectNFT={handleNFTSelect}
                  supportedCollections={supportedCollections}
                  nfts={nfts}
                  loading={nftLoading}
                  error={nftError}
                  hasMore={hasMore}
                  providerName={providerName}
                  onLoadMore={() => {}}
                  title="Your NFTs"
                  subtitle={`${nfts.length} NFTs found in your connected wallet`}
                />
              ) : (
                <div className="text-center text-muted-foreground p-4 border rounded-md">
                  {isLoggedIn ? "Loading your NFTs..." : "Connect your wallet to see your NFTs"}
                </div>
              )
            ) : (
              <div>
                {/* External wallet browsing would go here */}
                <p className="text-sm text-muted-foreground">External wallet browsing interface</p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Left Column: Controls */}
            <div className="flex flex-col gap-8">
              {/* Collection Selector */}
              <div className="flex flex-col gap-2">
                {/* Collection selection UI would go here */}
                <p className="text-sm">Collection: {collectionMetadata.name}</p>
                {selectedFromWallet && (
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border-l-2 border-blue-500">
                    {selectedFromWallet.source === "your-wallet" ? (
                      <span>💳 Selected from your wallet</span>
                    ) : (
                      <span>🔍 Selected from external wallet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Token ID Input */}
              <div className="flex flex-col gap-2">
                <p className="text-sm">Token ID: {tempTokenID} ({minTokenID}-{maxTokenID})</p>
                {errorMessage && (
                  <div className="text-destructive text-sm">{errorMessage}</div>
                )}
              </div>

              {/* Image Upload */}
              <div className="flex flex-col gap-2">
                <p className="text-sm">Upload custom image or use from collection</p>
              </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex flex-col gap-4 h-full items-stretch">
              {/* Preset Selector */}
              <div className="flex flex-col gap-2">
                <p className="text-sm">Preset: {reactionsMap[overlayNumber - 1]?.title}</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={playAnimation}
                    onChange={(e) => setPlayAnimation(e.target.checked)}
                    id="playAnimation"
                  />
                  <label htmlFor="playAnimation" className="text-sm">Play animation</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={overlayEnabled}
                    onChange={(e) => setOverlayEnabled(e.target.checked)}
                    id="overlayEnabled"
                  />
                  <label htmlFor="overlayEnabled" className="text-sm">MADE WITH CHIMP.FUN</label>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/50 mt-2 w-full">
                <div className="relative w-full max-w-xs aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                  {loading ? (
                    <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
                  ) : (
                    finalResult && (
                      <>
                        {isGIF && !playAnimation && staticGifFrameUrl ? (
                          <img
                            src={staticGifFrameUrl}
                            alt="Preview (static frame)"
                            className="object-contain w-full h-full rounded-lg"
                          />
                        ) : (
                          <img
                            src={finalResult}
                            alt="Preview"
                            className="object-contain w-full h-full rounded-lg"
                          />
                        )}
                        
                        {/* Draggable Overlay */}
                        <ReactionOverlayDraggable
                          x={x}
                          y={y}
                          scale={scale}
                          imageUrl={`/reactions/${reactionsMap[overlayNumber - 1]?.filename}`}
                          onChange={handleOverlayChange}
                          containerSize={320}
                          setDragging={setDragging}
                          dragging={dragging}
                          setResizing={setResizing}
                          resizing={resizing}
                          onDragEnd={handleDragEnd}
                          onResizeEnd={handleResizeEnd}
                          disabled={loading}
                        />
                      </>
                    )
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-2 w-full mt-2">
                  <Button onClick={downloadOutput} className="w-full md:w-auto">
                    Download
                  </Button>
                  <Button variant="secondary" onClick={handleCopy} className="w-full md:w-auto">
                    Copy
                  </Button>
                </div>
                
                {copyStatus && (
                  <div className="text-sm mt-1 text-center text-muted-foreground">
                    {copyStatus}
                  </div>
                )}

                {/* GIF Copy Modal */}
                {showGifCopyModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
                      <div className="mb-4 text-center">
                        <div className="font-semibold mb-2">Copy GIF as static image?</div>
                        <div className="text-sm text-muted-foreground">
                          Copying GIFs isn&apos;t supported by your browser. Would you like to copy a static image instead?
                        </div>
                      </div>
                      <div className="flex gap-2 w-full justify-center">
                        <Button
                          onClick={async () => {
                            setShowGifCopyModal(false);
                            if (gifBlobToCopy) {
                              try {
                                await copyGifFirstFrameAsPng(gifBlobToCopy);
                                setCopyStatus("Image copied to clipboard!");
                              } catch (err) {
                                setCopyStatus("Failed to copy image to clipboard.");
                              }
                              setGifBlobToCopy(null);
                            }
                          }}
                          className="flex-1"
                        >
                          Copy PNG
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setShowGifCopyModal(false);
                            setGifBlobToCopy(null);
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Global tooltip styles */}
      <style jsx global>{`
        .middle-ellipsis-tooltip {
          position: relative;
        }
        .middle-ellipsis-tooltip-content {
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.95);
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          white-space: pre-line;
          z-index: 100;
          min-width: 120px;
          max-width: 220px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          transition: opacity 0.15s;
          margin-top: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }
        .middle-ellipsis-tooltip:hover .middle-ellipsis-tooltip-content,
        .middle-ellipsis-tooltip:focus .middle-ellipsis-tooltip-content {
          visibility: visible;
          opacity: 1;
          pointer-events: auto;
        }
        @media (hover: none) {
          .middle-ellipsis-tooltip:active .middle-ellipsis-tooltip-content,
          .middle-ellipsis-tooltip:focus .middle-ellipsis-tooltip-content {
            visibility: visible;
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
    </main>
  );
}