"use client";

import { useEffect, useRef, useState } from "react";
import { getAyah } from "@/lib/quranApi";

export default function RecitePage() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [match, setMatch] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = "ar-SA"; // prioritize Arabic recitation
    recog.interimResults = true;
    recog.continuous = false;
    recog.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    recog.onend = async () => {
      setListening(false);
      if (!transcript.trim()) return;
      // Very naive matching: try to detect pattern "<surah> <ayah>" from text, else leave as transcript
      // For MVP, just store transcript; a robust match would call a dedicated search endpoint.
      setMatch({ transcript });
    };
    recognitionRef.current = recog;
  }, [transcript]);

  const toggle = () => {
    console.log('Button clicked: Recitation toggle, current state:', listening ? 'listening' : 'not listening');
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const save = async () => {
    console.log('Button clicked: Save recitation', match);
    if (!match) return;
    await fetch("/api/recitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: match.transcript }),
    });
    console.log('Recitation saved to history');
    alert("Saved to history");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recite</h2>
      <button onClick={toggle} className="px-4 py-2 rounded-full bg-emerald-500/80 text-white">
        {listening ? "Listening… Click to stop" : "Start Recitation"}
      </button>
      {transcript && <div className="p-4 rounded-xl bg-white/5 border border-white/10">{transcript}</div>}
      {match && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="text-sm opacity-80">Detected transcript</div>
          <div>{match.transcript}</div>
          <button onClick={save} className="mt-2 px-3 py-1.5 rounded-full bg-sky-500/80 text-white">Save</button>
        </div>
      )}
    </div>
  );
}


