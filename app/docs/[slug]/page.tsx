import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DOC_SECTIONS, findSection, isDocSlug } from "../_lib/nav";
import { CONTENT_REGISTRY } from "../_content/registry";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DOC_SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const section = findSection(slug);
  if (!section) return { title: "Docs — IndexPilot" };
  return {
    title: `${section.title} — IndexPilot docs`,
    description: `${section.title} — IndexPilot documentation.`,
  };
}

export default async function DocSlugPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isDocSlug(slug)) notFound();

  const section = findSection(slug);
  if (!section) notFound();

  const Content = CONTENT_REGISTRY[slug];

  const index = DOC_SECTIONS.findIndex((s) => s.slug === slug);
  const next = DOC_SECTIONS[index + 1];
  const prev = index > 0 ? DOC_SECTIONS[index - 1] : null;

  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)] mb-4">
        IndexPilot documentation
      </p>
      <h1
        className="text-[38px] sm:text-[48px] leading-[1.05] tracking-tight text-[color:var(--color-fg)] mb-10"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {section.title}
      </h1>

      <div className="docs-prose">
        <Content />
      </div>

      <nav
        aria-label="Page navigation"
        className="mt-16 pt-8 border-t border-[color:var(--color-border)] flex items-center justify-between gap-4"
      >
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="group text-left max-w-[45%]"
          >
            <span className="block text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
              Previous
            </span>
            <span className="block mt-1 text-sm text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-fg)] transition-colors">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="group text-right max-w-[45%]"
          >
            <span className="block text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
              Next
            </span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors">
              {next.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
