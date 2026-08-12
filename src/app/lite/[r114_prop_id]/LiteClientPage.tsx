'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import R114LiteDetailPanel from '../../../components/R114LiteDetailPanel';

export default function LiteClientPage({ r114PropId }: { r114PropId: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pb-16">
      <header className="sticky top-0 z-10 bg-[#0a0a0c]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto pt-2">
        <R114LiteDetailPanel r114PropId={r114PropId} theme="dark" />
      </main>
    </div>
  );
}
