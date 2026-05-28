import { Hero } from "@/components/Hero";

interface LegalPageProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: { heading: string; content: string[] }[];
}

export function LegalPage({ title, subtitle, lastUpdated, sections }: LegalPageProps) {
  return (
    <>
      <Hero eyebrow="Legal" title={title} subtitle={subtitle} trustLine={`Last updated: ${lastUpdated}`} />
      <section className="py-16">
        <div className="container-narrow prose-article">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2>{s.heading}</h2>
              {s.content.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
