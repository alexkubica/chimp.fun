import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from "@ffmpeg/ffmpeg";

export interface EditorState {
  // Image and processing state
  imageExtension: string;
  loading: boolean;
  tokenID: string | number;
  tempTokenID: string | number;
  isFirstRender: boolean;
  collectionIndex: number;
  
  // Overlay positioning
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  
  // FFmpeg and file handling
  ffmpegReady: boolean;
  ffmpegLoading: boolean;
  file: File | null;
  uploadedImageUri: string | null;
  finalResult: string | null;
  imageUrl: string | null;
  
  // UI state
  overlayEnabled: boolean;
  errorMessage: string | null;
  dragging: boolean;
  resizing: boolean;
  showGifCopyModal: boolean;
  gifBlobToCopy: Blob | null;
  copyStatus: string | null;
  playAnimation: boolean;
  staticGifFrameUrl: string | null;
  
  // Custom speech bubble
  customSpeechBubbleText: string;
  customSpeechBubbleDataUrl: string | null;
  
  // Watermark
  watermarkStyle: "oneline" | "twoline";
  
  // Wallet selection
  selectedFromWallet: {
    contract: string;
    tokenId: string;
    imageUrl: string;
    source?: "your-wallet" | "external-wallet";
    walletAddress?: string;
  } | null;
}

export const useEditorState = () => {
  const ffmpegRef = useRef(new FFmpeg());
  const ffmpegLoadPromise = useRef<Promise<boolean> | null>(null);
  
  const [state, setState] = useState<EditorState>({
    imageExtension: "gif",
    loading: true,
    tokenID: 2956,
    tempTokenID: 2956,
    isFirstRender: true,
    collectionIndex: 0,
    x: 650,
    y: 71,
    scale: 0.8,
    overlayNumber: 18,
    ffmpegReady: false,
    ffmpegLoading: false,
    file: null,
    uploadedImageUri: null,
    finalResult: null,
    imageUrl: null,
    overlayEnabled: true,
    errorMessage: null,
    dragging: false,
    resizing: false,
    showGifCopyModal: false,
    gifBlobToCopy: null,
    copyStatus: null,
    playAnimation: true,
    staticGifFrameUrl: null,
    customSpeechBubbleText: "!CHIMP",
    customSpeechBubbleDataUrl: null,
    watermarkStyle: "twoline",
    selectedFromWallet: null,
  });
  
  const updateState = useCallback((updates: Partial<EditorState>) => {
    setState((prev: EditorState) => ({ ...prev, ...updates }));
  }, []);
  
  const setLoading = useCallback((loading: boolean) => {
    setState((prev: EditorState) => ({ ...prev, loading }));
  }, []);
  
  const setPosition = useCallback((x: number, y: number, scale: number) => {
    setState((prev: EditorState) => ({ ...prev, x, y, scale }));
  }, []);
  
  const setOverlaySettings = useCallback((overlayNumber: number, x: number, y: number, scale: number) => {
    setState((prev: EditorState) => ({ ...prev, overlayNumber, x, y, scale }));
  }, []);
  
  const resetFile = useCallback(() => {
    setState((prev: EditorState) => ({ 
      ...prev, 
      file: null, 
      uploadedImageUri: null, 
      selectedFromWallet: null 
    }));
  }, []);
  
  return {
    state,
    updateState,
    setLoading,
    setPosition,
    setOverlaySettings,
    resetFile,
    ffmpegRef,
    ffmpegLoadPromise,
  };
};