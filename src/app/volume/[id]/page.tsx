import { notFound } from "next/navigation";
import { fetchBook, fetchBooks, getFileExt } from "@/lib/api";
import { BookExperience } from "@/components/BookExperience";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  try {
    const book = await fetchBook(params.id);
    return { title: `${book.title} — AirBooks`, description: book.description || `Read ${book.title} by ${book.author}` };
  } catch { return { title: "AirBooks — Volume" }; }
}

export default async function VolumePage({ params }: Props) {
  let book;
  try { book = await fetchBook(params.id); } catch { notFound(); }

  let previousId: string | null = null;
  let nextId: string | null = null;
  try {
    const response = await fetchBooks({ limit: 100 });
    const index = response.books.findIndex((item) => item.id === book.id);
    if (index > 0) previousId = response.books[index - 1].id;
    if (index >= 0 && index < response.books.length - 1) nextId = response.books[index + 1].id;
  } catch {}

  const ext = getFileExt(book.filename);
  const canRead = ["PDF", "EPUB", "TXT", "MOBI", "AZW3"].includes(ext);
  return <BookExperience book={book} ext={ext} canRead={canRead} previousId={previousId} nextId={nextId} />;
}
