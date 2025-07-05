"use client";

import { UnifiedNFTGallery } from "./UnifiedNFTGallery";
import { WalletBrowser } from "./WalletBrowser";
import { WalletBrowserProps } from "../types";

interface WalletTabsProps extends WalletBrowserProps {
  activeTab: "connected" | "input";
  onTabChange: (tab: "connected" | "input") => void;
  isLoggedIn: boolean;
  isMobile?: boolean;
}

export function WalletTabs({
  activeTab,
  onTabChange,
  isLoggedIn,
  isMobile = false,
  nfts,
  error,
  hasMore,
  providerName,
  onLoadMore,
  onLoadAll,
  onSelectNFT,
  supportedCollections,
  activeWallet,
  primaryWalletAddress,
  isLoading,
  ...walletBrowserProps
}: WalletTabsProps) {
  
  const tabId = isMobile ? "Mobile" : "";
  
  return (
    <div className={isMobile ? "md:hidden flex flex-col gap-4" : "hidden md:block"}>
      {/* Tab Headers */}
      <div className="flex border-b">
        <button
          onClick={() => onTabChange("connected")}
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
          onClick={() => onTabChange("input")}
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
      <div className={!isMobile ? "mt-4" : ""}>
        {activeTab === "connected" ? (
          isLoggedIn ? (
            (nfts.length > 0 || isLoading || error) &&
            activeWallet === primaryWalletAddress ? (
              <UnifiedNFTGallery
                onSelectNFT={onSelectNFT}
                supportedCollections={supportedCollections}
                nfts={nfts}
                loading={isLoading}
                error={error}
                hasMore={hasMore}
                providerName={providerName}
                onLoadMore={() => {
                  // For connected wallet, we auto-fetch all NFTs, so no manual loading needed
                  // This shouldn't be called since hasMore is set to false for user wallet
                }}
                title="Your NFTs"
                subtitle={
                  nfts.length > 0
                    ? `${nfts.length} NFTs found in your connected wallet`
                    : undefined
                }
                showLoadingState={true}
              />
            ) : (
              <div className="text-center text-muted-foreground p-4 border rounded-md">
                Loading your NFTs...
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground p-4 border rounded-md">
              Connect your wallet to see your NFTs
            </div>
          )
        ) : (
          <WalletBrowser
            {...walletBrowserProps}
            nfts={nfts}
            error={error}
            hasMore={hasMore}
            providerName={providerName}
            onLoadMore={onLoadMore}
            onLoadAll={onLoadAll}
            onSelectNFT={onSelectNFT}
            supportedCollections={supportedCollections}
            activeWallet={activeWallet}
            primaryWalletAddress={primaryWalletAddress}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}