"use client";

import { Suspense, useEffect, useCallback, useMemo } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { reactionsMap, collectionsMetadata } from "@/consts";

// Import components
import {
  EditorHeader,
  WalletTabs,
  CollectionSelector,
  TokenIdInput,
  ImageUploader,
  PresetSelector,
  PreviewPanel,
} from "./components";

// Import hooks
import { useEditorState, useNFTManager, useFFmpeg, useImageActions } from "./hooks";

// Import utils
import { extractFirstFrame } from "./utils";

function EditorPage() {
  // Dynamic SDK hooks for wallet context
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Custom hooks
  const editorState = useEditorState();
  const nftManager = useNFTManager();
  const ffmpeg = useFFmpeg();
  const imageActions = useImageActions();

  // Get image URL based on collection and token
  useEffect(() => {
    (async () => {
      if (
        isNaN(Number(editorState.tokenID)) ||
        Number(editorState.tokenID) < editorState.minTokenID ||
        Number(editorState.tokenID) > editorState.maxTokenID
      ) {
        return;
      }

             if (editorState.collectionMetadata?.gifOverride) {
         const gifUrl = editorState.collectionMetadata.gifOverride(editorState.tokenID.toString());
         editorState.setImageUrl(`/proxy?url=${encodeURIComponent(gifUrl)}`);
         return;
       }

      try {
                 const response = await fetch(
           `/fetchNFTImage?tokenId=${editorState.tokenID}&contract=${editorState.collectionMetadata?.contract}`,
         );
        if (!response.ok) {
          throw new Error(`Error fetching image URL: ${response.statusText}`);
        }
        const { imageUrl } = await response.json();
        if (imageUrl.includes("ipfs")) {
          editorState.setImageUrl(imageUrl);
        } else {
          editorState.setImageUrl(`/proxy?url=${imageUrl}`);
        }
      } catch (error) {
        console.error("Failed to fetch image:", error);
      }
    })();
  }, [editorState.collectionIndex, editorState.collectionMetadata, editorState.maxTokenID, editorState.minTokenID, editorState.tokenID]);

  // Encoded image URL for processing
  const encodedImageUrl = useMemo(() => {
    if (!editorState.imageUrl) {
      return null;
    }
    return editorState.imageUrl;
  }, [editorState.imageUrl]);

  // Load user's own NFTs when they sign in and switch to connected tab
  useEffect(() => {
    if (isLoggedIn && primaryWallet?.address) {
      editorState.setActiveTab("connected");
      if (!nftManager.activeWallet || nftManager.activeWallet !== primaryWallet.address) {
        editorState.setWalletInput("");
        nftManager.fetchAllUserNFTs(primaryWallet.address);
      }
    }
  }, [isLoggedIn, primaryWallet?.address, nftManager.fetchAllUserNFTs]);

  // Switch tab logic
  useEffect(() => {
    if (!isLoggedIn && editorState.activeTab === "connected") {
      editorState.setActiveTab("input");
    }
  }, [isLoggedIn, editorState.activeTab]);

  // Parse URL parameters on mount
  useEffect(() => {
    editorState.parseUrlParams();
  }, []);

                 // Process image with FFmpeg when parameters change
   useEffect(() => {
     if (
       ffmpeg &&
       ffmpeg.ffmpegReady &&
       ffmpeg.debouncedProcessImage &&
       (encodedImageUrl || editorState.uploadedImageUri) &&
       !editorState.dragging &&
       !editorState.resizing
     ) {
       const processImageFn = ffmpeg.debouncedProcessImage;
       if (processImageFn) {
         // @ts-ignore - Function existence is checked above
         processImageFn(
         encodedImageUrl || "",
         editorState.file,
         editorState.overlayNumber,
         editorState.x,
         editorState.y,
         editorState.scale,
         editorState.overlayEnabled,
         editorState.watermarkStyle,
         editorState.watermarkPaddingX,
         editorState.watermarkPaddingY,
         editorState.watermarkScale,
                ).then((result) => {
           if (result) {
             editorState.setFinalResult(result);
           }
           editorState.setLoading(false);
         }).catch((error) => {
           console.error("FFmpeg processing error:", error);
           editorState.setLoading(false);
         });
       }
     }
   }, [
     ffmpeg,
     encodedImageUrl,
     editorState.uploadedImageUri,
     editorState.file,
     editorState.overlayNumber,
     editorState.x,
     editorState.y,
     editorState.scale,
     editorState.overlayEnabled,
     editorState.watermarkStyle,
     editorState.watermarkPaddingX,
     editorState.watermarkPaddingY,
     editorState.watermarkScale,
     editorState.dragging,
     editorState.resizing,
   ]);

  // Extract static GIF frame when needed
  useEffect(() => {
    if (editorState.isGIF && editorState.finalResult && !editorState.playAnimation) {
      extractFirstFrame(editorState.finalResult).then((staticFrame) => {
        if (staticFrame) {
          editorState.setStaticGifFrameUrl(staticFrame);
        }
      });
    } else {
      editorState.setStaticGifFrameUrl(null);
    }
  }, [editorState.isGIF, editorState.finalResult, editorState.playAnimation]);

  // Reset overlay position when preset changes
  useEffect(() => {
    const overlaySettings = reactionsMap[editorState.overlayNumber - 1];
    if (overlaySettings) {
      editorState.setX(overlaySettings.x);
      editorState.setY(overlaySettings.y);
      editorState.setScale(overlaySettings.scale);
    }
  }, [editorState.overlayNumber]);

  // Handle "Feeling Lucky" - randomize everything
  const handleFeelingLucky = useCallback(() => {
    const randomCollection = Math.floor(Math.random() * collectionsMetadata.length);
    const randomReaction = Math.floor(Math.random() * reactionsMap.length) + 1;
    
    editorState.handleCollectionChange(randomCollection);
    editorState.handlePresetChange(randomReaction);
    
    // Random token ID
    const metadata = collectionsMetadata[randomCollection];
    const min = 1 + (metadata.tokenIdOffset ?? 0);
    const max = metadata.total + (metadata.tokenIdOffset ?? 0);
    const randomTokenId = Math.floor(Math.random() * (max - min + 1)) + min;
    editorState.handleTokenIdChange(randomTokenId);
    
    editorState.clearWalletSelection();
    editorState.setWalletInput("");
    nftManager.resetNFTs();
  }, [editorState, nftManager]);

  // Handle NFT selection from wallet
  const handleNFTSelect = useCallback(
    (contract: string, tokenId: string, imageUrl: string) => {
      // Find the collection index for this contract
      const collectionIdx = collectionsMetadata.findIndex(
        (c) => c.contract?.toLowerCase() === contract.toLowerCase(),
      );

      if (collectionIdx >= 0) {
        editorState.setLoading(true);
        editorState.handleCollectionChange(collectionIdx);
        editorState.handleTokenIdChange(tokenId);
        editorState.setFile(null);
        editorState.setUploadedImageUri(null);

        // Determine source and wallet address
        const isYourWallet = nftManager.activeWallet === primaryWallet?.address;
        editorState.setSelectedFromWallet({
          contract,
          tokenId,
          imageUrl,
          source: isYourWallet ? "your-wallet" : "external-wallet",
          walletAddress: nftManager.activeWallet || "",
        });
      }
    },
    [nftManager.activeWallet, primaryWallet?.address, editorState],
  );

  // Wallet browser handlers
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        editorState.setWalletInput(text.trim());
      }
    } catch (err) {
      console.error("Failed to read from clipboard:", err);
    }
  }, [editorState]);

  const loadWallet = useCallback(() => {
    if (editorState.walletInput.trim()) {
      nftManager.fetchWalletNFTs(editorState.walletInput.trim());
    }
  }, [editorState.walletInput, nftManager]);

  const loadAllFromExternalWallet = useCallback(() => {
    if (editorState.walletInput.trim()) {
      nftManager.loadAllNFTs();
    }
  }, [editorState.walletInput, nftManager]);

  // Preview panel handlers
  const handleOverlayChange = useCallback(
    ({ x, y, scale }: { x: number; y: number; scale: number }) => {
      editorState.setX(x);
      editorState.setY(y);
      editorState.setScale(scale);
    },
    [editorState],
  );

  const handleDragEnd = useCallback(() => {
    editorState.setDragging(false);
    editorState.debouncedUpdateUrlParams();
  }, [editorState]);

  const handleResizeEnd = useCallback(() => {
    editorState.setResizing(false);
    editorState.debouncedUpdateUrlParams();
  }, [editorState]);

     // Download handler
   const handleDownload = useCallback(() => {
     if (imageActions?.downloadImage && ffmpeg?.imageExtension) {
       imageActions.downloadImage(
         editorState.finalResult,
         editorState.isGIF,
         editorState.playAnimation,
         editorState.staticGifFrameUrl,
         editorState.collectionMetadata.name,
         editorState.tokenID,
         editorState.overlayNumber,
         ffmpeg.imageExtension,
       );
     }
   }, [
     imageActions,
     editorState.finalResult,
     editorState.isGIF,
     editorState.playAnimation,
     editorState.staticGifFrameUrl,
     editorState.collectionMetadata.name,
     editorState.tokenID,
     editorState.overlayNumber,
     ffmpeg?.imageExtension,
   ]);

     // Copy handler
   const handleCopy = useCallback(() => {
     if (imageActions?.copyToClipboard) {
       imageActions.copyToClipboard(
         editorState.finalResult,
         editorState.isGIF,
         editorState.playAnimation,
         editorState.staticGifFrameUrl,
       );
     }
   }, [
     imageActions,
     editorState.finalResult,
     editorState.isGIF,
     editorState.playAnimation,
     editorState.staticGifFrameUrl,
   ]);

  // Wallet browser props
  const walletBrowserProps = {
    walletInput: editorState.walletInput,
    onWalletInputChange: editorState.setWalletInput,
    onWalletLoad: loadWallet,
    onPasteFromClipboard: handlePasteFromClipboard,
    isLoading: nftManager.nftLoading,
    isResolvingENS: nftManager.isResolvingENS,
    nfts: nftManager.nfts,
    error: nftManager.nftError,
    hasMore: nftManager.hasMore,
    providerName: nftManager.providerName,
    onLoadMore: nftManager.loadMoreNFTs,
    onLoadAll: loadAllFromExternalWallet,
    onSelectNFT: handleNFTSelect,
    supportedCollections: nftManager.supportedCollections,
    activeWallet: nftManager.activeWallet,
    primaryWalletAddress: primaryWallet?.address,
  };

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-2 py-4">
        <div className="w-full max-w-2xl mx-auto">
          <EditorHeader onFeelingLucky={handleFeelingLucky} />
          
          <section className="flex flex-col gap-4">
            {/* NFT Gallery - Mobile */}
            <WalletTabs
              {...walletBrowserProps}
              activeTab={editorState.activeTab}
              onTabChange={editorState.setActiveTab}
              isLoggedIn={isLoggedIn}
              isMobile={true}
            />

            <div className="grid md:grid-cols-2 gap-4">
              {/* First column: collection, token id, image, etc. */}
              <div className="flex flex-col gap-8">
                {/* NFT Gallery - Desktop */}
                <WalletTabs
                  {...walletBrowserProps}
                  activeTab={editorState.activeTab}
                  onTabChange={editorState.setActiveTab}
                  isLoggedIn={isLoggedIn}
                  isMobile={false}
                />

                {/* Collection Selector */}
                <CollectionSelector
                  selectedIndex={editorState.collectionIndex}
                  onSelectionChange={editorState.handleCollectionChange}
                  onClearWalletSelection={editorState.clearWalletSelection}
                />

                {/* Wallet selection indicator */}
                {editorState.selectedFromWallet && (
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded border-l-2 border-blue-500">
                    {editorState.selectedFromWallet.source === "your-wallet" ? (
                      <span>💳 Selected from your wallet</span>
                    ) : (
                      <span>
                        🔍 Selected from{" "}
                        {editorState.selectedFromWallet.walletAddress
                          ? `${editorState.selectedFromWallet.walletAddress.slice(0, 6)}...${editorState.selectedFromWallet.walletAddress.slice(-4)}`
                          : "external wallet"}
                      </span>
                    )}
                  </div>
                )}

                {/* Token ID Input */}
                <TokenIdInput
                  tokenId={editorState.tokenID}
                  tempTokenId={editorState.tempTokenID}
                  minTokenId={editorState.minTokenID}
                  maxTokenId={editorState.maxTokenID}
                  errorMessage={editorState.errorMessage}
                  onTokenIdChange={editorState.handleTokenIdChange}
                  onRandomClick={editorState.handleRandomTokenId}
                  collectionMetadata={editorState.collectionMetadata}
                />

                {/* Image Uploader */}
                <ImageUploader
                  onFileChange={editorState.setFile}
                  collectionIndex={editorState.collectionIndex}
                  tokenId={editorState.tokenID}
                />
              </div>

              {/* Second column: preview, download, copy */}
              <div className="flex flex-col gap-4 h-full items-stretch">
                {/* Preset Selector */}
                <PresetSelector
                  selectedPreset={editorState.overlayNumber}
                  onPresetChange={editorState.handlePresetChange}
                  onRandomPreset={() => {
                    const randomReaction = Math.floor(Math.random() * reactionsMap.length) + 1;
                    editorState.handlePresetChange(randomReaction);
                  }}
                  playAnimation={editorState.playAnimation}
                  onPlayAnimationChange={editorState.setPlayAnimation}
                  overlayEnabled={editorState.overlayEnabled}
                  onOverlayEnabledChange={editorState.setOverlayEnabled}
                  collectionName={editorState.collectionMetadata.name}
                />

                {/* Preview Panel */}
                <PreviewPanel
                  loading={editorState.loading}
                  isFirstRender={editorState.isFirstRender}
                  finalResult={editorState.finalResult}
                  isGIF={editorState.isGIF}
                  playAnimation={editorState.playAnimation}
                  staticGifFrameUrl={editorState.staticGifFrameUrl}
                  x={editorState.x}
                  y={editorState.y}
                  scale={editorState.scale}
                  overlayNumber={editorState.overlayNumber}
                  onOverlayChange={handleOverlayChange}
                  dragging={editorState.dragging}
                  setDragging={editorState.setDragging}
                  resizing={editorState.resizing}
                  setResizing={editorState.setResizing}
                  onDragEnd={handleDragEnd}
                  onResizeEnd={handleResizeEnd}
                                   onDownload={handleDownload}
                 onCopy={handleCopy}
                 copyStatus={imageActions?.copyStatus}
                 showGifCopyModal={imageActions?.showGifCopyModal}
                 onGifCopyConfirm={imageActions?.handleGifCopyModalConfirm}
                 onGifCopyCancel={imageActions?.handleGifCopyModalCancel}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Tooltip CSS for .middle-ellipsis-tooltip */}
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
    </>
  );
}

// Suspense wrapper to handle useSearchParams during SSG
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPage />
    </Suspense>
  );
}
