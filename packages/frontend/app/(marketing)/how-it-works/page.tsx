import Section from "@/components/Section";
import HowSteps from "@/components/HowSteps";
import Faq from "@/components/Faq";

export default function HowItWorks() {
  return (
    <>
      <Section>
        <h1 className="display text-6xl md:text-8xl">How it works</h1>
        <p className="mt-6 max-w-md text-lg text-muted">Pick your side. Either way, it takes four steps.</p>
        <HowSteps />
      </Section>

      <Section>
        <h2 className="display text-5xl md:text-6xl">Questions, answered</h2>
        <div className="mt-10 max-w-3xl"><Faq /></div>
      </Section>
    </>
  );
}