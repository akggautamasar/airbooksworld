"use client";

import { useRef, useState } from "react";
import type { CSSProperties, SyntheticEvent } from "react";
import type { Book } from "@/lib/api";
import { getCoverUrl } from "@/lib/api";

type Props = { book: Book; onOpen: (book: Book, rect: { left:number; top:number; width:number; height:number }) => void };

type SpineVariant = { light:string; mid:string; dark:string; ink:string };

const SPINE_VARIANTS: SpineVariant[] = [
  {light:"#c2d1c6",mid:"#7d9b85",dark:"#30483a",ink:"#f5f1e8"},{light:"#d7dfd7",mid:"#6c7570",dark:"#303733",ink:"#f8f5ed"},
  {light:"#7796b4",mid:"#2f4c6a",dark:"#192837",ink:"#f4f1ea"},{light:"#dedad2",mid:"#9c3b2f",dark:"#5b211a",ink:"#241f19"},
  {light:"#526355",mid:"#315036",dark:"#17281b",ink:"#f5f0e3"},{light:"#eec0b6",mid:"#bf897c",dark:"#673f37",ink:"#fff8f2"},
  {light:"#3f60a0",mid:"#1d3557",dark:"#101f38",ink:"#fed049"},{light:"#b35647",mid:"#551c14",dark:"#2b0d0a",ink:"#faf6ed"},
  {light:"#4aa3a1",mid:"#277977",dark:"#124b4a",ink:"#f3fbf7"},{light:"#8f222d",mid:"#4e0f15",dark:"#25070b",ink:"#f5ebd4"},
  {light:"#b89c79",mid:"#78532f",dark:"#3a2515",ink:"#f8f1e4"},{light:"#357bb2",mid:"#245779",dark:"#102f45",ink:"#fff"},
  {light:"#a78d2b",mid:"#665414",dark:"#332b09",ink:"#f8f0d7"},{light:"#5b7785",mid:"#334954",dark:"#17272e",ink:"#f2f7fa"},
  {light:"#e87f68",mid:"#a34530",dark:"#572218",ink:"#fff8f5"},{light:"#21242b",mid:"#8b3a2b",dark:"#24100d",ink:"#df9b52"},
];

function hash(value:string){let n=17;for(let i=0;i<value.length;i++)n=(n*31+value.charCodeAt(i))|0;return Math.abs(n)}
function physicalSize(book:Book,seed:number){const pages=book.page_count??book.pages??null;if(typeof pages==="number"&&pages>0)return{width:Math.round(Math.max(20,Math.min(58,pages*.055+((seed%9)-4)*.7))),height:pages>420?252:pages<260?228:242};return{width:26+(seed%27),height:228+((seed>>4)%27)}}
function readable(hex:string){const v=hex.replace("#","");const r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);return(.2126*r+.7152*g+.0722*b)/255>.62?"#241f19":"#faf7ef"}
function rich(hex:string){const v=hex.replace("#","");const r=parseInt(v.slice(0,2),16)/255,g=parseInt(v.slice(2,4),16)/255,b=parseInt(v.slice(4,6),16)/255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);if(h<0)h+=360}return`hsl(${Math.round(h)} ${Math.round(Math.max(52,Math.min(82,s*125)))}% ${Math.round(Math.max(25,Math.min(68,l*100)))}%)`}

