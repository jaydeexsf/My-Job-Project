"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HistoryPage() {
  const { data } = useSWR(`/api/recitations`, fetcher);
  const items = data?.data || [];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recitation History</h2>
      <ul className="space-y-3">
        {items.map((h: any) => (
          <li key={h._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm opacity-80">{new Date(h.createdAt).toLocaleString()}</div>
            <div>Surah {h.surah} • Ayah {h.ayah} {h.accuracy ? `(Accuracy ${Math.round(h.accuracy)}%)` : ''}</div>
            {h.transcript ? <div className="text-sm opacity-80">{h.transcript}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}


