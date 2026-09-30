//components/PrivyProviderWrapper.tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { chain } from "@/lib/chain";

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
  appearance: { theme: "light", accentColor: "#D6F24B" },
  defaultChain: chain,
  supportedChains: [chain],
  //embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
}}
    >
      {children}
    </PrivyProvider>
  );
}