export function BookSpine({book,onOpen}:Props){
  const ref=useRef<HTMLButtonElement>(null); const [hovered,setHovered]=useState(false); const [failed,setFailed]=useState(false); const [coverColor,setCoverColor]=useState<string|null>(null); const [coverInk,setCoverInk]=useState<string|null>(null);
  const cover=book.cover_message_id&&!failed?getCoverUrl(book.id,book.updated_at):null; const seed=hash(book.id||book.title); const variant=SPINE_VARIANTS[seed%SPINE_VARIANTS.length]; const {width,height}=physicalSize(book,seed); const depth=4+(seed%6); const lean=-1.8+((seed>>3)%7)*.6; const ink=coverInk||variant.ink; const spine=coverColor||variant.mid;
  function sample(e:SyntheticEvent<HTMLImageElement>){try{const img=e.currentTarget,c=document.createElement("canvas");c.width=c.height=24;const ctx=c.getContext("2d");if(!ctx)return;ctx.drawImage(img,0,0,24,24);const p=ctx.getImageData(0,0,24,24).data;let r=0,g=0,b=0,n=0;for(let i=0;i<p.length;i+=4){if(p[i+3]<140)continue;const mx=Math.max(p[i],p[i+1],p[i+2]),mn=Math.min(p[i],p[i+1],p[i+2]);if(mx>238&&mx-mn<12)continue;r+=p[i];g+=p[i+1];b+=p[i+2];n++}if(n){const hex=`#${[r,g,b].map(x=>Math.round(x/n).toString(16).padStart(2,"0")).join("")}`;setCoverColor(rich(hex));setCoverInk(readable(hex))}}catch{/* Cross-origin covers simply keep their deterministic physical treatment. */}}
  function open(){const r=ref.current?.getBoundingClientRect();if(r)onOpen(book,{left:r.left,top:r.top,width:r.width,height:r.height})}
  const style={"--book-w":`${width}px`,"--book-h":`${height}px`,"--book-depth":`${depth}px`,"--book-rotation":`${lean}deg`} as CSSProperties;
  const titleSize=width>=44?10.5:width>=32?9.5:8;
  return <button ref={ref} type="button" aria-label={`Open ${book.title}`} className="book-spine-hit carollia-book-hit shrink-0 self-end relative" style={style} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocus={()=>setHovered(true)} onBlur={()=>setHovered(false)} onClick={open}>
    <span className="carollia-book-body book-spine-body absolute inset-0 block" style={{transform:`translateZ(${hovered?96:0}px) translateY(${hovered?-26:0}px) rotateY(${hovered?0:0}deg) rotateZ(${lean}deg)`,zIndex:hovered?40:1}}>
      <span className={`carollia-book-cover book-spine-cover relative block h-full w-full overflow-hidden rounded-[1px] ${book.tags.some(t=>t.toLowerCase().includes("hardcover"))?"finish-cloth":"finish-matte"}`} style={{background:`linear-gradient(105deg,rgba(255,255,255,.20),transparent 18%,rgba(0,0,0,.16) 84%,rgba(0,0,0,.36)),linear-gradient(90deg,${variant.light},${spine} 45%,${variant.dark})`}}>
        {cover&&<img src={cover} alt="" crossOrigin="anonymous" onLoad={sample} onError={()=>setFailed(true)} className="absolute inset-0 h-full w-full object-cover opacity-[.24] mix-blend-multiply" />}
        <span className="absolute inset-0 z-20 spine-cylindrical-sheen pointer-events-none"/><span className="spine-crease-left z-20"/><span className="spine-crease-right z-20"/>
        <span className="absolute left-[3px] right-[3px] top-[16%] z-20 h-[2px] bg-black/25"/><span className="absolute left-[3px] right-[3px] top-[20%] z-20 h-[2px] bg-black/25"/><span className="absolute left-[3px] right-[3px] bottom-[18%] z-20 h-[2px] bg-black/25"/>
        <span className="absolute left-1/2 top-2 z-30 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] uppercase tracking-[.12em]" style={{color:ink,opacity:.85}}>{width>=44?(book.author?.split(" ").pop()||""):""}</span>
        <span className="absolute inset-y-4 left-1/2 z-30 -translate-x-1/2 overflow-hidden whitespace-nowrap font-display font-semibold" style={{color:ink,fontSize:`${titleSize}px`,letterSpacing:'.12em',writingMode:'vertical-rl',textOrientation:'mixed',transform:'translateX(-50%) rotate(180deg)',textShadow:ink==="#faf7ef"?"0 1px 2px rgba(0,0,0,.7)":"0 1px 1px rgba(255,255,255,.28)"}}>{book.title}</span>
        <span className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-mono text-[5px] uppercase tracking-[.14em]" style={{color:ink,opacity:.75}}>AirBooks</span>
      </span>
      {cover&&<span className="carollia-front-cover absolute bottom-0 left-full top-0 block overflow-hidden rounded-r-[2px]" style={{width:178,transform:`rotateY(${hovered?0:90}deg)`,backgroundColor:spine}}><img src={cover} alt={book.title} className="h-full w-full object-cover"/></span>}
      {!cover&&<span className="absolute bottom-0 left-full top-0 block w-[178px] rounded-r-[2px] bg-[#e8e1d4] shadow-2xl" style={{transform:`rotateY(${hovered?0:90}deg)`,transformOrigin:'left center'}}/>}
    </span>
    <span className="carollia-book-shadow pointer-events-none absolute -bottom-[6px] left-0 right-0 h-2 rounded-full bg-black/55 blur-[2px]" style={{opacity:hovered?.2:.78}}/>
    {hovered&&<span className="carollia-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-44 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.1em] text-[#5f574e]">{book.title}<span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span></span>}
  </button>
}
