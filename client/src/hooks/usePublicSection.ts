import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export type PublicPage = "home" | "shop" | "services" | "work" | "about" | "contact" | "footer";

export type PublicSectionFallback = {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  isVisible?: boolean;
};

export type ResolvedPublicSection = Required<Pick<PublicSectionFallback, "isVisible">> & Omit<PublicSectionFallback, "isVisible">;

/**
 * Resolves an owner-saved public section against the page's built-in DJDC copy.
 * Draft copy is never returned to visitors: an unpublished override only carries
 * its visibility state, allowing the matching section to be hidden safely.
 */
export function usePublicSection(page: PublicPage, section: string, fallback: PublicSectionFallback): ResolvedPublicSection {
  const input = useMemo(() => ({ page }), [page]);
  const content = trpc.portal.publicContent.list.useQuery(input);
  const saved = content.data?.find(item => item.section === section);

  return {
    eyebrow: saved?.eyebrow ?? fallback.eyebrow,
    title: saved?.title ?? fallback.title,
    body: saved?.body ?? fallback.body,
    imageUrl: saved?.imageUrl ?? fallback.imageUrl,
    ctaLabel: saved?.ctaLabel ?? fallback.ctaLabel,
    ctaHref: saved?.ctaHref ?? fallback.ctaHref,
    isVisible: saved?.isPublished ?? fallback.isVisible ?? true,
  };
}
