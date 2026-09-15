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

function valueAfter(tags: string[], prefix: string) {
  const tag = tags.find((item) => item.startsWith(prefix));
  return tag ? tag.slice(prefix.length).trim() : "";
}

export function recommendationTitle(book: Book) {
  return valueAfter(book.tags || [], RECOMMENDATION_PREFIX);
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
    const title = recommendationTitle(book);
    if (!title) continue;

    const existing = map.get(title);
    if (existing) {
      existing.books.push(book);
      continue;
    }

    map.set(title, {
      title,
      description:
        valueAfter(book.tags || [], RECOMMENDATION_DESCRIPTION_PREFIX) ||
        "Books chosen to inspire a brighter, more curious life.",
      curator: valueAfter(book.tags || [], RECOMMENDATION_CURATOR_PREFIX),
      quote: valueAfter(book.tags || [], RECOMMENDATION_QUOTE_PREFIX),
      books: [book],
    });
  }

  return Array.from(map.values());
}

export function recommendationTags(input: {
  title: string;
  description?: string;
  curator?: string;
  quote?: string;
}) {
  const tags = [RECOMMENDATION_PREFIX + input.title.trim()];
  if (input.description?.trim()) tags.push(RECOMMENDATION_DESCRIPTION_PREFIX + input.description.trim());
  if (input.curator?.trim()) tags.push(RECOMMENDATION_CURATOR_PREFIX + input.curator.trim());
  if (input.quote?.trim()) tags.push(RECOMMENDATION_QUOTE_PREFIX + input.quote.trim());
  return tags;
}

export function withoutRecommendationTags(tags: string[]) {
  return tags.filter((tag) => !isRecommendationTag(tag));
}

export function withoutCollectionTags(tags: string[], title: string) {
  const titleTag = RECOMMENDATION_PREFIX + title;
  return tags.filter((tag) => {
    if (tag === titleTag) return false;
    return !(
      tag.startsWith(RECOMMENDATION_DESCRIPTION_PREFIX) ||
      tag.startsWith(RECOMMENDATION_CURATOR_PREFIX) ||
      tag.startsWith(RECOMMENDATION_QUOTE_PREFIX)
    );
  });
}
