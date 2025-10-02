"use client";

import { useState } from "react";
import { searchAyat, getAudioForAyah } from "@/lib/quranApi";
import AudioPlayer from "@/components/AudioPlayer";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | undefined>();

  const onSearch = async () => {
    const res: any = await searchAyat(query);
    const items = res?.data || res?.results || [];
    setResults(items);
  };

  const playAyah = async (surah: number, ayah: number) => {
    const audio: any = await getAudioForAyah(surah, ayah);
    const url = audio?.data?.url || audio?.url;
    setAudioSrc(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Search</h2>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Ayat al-Kursi or 'Al-Baqarah 255'"
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 outline-none"
        />
        <button onClick={onSearch} className="px-4 py-2 rounded-lg bg-emerald-500/80 text-white">
          Search
        </button>
      </div>

      <ul className="space-y-3">
        {results.map((r: any, idx) => (
          <li key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">Surah {r.surah || r.surah_number} • Ayah {r.ayah || r.ayah_number}</div>
            <div className="mt-1 text-lg">{r.text || r.arabic}</div>
            {r.translation ? (
              <div className="mt-1 text-sm opacity-80">{r.translation}</div>
            ) : null}
            <div className="mt-2">
              <button
                onClick={() => playAyah(Number(r.surah || r.surah_number), Number(r.ayah || r.ayah_number))}
                className="px-3 py-1.5 rounded-full bg-sky-500/80 text-white"
              >
                Play
              </button>
            </div>
          </li>
        ))}
      </ul>

      <AudioPlayer src={audioSrc} />
    </div>
  );
}


