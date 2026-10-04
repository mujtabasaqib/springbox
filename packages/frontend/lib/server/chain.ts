import {
  createPublicClient,
  defineChain,
  http,
  parseAbi,
  type Address,
} from 'viem';

export const chain = defineChain({
  id: Number(process.env.CHAIN_ID),
  name: 'configured-chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL!] } },
});

export const ESCROW = process.env.ESCROW_ADDRESS as Address;

export const escrowAbi = parseAbi([
  'function publishEpoch(bytes32 root, uint256 totalAllocated)',
  'function claim(uint256 cumulativeAmount, bytes32[] proof)',
  'function createCampaign(uint256 budget) returns (uint256)',
  'function totalDeposited() view returns (uint256)',
  'function totalAllocated() view returns (uint256)',
  'function epoch() view returns (uint256)',
  'function claimed(address) view returns (uint256)',
  'event CampaignFunded(uint256 indexed campaignId, address indexed advertiser, uint256 budget)',
  'error NotOperator()',
  'error OverAllocated()',
  'error AllocationDecreased()',
  'error NothingToClaim()',
  'error BelowMinClaim()',
  'error InvalidProof()',
  'error ZeroAmount()',
]);

export const publicClient = createPublicClient({ chain, transport: http() });