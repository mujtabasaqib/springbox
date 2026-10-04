import { parseEventLogs } from 'viem';
import { ESCROW, escrowAbi, publicClient } from './chain';

/** Returns the on-chain campaign id, or throws with a readable reason. */
export async function verifyFunding(txHash: `0x${string}`, wallet: string, expectedUnits: bigint) {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    throw new Error('transaction not found or not mined yet');
  }
  if (receipt.status !== 'success') throw new Error('transaction reverted');

  const match = parseEventLogs({ abi: escrowAbi, eventName: 'CampaignFunded', logs: receipt.logs })
    .filter((l) => l.address.toLowerCase() === ESCROW.toLowerCase())
    .find(
      (l) =>
        l.args.advertiser.toLowerCase() === wallet.toLowerCase() &&
        l.args.budget === expectedUnits
    );
  if (!match) throw new Error('no matching CampaignFunded event for this campaign and wallet');
  return match.args.campaignId;
}