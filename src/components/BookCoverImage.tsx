"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { getCoverUrl } from "@/lib/api";

export function BookCoverImage({
  bookId,
  title,
  ext,
  updatedAt,
  hasCover,
}: {
  bookId: string;
  title: string;
  ext: string;
  updatedAt?: string;
  hasCover: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showCover = hasCover && !failed;

  return (
    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col items-center justify-center shadow-lg shadow-slate-200/60 overflow-hidden relative">
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getCoverUrl(bookId, updatedAt)}
          alt={`Cover of ${title}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <FileText className="w-20 h-20 text-slate-300 mb-3" />
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
            {ext}
          </span>
        </>
      )}
    </div>
  );
}
