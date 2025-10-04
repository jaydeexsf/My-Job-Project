"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BookmarksPage() {
  const { data, mutate } = useSWR(`/api/bookmarks`, fetcher);
  const items = data?.data || [];

  const remove = async (surah: number, ayah: number) => {
    console.log('Button clicked: Remove bookmark', surah, ayah);
    await fetch(`/api/bookmarks?surah=${surah}&ayah=${ayah}`, { method: "DELETE" });
    console.log('Bookmark removed successfully');
    mutate();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Bookmarks</h2>
      <ul className="space-y-3">
        {items.map((b: any) => (
          <li key={`${b.surah}:${b.ayah}`} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div>Surah {b.surah} • Ayah {b.ayah}</div>
            {b.note ? <div className="text-sm opacity-80">{b.note}</div> : null}
            <button onClick={() => remove(b.surah, b.ayah)} className="mt-2 px-3 py-1.5 rounded-full bg-rose-500/80 text-white">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}


