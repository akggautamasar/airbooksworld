"use client";

import { useEffect, useState } from "react";

const FULL = "Welcome to my library";

export function TypedTitle() {
  const [text, setText] = useState("");

  useEffect(() => {
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setText(FULL.slice(0, i));
      if (i >= FULL.length) window.clearInterval(timer);
    }, 70);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 aria-label={FULL} className="font-display italic font-light text-[clamp(3.25rem,8vw,7rem)] leading-[0.92] tracking-[-0.045em] text-[#24211d]">
      <span aria-hidden>{text}</span>
      <span aria-hidden className="inline-block w-px h-[0.72em] bg-[#24211d]/60 ml-2 align-middle animate-caret" />
    </h1>
  );
}
