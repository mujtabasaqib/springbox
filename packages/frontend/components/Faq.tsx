const faqs = [
  ["Do I need a crypto wallet?", "Yes. You connect a wallet to fund campaigns or receive payouts. Any major wallet works."],
  ["How are views verified?", "Views are tracked by the platform SDK and confirmed on-chain before any payout is released."],
  ["When do creators get paid?", "Verified earnings can be claimed to your wallet at any time. Nothing is held back."],
  ["What does it cost?", "Advertisers pay a small platform fee on spend. Creators keep what they earn, minus network gas."],
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