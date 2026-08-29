import Link from "next/link";
import { BookX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <BookX className="w-16 h-16 text-slate-600 mx-auto" />
      <h1 className="text-2xl font-bold">Book not found</h1>
      <p className="text-slate-400">This book may have been removed from the library.</p>
      <Link
        href="/"
        className="inline-flex px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
      >
        Back to library
      </Link>
    </div>
  );
}
