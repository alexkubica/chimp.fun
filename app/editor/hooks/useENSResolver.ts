import { useState, useCallback } from "react";
import { looksLikeENS } from "../utils";

/**
 * Custom hook for resolving ENS names to Ethereum addresses
 */
export function useENSResolver() {
  const [isResolvingENS, setIsResolvingENS] = useState(false);

  /**
   * Resolves an ENS name to an Ethereum address using free APIs
   */
  const resolveENS = useCallback(
    async (ensName: string): Promise<string | null> => {
      if (!looksLikeENS(ensName)) {
        return null;
      }

      try {
        setIsResolvingENS(true);
        
        // Try primary ENS resolver API
        const response = await fetch(
          `https://api.ensideas.com/ens/resolve/${ensName}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.address || null;
        }

        // Fallback: try alternative ENS API
        const fallbackResponse = await fetch(
          `https://api.web3.bio/profile/${ensName}`,
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.address || null;
        }

        return null;
      } catch (error) {
        console.error("ENS resolution failed:", error);
        return null;
      } finally {
        setIsResolvingENS(false);
      }
    },
    [],
  );

  return {
    resolveENS,
    isResolvingENS,
  };
}