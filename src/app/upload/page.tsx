"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  function onFileChange(f: File | null) {
    setFile(f);
    if (f && !title) {
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !API_URL) {
      setStatus("error");
      setMessage(API_URL ? "Please select a file." : "NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setMessage("Uploading to Telegram…");

    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("author", author);
    form.append("description", description);
    form.append("tags", tags);
    form.append("language", language);

    try {
      // Use XHR for upload progress
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/books/upload`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(form);
      });

      setStatus("success");
      setMessage(`Uploaded: ${result.book?.title || title}`);
      setTimeout(() => {
        if (result.book?.id) router.push(`/book/${result.book.id}`);
        else router.push("/");
      }, 1200);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Upload failed");
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-500/15 items-center justify-center mb-2">
          <Upload className="w-7 h-7 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold">Upload a book</h1>
        <p className="text-slate-400 text-sm">
          PDF, EPUB and other ebook formats. Stored on Telegram.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFileChange(f);
          }}
          className="border-2 border-dashed border-slate-700 hover:border-brand-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.epub,.mobi,.azw3,.txt,.djvu"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          <FileUp className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          {file ? (
            <p className="text-slate-200 font-medium truncate px-4">{file.name}</p>
          ) : (
            <>
              <p className="text-slate-300 font-medium">Drop a file here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, EPUB, MOBI, AZW3, TXT, DJVU</p>
            </>
          )}
        </div>

        <div className="space-y-3">
          <Field label="Title" value={title} onChange={setTitle} required />
          <Field label="Author" value={author} onChange={setAuthor} />
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50 resize-none"
              placeholder="Optional short description"
            />
          </div>
          <Field
            label="Tags (comma-separated)"
            value={tags}
            onChange={setTags}
            placeholder="fiction, science, programming"
          />
          <Field label="Language" value={language} onChange={setLanguage} placeholder="en" />
        </div>

        {status === "uploading" && (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {message} {progress > 0 && `${progress}%`}
            </p>
          </div>
        )}

        {status === "success" && (
          <p className="text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || status === "uploading"}
          className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {status === "uploading" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload book
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl bg-slate-900 border border-slate-700 px-3.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50"
      />
    </div>
  );
}
