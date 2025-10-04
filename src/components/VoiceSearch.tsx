"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/outline";
// import { Mic, MicOff, Search, Loader2 } from "lucide-react";

export default function VoiceSearch() {
	const [listening, setListening] = useState(false);
	const [transcript, setTranscript] = useState("");
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
			recog.onend = () => {
				setListening(false);
				console.log('Voice recognition ended. Transcript:', transcript);
			};
			recognitionRef.current = recog;
		}
	}, [transcript]);

	const toggle = () => {
		console.log('Button clicked: Voice search toggle, current state:', listening ? 'listening' : 'not listening');
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
					listening && "bg-red-600 hover:bg-red-700 border-red-700 animate-pulse"
				)}
				onClick={toggle}
			>
				<div className={clsx(
					"w-6 h-6 flex items-center justify-center",
					listening && "animate-pulse"
				)}>
					{listening ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
				</div>
				<span className="text-lg">
					{listening ? "Listening… Click to stop" : "Press and speak"}
				</span>
			</button>
			
			{transcript && (
				<p className="mt-4 text-sm opacity-80">
					<strong>You said:</strong> &ldquo;{transcript}&rdquo;
				</p>
			)}
		</div>
	);
}


