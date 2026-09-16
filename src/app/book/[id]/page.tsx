import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Calendar, HardDrive, Tag, User, ExternalLink } from "lucide-react";
import { fetchBook, formatSize, getDownloadUrl, getFileExt } from "@/lib/api";
import { BookCoverImage } from "@/components/BookCoverImage";
import { BookShelfActions } from "@/components/BookShelfActions";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  try {
    const book = await fetchBook(params.id);
    return { title: `${book.title} — AirBooks`, description: book.description || `Read ${book.title} by ${book.author}` };
  } catch {
    return { title: "Book — AirBooks" };
  }
}

export default async function BookPage({ params }: Props) {
  let book;
  try {
    book = await fetchBook(params.id);
  } catch {
    notFound();
  }

  const ext = getFileExt(book.filename);
  const downloadUrl = getDownloadUrl(book.id);
  const canRead = ["PDF", "EPUB", "TXT", "MOBI", "AZW3"].includes(ext);
  const uploaded = new Date(book.uploaded_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#29241f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#756c61] hover:text-[#29241f] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </Link>

        <div className="grid md:grid-cols-[280px_1fr] gap-10 lg:gap-14 items-start">
          <div className="md:sticky md:top-8">
            <div className="rounded-2xl border border-[#e1d9ce] bg-white/70 p-4 shadow-[0_18px_50px_rgba(58,45,34,.10)]">
              <BookCoverImage bookId={book.id} title={book.title} ext={ext} updatedAt={book.updated_at} hasCover={!!book.cover_message_id} />
            </div>
          </div>

          <div className="space-y-7">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.25em] text-[#9a9084] mb-3">From the AirBooks collection</div>
              <h1 className="text-3xl sm:text-5xl font-display font-semibold leading-[1.05] text-[#29241f]">{book.title}</h1>
              {book.author && <p className="mt-4 text-xl text-[#756852] flex items-center gap-2"><User className="w-5 h-5" />{book.author}</p>}
            </div>

            {book.description ? (
              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[.22em] text-[#9a9084] mb-3">About this book</h2>
                <p className="text-[#5f574e] leading-7 whitespace-pre-wrap text-[15px] sm:text-base">{book.description}</p>
              </section>
            ) : (
              <p className="text-[#8a8177] italic font-display">No description is available for this volume yet.</p>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-[#756c61] border-y border-[#e1d9ce] py-5">
              <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4" />{formatSize(book.size)}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{uploaded}</span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{ext}</span>
              {book.language && <span className="uppercase tracking-wide text-xs bg-[#eee9e1] text-[#665e55] px-2 py-1 rounded">{book.language}</span>}
            </div>

            {book.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-[#9a9084]" />
                {book.tags.map((t) => <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="text-xs px-2.5 py-1 rounded-full bg-[#eee9e1] text-[#665e55] hover:bg-[#e5ddd2] transition-colors">{t}</Link>)}
              </div>
            )}

            <BookShelfActions book={book} canRead={canRead} />

            <div className="flex flex-wrap gap-3 pt-1">
              <a href={downloadUrl} download className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8d0c5] bg-white text-[#5f574e] hover:bg-[#f5f1eb] font-medium transition-colors"><Download className="w-4 h-4" />Download</a>
              {ext === "PDF" && <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8d0c5] bg-white text-[#5f574e] hover:bg-[#f5f1eb] font-medium transition-colors"><ExternalLink className="w-4 h-4" />Open PDF</a>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
