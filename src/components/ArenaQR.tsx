"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function ArenaQR({ slug, title }: { slug: string, title: string }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    // This instantly detects whether you are on localhost or Vercel!
    setQrUrl(`${window.location.origin}/contest/${slug}`);
  }, [slug]);

  // Wait until the URL is safely grabbed before showing the QR code
  if (!qrUrl) return <div className="h-[150px] w-[150px] bg-white/5 animate-pulse rounded-xl"></div>;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl border-4 border-rose-500 inline-block">
        <QRCodeCanvas 
          value={qrUrl} 
          size={150} 
          bgColor={"#ffffff"} 
          fgColor={"#000000"} 
          level={"H"} 
          includeMargin={false}
        />
      </div>
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
    </div>
  );
}