import type { Book } from "@/lib/api";

export type CuratedRecommendation = {
  title: string;
  description: string;
  curator: string;
  quote: string;
  titles: string[];
};

/**
 * Editorial presets for the public recommendations room.
 * They are intentionally title-based: only books that actually exist in the
 * AirBooks catalog are rendered. No placeholder/fake books are created.
 */
export const CURATED_RECOMMENDATIONS: CuratedRecommendation[] = [
  {
    title: "Recommended by ELON MUSK",
    description: "Science fiction, artificial intelligence, engineering and first-principles thinking.",
    curator: "ELON MUSK",
    quote: "Books are a powerful way to explore ideas beyond your own time and place.",
    titles: [
      "Life 3.0: Being Human in the Age of Artificial Intelligence",
      "Superintelligence: Paths, Dangers, Strategies",
      "Zero to One: Notes on Startups, or How to Build the Future",
      "The Hitchhiker's Guide to the Galaxy",
      "Dune",
      "Foundation",
      "The Lord of the Rings",
      "The Moon Is a Harsh Mistress",
    ],
  },
  {
    title: "Recommended by BILL GATES",
    description: "Books spanning science, history, climate, technology and the forces shaping society.",
    curator: "BILL GATES",
    quote: "The right book can change how you see a problem—and what you do about it.",
    titles: [
      "Factfulness",
      "The Code Breaker",
      "The Gene: An Intimate History",
      "How to Avoid a Climate Disaster",
      "Origin Story: A Big History of Everything",
      "Why Nations Fail",
      "The Better Angels of Our Nature",
      "The Rational Optimist",
    ],
  },
  {
    title: "Recommended by BARACK OBAMA",
    description: "Memoir, history, justice and fiction drawn from books Obama has publicly highlighted.",
    curator: "BARACK OBAMA",
    quote: "Reading is a way of stepping outside yourself and seeing the world anew.",
    titles: [
      "The Warmth of Other Suns",
      "Just Mercy",
      "A Promised Land",
      "The Fire Next Time",
      "Between the World and Me",
      "Kin",
      "The Things We Never Say",
      "Vigil",
    ],
  },
  {
    title: "Recommended by NAVAL RAVIKANT",
    description: "A compact shelf of philosophy, science, rationality and long-term thinking.",
    curator: "NAVAL RAVIKANT",
    quote: "Read what expands your model of the world.",
    titles: [
      "The Beginning of Infinity",
      "Sapiens: A Brief History of Humankind",
      "The Rational Optimist",
      "Poor Charlie's Almanack",
      "Reality Is Not What It Seems",
      "Seven Brief Lessons on Physics",
      "Siddhartha",
      "Meditations",
    ],
  },
  {
    title: "OPRAH'S BOOK CLUB",
    description: "Literary landmarks selected from Oprah's long-running book club.",
    curator: "OPRAH WINFREY",
    quote: "Books have the power to open doors you didn't know were there.",
    titles: [
      "East of Eden",
      "One Hundred Years of Solitude",
      "Anna Karenina",
      "The Good Earth",
      "Sula",
      "A Fine Balance",
      "The Corrections",
      "The Road",
    ],
  },
  {
    title: "TIMELESS CLASSICS",
    description: "Enduring novels that continue to shape the shared bookshelf.",
    curator: "AIRBOOKS EDITORIAL",
    quote: "A classic is a book that keeps finding new readers.",
    titles: [
      "1984",
      "To Kill a Mockingbird",
      "The Great Gatsby",
      "Pride and Prejudice",
      "The Hobbit",
      "Crime and Punishment",
      "Jane Eyre",
      "Wuthering Heights",
      "The Catcher in the Rye",
      "Moby-Dick",
      "War and Peace",
      "Anna Karenina",
    ],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatches(bookTitle: string, wanted: string) {
  const a = normalize(bookTitle);
  const b = normalize(wanted);
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

async function findTitle(wanted: string): Promise<Book | null> {
  try {
    const { fetchBooks } = await import("@/lib/api");
    const response = await fetchBooks({ q: wanted, limit: 20, offset: 0 });
    const exact = response.books.find((book) => titleMatches(book.title, wanted));
    return exact || null;
  } catch {
    return null;
  }
}

export async function loadCuratedRecommendations() {
  const result = await Promise.all(
    CURATED_RECOMMENDATIONS.map(async (collection) => {
      const found = await mapWithConcurrency(collection.titles, 4, findTitle);
      const books = found.filter((book): book is Book => Boolean(book));
      return {
        title: collection.title,
        description: collection.description,
        curator: collection.curator,
        quote: collection.quote,
        books: Array.from(new Map(books.map((book) => [book.id, book])).values()),
      };
    }),
  );
  return result.filter((collection) => collection.books.length > 0);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
  const output: R[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return output;
}
