//export default function WalletCard() {
//  return (
  //  <div className="mt-auto rounded-2xl border border-line bg-canvas p-4 text-sm">
   //   <p className="text-muted">Connected wallet</p>
   //   <p className="mt-1 font-mono font-medium">0x7a3f…9c21</p>
   //   <p className="mt-2 text-muted">Balance <span className="font-mono text-ink">2.41 ETH</span></p>
   // </div>
  //);
//}
"use client";
import { useWallets } from "@privy-io/react-auth";
import { pickWallet } from "@/lib/chain";

export default function WalletCard() {
  const { wallets } = useWallets();
  const address = pickWallet(wallets)?.address;
  return (
    <div className="mt-auto rounded-2xl border border-line bg-canvas p-4 text-sm">
      <p className="text-muted">Connected wallet</p>
      <button
        title={address}
        onClick={() => address && navigator.clipboard.writeText(address)}
        className="mt-1 font-mono font-medium"
      >
        {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "No wallet yet"}
      </button>
    </div>
  );
}