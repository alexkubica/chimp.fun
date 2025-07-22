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

// Watchlist Types
export interface WatchedWallet {
  address: string;
  label?: string;
  addedAt: number;
  isEns?: boolean;
  ensName?: string;
}

export interface WalletNFTData {
  wallet: WatchedWallet;
  nfts: UserNFT[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  provider: string | null;
  providerName: string | null;
  lastFetched?: number;
}

export interface PaginatedNFTResults {
  nfts: UserNFT[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  sources: {
    [walletAddress: string]: {
      count: number;
      label: string;
    };
  };
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
};

// Editor State Types
export interface ReactionSettings {
  x: number;
  y: number;
  scale: number;
  overlayNumber: number;
  overlayEnabled: boolean;
}

export interface SelectedNFT {
  contract: string;
  tokenId: string;
  imageUrl: string;
  source?: "your-wallet" | "external-wallet" | "watchlist";
  walletAddress?: string;
  walletLabel?: string;
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

export interface WatchlistManagementProps {
  currentWallet: string | null;
  onWalletSelect: (address: string) => void;
  onAddWallet: (address: string, label?: string, ensName?: string) => void;
  onRemoveWallet: (address: string) => void;
  onUpdateLabel: (address: string, label: string) => void;
}

export interface WatchlistGalleryProps {
  watchedWallets: WatchedWallet[];
  walletData: Map<string, WalletNFTData>;
  onSelectNFT: (
    contract: string,
    tokenId: string,
    imageUrl: string,
    walletAddress: string,
  ) => void;
  onLoadWallet: (address: string) => void;
  onLoadMore: (address: string) => void;
  supportedCollections: Set<string>;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
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
  onAddToWatchlist?: (
    address: string,
    label?: string,
    ensName?: string,
  ) => void;
  isInWatchlist?: boolean;
}

// Watchlist Hook Types
export interface UseWatchlistResult {
  watchedWallets: WatchedWallet[];
  walletData: Map<string, WalletNFTData>;
  addWallet: (
    address: string,
    label?: string,
    ensName?: string,
  ) => Promise<boolean>;
  removeWallet: (address: string) => boolean;
  updateWalletLabel: (address: string, label: string) => boolean;
  loadWalletNFTs: (address: string) => Promise<void>;
  loadMoreNFTs: (address: string) => Promise<void>;
  clearWatchlist: () => void;
  refreshWallet: (address: string) => Promise<void>;
  isInWatchlist: (address: string) => boolean;
}

// Pagination Types
export interface PaginationConfig {
  itemsPerPage: number;
  currentPage: number;
  totalItems: number;
  showControls: boolean;
}

export interface NFTPaginationProps {
  nfts: UserNFT[];
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectNFT: (contract: string, tokenId: string, imageUrl: string) => void;
  supportedCollections: Set<string>;
  loading?: boolean;
  sources?: {
    [walletAddress: string]: {
      count: number;
      label: string;
    };
  };
}
