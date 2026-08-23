import type { ReactNode } from 'react';

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="container-prototype max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">Terakhir diperbarui: {updatedAt}</p>
      {intro ? (
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-neutral-600">{intro}</div>
      ) : null}
      <div className="mt-8 space-y-8">
        {sections.map((section, i) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-foreground">
              {i + 1}. {section.heading}
            </h2>
            <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-neutral-600">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
