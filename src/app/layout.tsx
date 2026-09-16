import type { Metadata } from "next";
import "./globals.css";
import "./carollia.css";
import "./shelf-compact.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata={title:"AirBooks — Your virtual library",description:"A personal archive for reading, discovering and downloading ebooks.",icons:{icon:"/favicon.ico"}};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Karla:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Newsreader:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet"/></head><body className="antialiased carollia-paper"><Header/><main className="min-h-screen">{children}</main><Footer/></body></html>}
