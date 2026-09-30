const tones = {
  canvas: "",
  a: "mx-3 my-3 rounded-[2.5rem] bg-brand-a",
  b: "mx-3 my-3 rounded-[2.5rem] bg-brand-b text-white",
};

export default function Section({ tone = "canvas", id, children }: { tone?: keyof typeof tones; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={tones[tone]}>
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">{children}</div>
    </section>
  );
}