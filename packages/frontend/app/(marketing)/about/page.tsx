import Section from "@/components/Section";

const problems = [
  ["Fees", "Middlemen keep a big cut of every ad dollar.", "Fees are fixed and visible. The rest goes to creators."],
  ["Opacity", "Advertisers rarely see where their money goes.", "Every payment is recorded on-chain for anyone to check."],
  ["Fraud", "Fake clicks and bot traffic drain budgets.", "Payouts release only after views are verified."],
];
const values = [
  ["Clear", "Numbers you can check, not promises."],
  ["Fair", "The people who create the value get paid for it."],
  ["Simple", "Web3 under the hood, plain language on top."],
];
const team = [["MS", "Founder"]];

export default function About() {
  return (
    <>
      <Section>
        <h1 className="display max-w-4xl text-6xl md:text-8xl">Advertising should be fair to everyone in it.</h1>
        <p className="mt-8 max-w-xl text-lg text-muted">
          Ad platforms are built to keep money and data in the middle. We built one that pays creators directly and shows brands exactly what they get.
        </p>
      </Section>

      <Section>
        <h2 className="display text-5xl md:text-6xl">What&apos;s broken, and how we fix it</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {problems.map(([t, p, s]) => (
            <div key={t} className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-8">
              <h3 className="display text-4xl">{t}</h3>
              <p className="text-muted">{p}</p>
              <p className="mt-auto rounded-2xl bg-canvas p-4 font-medium">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="a">
        <h2 className="display text-5xl md:text-6xl">What we stand for</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {values.map(([t, d]) => (
            <div key={t}>
              <p className="display text-6xl">{t}</p>
              <p className="mt-3 max-w-xs font-medium">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="b">
        <h2 className="display text-5xl md:text-6xl">The team</h2>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {team.map(([n, r]) => (
            <div key={n} className="rounded-3xl bg-white/10 p-6">
              <span className="display grid size-16 place-items-center rounded-2xl bg-brand-a text-2xl text-ink">{n[0]}</span>
              <p className="mt-6 font-semibold">{n}</p>
              <p className="text-sm text-white/60">{r}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
