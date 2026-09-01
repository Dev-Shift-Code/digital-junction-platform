export type EditableCard = {
  title: string;
  description: string;
  details?: string[];
};

/**
 * Parses owner-managed card copy stored as one card per line:
 * Title | Description | detail one, detail two
 * Invalid or blank lines are ignored; callers keep the genuine built-in fallback.
 */
export function parseEditableCards(value: string, fallback: EditableCard[]): EditableCard[] {
  const parsed = value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map((line): EditableCard | null => {
      const [title, description, details] = line.split("|").map(part => part.trim());
      if (!title || !description) return null;
      const card: EditableCard = { title, description };
      if (details) card.details = details.split(",").map(item => item.trim()).filter(Boolean);
      return card;
    })
    .filter((item): item is EditableCard => Boolean(item));
  return parsed.length ? parsed : fallback;
}

export function formatEditableCards(cards: EditableCard[]): string {
  return cards.map(card => [card.title, card.description, card.details?.join(", ")].filter(Boolean).join(" | ")).join("\n");
}

export function parseEditableLinks(value: string, fallback: readonly (readonly [string, string])[]): readonly (readonly [string, string])[] {
  const parsed = value.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const [label, href] = line.split("|").map(part => part.trim());
    return label && href ? ([label, href] as const) : null;
  }).filter((item): item is readonly [string, string] => Boolean(item));
  return parsed.length ? parsed : fallback;
}

export function parseEditableKeyValues(value: string, fallback: Record<string, string>): Record<string, string> {
  const entries = value.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const separator = line.indexOf("|");
    return separator > 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as const : null;
  }).filter((item): item is readonly [string, string] => Boolean(item));
  return entries.length ? Object.fromEntries(entries) : fallback;
}
