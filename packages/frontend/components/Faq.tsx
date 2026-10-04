const faqs = [
  ["Do I need a crypto wallet?", "Yes, to fund campaigns or receive payouts to your own wallet. As a creator you can login with your email and a wallet is created for you, funds remain yours withdraw anytime."],
  ["How are views verified?", "Views are tracked by the platform SDK and confirmed on-chain before any payout is released."],
  ["How and when do creators get paid?", "Earnings are published onchain in regular batches called epochs. Once your earnings reach the $3 minimum, you can claim them to your wallet in one transaction, then withdraw to any wallet you like."],
  ["What does it cost?", "Advertisers pay a small platform fee on spend. Creators keep what they earn, minus network gas."],
  ["Are my funds safe?", "Yes, funds go in a smart contract and remain refundable."],
  ["Which network is used?", "Arbitrum, an Ethereum L2. It keeps fees low and transactions fast, while funds stay secured by Ethereum."]
];

export default function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none justify-between text-lg font-medium [&::-webkit-details-marker]:hidden">
            {q}<span className="transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 max-w-xl text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}