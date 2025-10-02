"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { searchAyat } from "@/lib/quranApi";
// import { Mic, MicOff, Search, Loader2 } from "lucide-react";

export default function VoiceSearch() {
	const [listening, setListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [searchResults, setSearchResults] = useState<any>(null);
	const [isSearching, setIsSearching] = useState(false);
	const recognitionRef = useRef<any>(null);

	useEffect(() => {
		const SpeechRecognition: any =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (SpeechRecognition) {
			const recog = new SpeechRecognition();
			recog.lang = "en-US";
			recog.interimResults = true;
			recog.continuous = false;
			recog.onresult = (e: any) => {
				let text = "";
				for (let i = e.resultIndex; i < e.results.length; ++i) {
					text += e.results[i][0].transcript;
				}
				setTranscript(text);
			};
			recog.onend = async () => {
				setListening(false);
				if (transcript.trim()) {
					setIsSearching(true);
					try {
						const res = await searchAyat(transcript.trim());
						setSearchResults(res);
					} catch (error) {
						console.error("Search failed:", error);
						setSearchResults({ error: "Search failed" });
					} finally {
						setIsSearching(false);
					}
				}
			};
			recognitionRef.current = recog;
		}
	}, [transcript]);

	const toggle = () => {
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

	return (
		<div
			className={clsx(
				"rounded-3xl p-8 w-full max-w-2xl text-center",
				"backdrop-blur-xl border border-white/30",
				"bg-gradient-to-br from-white/15 via-white/10 to-white/5",
				"shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)]",
				"dark:shadow-[0_20px_50px_rgba(59,_130,_246,_0.5)]"
			)}
		>
			<button
				className={clsx(
					"flex items-center justify-center gap-3 px-8 py-4 rounded-lg font-medium text-white",
					"bg-emerald-600 hover:bg-emerald-700",
					"transition-colors duration-200",
					"shadow-md hover:shadow-lg",
					"border border-emerald-700",
					"disabled:opacity-50 disabled:cursor-not-allowed",
					listening && "bg-red-600 hover:bg-red-700 border-red-700 animate-pulse",
					isSearching && "bg-amber-600 hover:bg-amber-700 border-amber-700 cursor-wait"
				)}
				onClick={toggle}
				disabled={isSearching}
			>
				<div className={clsx(
					"w-6 h-6 flex items-center justify-center text-lg",
					listening && "animate-pulse"
				)}>
					{listening ? "🔴" : isSearching ? "⏳" : "🎤"}
				</div>
				<span className="text-lg">
					{listening ? "Listening… Click to stop" : isSearching ? "Searching..." : "Press and speak to search"}
				</span>
			</button>
			
			{transcript && (
				<p className="mt-4 text-sm opacity-80">
					<strong>You said:</strong> "{transcript}"
				</p>
			)}
			
			{searchResults && !searchResults.error && (
				<div className="mt-6 text-left">
					<h3 className="font-semibold mb-3">Search Results:</h3>
					{searchResults.results?.length > 0 ? (
						<div className="space-y-3">
							{searchResults.results.slice(0, 3).map((result: any, index: number) => (
								<div key={index} className="p-3 bg-white/10 rounded-lg">
									<div className="text-right text-lg mb-2" dir="rtl">
										{result.text}
									</div>
									<div className="text-sm opacity-80">
										{result.translation}
									</div>
									<div className="text-xs opacity-60 mt-1">
										Surah {result.surah}, Ayah {result.ayah}
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm opacity-70">No results found. Try a different search term.</p>
					)}
				</div>
			)}
			
			{searchResults?.error && (
				<p className="mt-4 text-sm text-red-400">
					Search failed. Please try again.
				</p>
			)}
		</div>
	);
}


