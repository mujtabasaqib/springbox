"use client";
import { useEffect, useState } from "react";

const blocks = [
  { t: "Paid on-chain", c: "bg-brand-a text-ink", w: "w-56", dx: 16 },
  { t: "128 creators", c: "bg-brand-b text-white", w: "w-64", dx: -8 },
  { t: "$4.8k escrowed", c: "bg-ink text-white", w: "w-72", dx: 8 },
  { t: "Campaign live", c: "border border-line bg-surface text-ink", w: "w-80", dx: 0 },
];

export default function StackIllustration() {
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const onScroll = () => setStacked(window.scrollY > 40); // scroll distance (px) that triggers the stack
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 py-14">
      {blocks.map((b, i) => (
        <div
          key={b.t}
          style={{
            transform: stacked
              ? `translateX(${b.dx}px)`
              : `translate(${b.dx * 4}px, ${(i - 1.5) * 44}px) rotate(${i % 2 ? 5 : -5}deg)`,
            transitionDelay: `${(blocks.length - 1 - i) * 90}ms`, // bottom block lands first
          }}
          className={`flex h-16 max-w-full items-center rounded-2xl px-5 font-medium transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${b.w} ${b.c}`}
        >
          {b.t}
        </div>
      ))}
    </div>
  );
}