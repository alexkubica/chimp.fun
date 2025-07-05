/**
 * Types and interfaces for the NFT Editor
 */

// NFT Types
export interface UserNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description?: string;
  image_url?: string;
  metadata_url?: string;
  opensea_url?: string;
  updated_at?: string;
  is_disabled?: boolean;
  is_nsfw?: boolean;
}

export interface NFTApiResponse {
  nfts: UserNFT[];
  next?: string;
  provider?: string;
  providerName?: string;
}

// Asset Types for Multi-Asset Presets
export interface AssetSettings {
  x: number;
  y: number;
  scale: number;
  imageUrl: string;
  filename: string;
  id: string; // unique identifier for the asset
}

// Multi-Asset Preset Types
export interface MultiAssetPreset {
  title: string;
  assets: AssetSettings[];
}

// Reaction Overlay Types
export type ReactionOverlayDraggableProps = {
  x: number;
  y: number;
  scale: number;
  imageUrl: string;
  containerSize?: number;
  onChange: (vals: { x: number; y: number; scale: number }) => void;
  setDragging: (dragging: boolean) => void;
  dragging: boolean;
  onDragEnd?: () => void;
  setResizing: (resizing: boolean) => void;
  resizing: boolean;
  onResizeEnd?: () => void;
  disabled?: boolean;
  assetId?: string; // for multi-asset support
};

// Multi-Asset Overlay Types
export type MultiAssetOverlayProps = {
  assets: AssetSettings[];
  containerSize?: number;
  onChange: (
    assetId: string,
    vals: { x: number; y: number; scale: number },
  ) => void;
  setDragging: (dragging: boolean) => void;
  dragging: boolean;
  onDragEnd?: () => void;
  setResizing: (resizing: boolean) => void;
  resizing: boolean;
  onResizeEnd?: () => void;
  disabled?: boolean;
};

// Editor State Types
export interface ReactionSettings {
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  overlayEnabled: boolean;
}

// Multi-Asset Settings
export interface MultiAssetSettings {
  assets: AssetSettings[];
  presetNumber: number;
  overlayEnabled: boolean;
}

export interface SelectedNFT {
  contract: string;
  tokenId: string;
  imageUrl: string;
  source?: "your-wallet" | "external-wallet";
  walletAddress?: string;
}

// Event Handler Types
export type MouseOrTouchEvent = globalThis.MouseEvent | globalThis.TouchEvent;

// Component Props Types
export interface UnifiedNFTGalleryProps {
  onSelectNFT: (contract: string, tokenId: string, imageUrl: string) => void;
  supportedCollections: Set<string>;
  nfts: UserNFT[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  providerName: string | null;
  onLoadMore: () => void;
  onLoadAll?: () => void;
  title: string;
  subtitle?: string;
  showLoadingState?: boolean;
}

export interface CollectionSelectorProps {
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  onClearWalletSelection: () => void;
}

export interface TokenIdInputProps {
  tokenId: string | number;
  tempTokenId: string | number;
  minTokenId: number;
  maxTokenId: number;
  errorMessage: string | null;
  onTokenIdChange: (tokenId: string | number) => void;
  onRandomClick: () => void;
  collectionMetadata: any;
}

export interface PresetSelectorProps {
  selectedPreset: number;
  onPresetChange: (preset: number) => void;
  onRandomPreset: () => void;
  playAnimation: boolean;
  onPlayAnimationChange: (play: boolean) => void;
  overlayEnabled: boolean;
  onOverlayEnabledChange: (enabled: boolean) => void;
  collectionName: string;
  isMultiAsset?: boolean; // indicates if this is a multi-asset preset
}

export interface ImageUploaderProps {
  onFileChange: (file: File | null) => void;
  collectionIndex: number;
  tokenId: string | number;
}

export interface PreviewPanelProps {
  loading: boolean;
  isFirstRender: boolean;
  finalResult: string | null;
  isGIF: boolean;
  playAnimation: boolean;
  staticGifFrameUrl: string | null;
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  onOverlayChange: (vals: { x: number; y: number; scale: number }) => void;
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
  resizing: boolean;
  setResizing: (resizing: boolean) => void;
  onDragEnd: () => void;
  onResizeEnd: () => void;
  onDownload: () => void;
  onCopy: () => void;
  copyStatus: string | null;
  showGifCopyModal: boolean;
  onGifCopyConfirm: () => void;
  onGifCopyCancel: () => void;
  // Multi-asset support
  multiAssetSettings?: MultiAssetSettings;
  onMultiAssetChange?: (
    assetId: string,
    vals: { x: number; y: number; scale: number },
  ) => void;
  isMultiAsset?: boolean;
}

export interface WalletBrowserProps {
  walletInput: string;
  onWalletInputChange: (input: string) => void;
  onWalletLoad: () => void;
  onPasteFromClipboard: () => void;
  isLoading: boolean;
  isResolvingENS: boolean;
  nfts: UserNFT[];
  error: string | null;
  hasMore: boolean;
  providerName: string | null;
  onLoadMore: () => void;
  onLoadAll?: () => void;
  onSelectNFT: (contract: string, tokenId: string, imageUrl: string) => void;
  supportedCollections: Set<string>;
  activeWallet: string | null;
  primaryWalletAddress?: string;
}
