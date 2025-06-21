"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export default function ClientSdkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log("farcaster sdk ready");
    sdk.actions.ready();
  }, []);

  return (
    <DynamicContextProvider
      settings={{
        environmentId: "e2851a4e-3a07-4193-9f75-47aff69ca413",
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <DynamicWidget />
      {children}
    </DynamicContextProvider>
  );
}
