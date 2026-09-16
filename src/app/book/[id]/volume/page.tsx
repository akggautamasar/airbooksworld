import { notFound } from "next/navigation";
import { fetchBook, fetchBooks, getFileExt } from "@/lib/api";
import { BookExperience } from "@/components/BookExperience";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  try {
    const book = await fetchBook(params.id);
    return {
      title: `${book.title} — AirBooks`,
      description: book.description || `Read ${book.title}${book.author ? ` by ${book.author}` : ""}`,
    };
  } catch {
    return { title: "Book — AirBooks" };
  }
}

export default async function VolumePage({ params }: Props) {
  let book;
  try {
    book = await fetchBook(params.id);
  } catch {
    notFound();
  }

  const ext = getFileExt(book.filename);
  const canRead = ["PDF", "EPUB", "TXT", "MOBI", "AZW3"].includes(ext);

  let previousId: string | null = null;
  let nextId: string | null = null;
  try {
    const response = await fetchBooks({ limit: 1000 });
    const books = response.books || [];
    const index = books.findIndex((item) => item.id === book.id);
    if (index > 0) previousId = books[index - 1].id;
    if (index >= 0 && index < books.length - 1) nextId = books[index + 1].id;
  } catch {}

  return (
    <BookExperience
      book={book}
      ext={ext}
      canRead={canRead}
      previousId={previousId}
      nextId={nextId}
    />
  );
}
