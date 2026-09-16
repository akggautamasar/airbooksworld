"use client";

import { useEffect, useState } from "react";

const WORDS = ["library", "sanctuary", "collection", "archive"];

export function TypedTitle() {
  const [word, setWord] = useState(WORDS[0]);

  useEffect(() => {
    let wordIndex = 0;
    let charIndex = WORDS[0].length;
    let deleting = false;

    const timer = window.setInterval(() => {
      const current = WORDS[wordIndex];
      if (!deleting) {
        charIndex += 1;
        setWord(current.slice(0, charIndex));
        if (charIndex >= current.length) deleting = true;
      } else {
        charIndex -= 1;
        setWord(current.slice(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % WORDS.length;
        }
      }
    }, 180);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 aria-label="Welcome to my library" className="font-display italic font-light text-[clamp(3.55rem,7vw,7rem)] leading-[0.9] tracking-[-0.055em] text-[#241f19]">
      <span>Welcome to my </span>
      <span>{word}</span>
      <span aria-hidden className="inline-block w-[2px] h-[0.72em] bg-[#241f19] ml-1 align-[-0.08em] animate-caret" />
    </h1>
  );
}
