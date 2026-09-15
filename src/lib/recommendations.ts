import type { Book } from "@/lib/api";

export const RECOMMENDATION_PREFIX = "__airbooks_rec_title__:";
export const RECOMMENDATION_DESCRIPTION_PREFIX = "__airbooks_rec_desc__:";
export const RECOMMENDATION_CURATOR_PREFIX = "__airbooks_rec_curator__:";
export const RECOMMENDATION_QUOTE_PREFIX = "__airbooks_rec_quote__:";

export type RecommendationCollection = {
  title: string;
  description: string;
  curator: string;
  quote: string;
  books: Book[];
};

const encoded = (value: string) => encodeURIComponent(value.trim());

function metadataValue(tags: string[], prefix: string, title: string) {
  const marker = `${prefix}${encoded(title)}|`;
  const tag = tags.find((item) => item.startsWith(marker));
  return tag ? decodeURIComponent(tag.slice(marker.length)).trim() : "";
}

export function recommendationTitles(book: Book) {
  return (book.tags || [])
    .filter((tag) => tag.startsWith(RECOMMENDATION_PREFIX))
    .map((tag) => tag.slice(RECOMMENDATION_PREFIX.length).trim())
    .filter(Boolean);
}

export function recommendationTitle(book: Book) {
  return recommendationTitles(book)[0] || "";
}

export function isRecommendationTag(tag: string) {
  return (
    tag.startsWith(RECOMMENDATION_PREFIX) ||
    tag.startsWith(RECOMMENDATION_DESCRIPTION_PREFIX) ||
    tag.startsWith(RECOMMENDATION_CURATOR_PREFIX) ||
    tag.startsWith(RECOMMENDATION_QUOTE_PREFIX)
  );
}

export function getRecommendations(books: Book[]): RecommendationCollection[] {
  const map = new Map<string, RecommendationCollection>();

  for (const book of books) {
    for (const title of recommendationTitles(book)) {
      const existing = map.get(title);
      if (existing) {
        existing.books.push(book);
        continue;
      }
      map.set(title, {
        title,
        description: metadataValue(book.tags || [], RECOMMENDATION_DESCRIPTION_PREFIX, title) || "Books chosen to inspire a brighter, more curious life.",
        curator: metadataValue(book.tags || [], RECOMMENDATION_CURATOR_PREFIX, title),
        quote: metadataValue(book.tags || [], RECOMMENDATION_QUOTE_PREFIX, title),
        books: [book],
      });
    }
  }
  return Array.from(map.values());
}

export function recommendationTags(input: { title: string; description?: string; curator?: string; quote?: string }) {
  const title = input.title.trim();
  const tags = [RECOMMENDATION_PREFIX + title];
  if (input.description?.trim()) tags.push(`${RECOMMENDATION_DESCRIPTION_PREFIX}${encoded(title)}|${encoded(input.description)}`);
  if (input.curator?.trim()) tags.push(`${RECOMMENDATION_CURATOR_PREFIX}${encoded(title)}|${encoded(input.curator)}`);
  if (input.quote?.trim()) tags.push(`${RECOMMENDATION_QUOTE_PREFIX}${encoded(title)}|${encoded(input.quote)}`);
  return tags;
}

export function isCollectionTag(tag: string, title: string) {
  const encodedTitle = encoded(title);
  return tag === RECOMMENDATION_PREFIX + title ||
    tag.startsWith(`${RECOMMENDATION_DESCRIPTION_PREFIX}${encodedTitle}|`) ||
    tag.startsWith(`${RECOMMENDATION_CURATOR_PREFIX}${encodedTitle}|`) ||
    tag.startsWith(`${RECOMMENDATION_QUOTE_PREFIX}${encodedTitle}|`);
}

export function withoutRecommendationTags(tags: string[]) {
  return tags.filter((tag) => !isRecommendationTag(tag));
}

export function withoutCollectionTags(tags: string[], title: string) {
  return tags.filter((tag) => !isCollectionTag(tag, title));
}
