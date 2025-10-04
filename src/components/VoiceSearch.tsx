"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { 
	MicrophoneIcon, 
	StopIcon,
	MagnifyingGlassIcon,
	BookmarkIcon,
	SpeakerWaveIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface SearchResult {
	verse_key: string;
	text: string;
	translations?: Array<{
		text: string;
		language_name: string;
	}>;
	words?: any[];
}

export default function VoiceSearch() {
	const [listening, setListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [error, setError] = useState<string | null>(null);
	const recognitionRef = useRef<any>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationRef = useRef<number | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);

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
				if (audioContextRef.current) {
					audioContextRef.current.close();
				}
				if (animationRef.current) {
					cancelAnimationFrame(animationRef.current);
				}
				// Automatically search when speaking stops
				if (transcript.trim()) {
					performSearch(transcript);
				}
			};
			recognitionRef.current = recog;
		}
	}, [transcript]);

	const drawWaveform = () => {
		const canvas = canvasRef.current;
		const analyser = analyserRef.current;
		
		if (!canvas || !analyser) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		
		const draw = () => {
			analyser.getByteFrequencyData(dataArray);
			
			ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			const barWidth = (canvas.width / bufferLength) * 2.5;
			let barHeight;
			let x = 0;
			
			for (let i = 0; i < bufferLength; i++) {
				barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
				
				const hue = 120 + (i / bufferLength) * 60; // Green to teal gradient
				ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
				ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
				
				x += barWidth + 1;
			}
			
			animationRef.current = requestAnimationFrame(draw);
		};
		
		draw();
	};

	const toggle = async () => {
		console.log('Button clicked: Voice search toggle, current state:', listening ? 'listening' : 'not listening');
		if (!recognitionRef.current) {
			setError("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
			return;
		}
		
		if (listening) {
			recognitionRef.current.stop();
			setListening(false);
		} else {
			try {
				setTranscript("");
				setSearchResults([]);
				setError(null);
				
				// Set up audio visualization
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				audioContextRef.current = new AudioContext();
				const source = audioContextRef.current.createMediaStreamSource(stream);
				analyserRef.current = audioContextRef.current.createAnalyser();
				analyserRef.current.fftSize = 256;
				source.connect(analyserRef.current);
				
				// Start visualization
				drawWaveform();
				
				recognitionRef.current.start();
				setListening(true);
			} catch (err) {
				setError("Could not access microphone. Please allow microphone access.");
				console.error("Error accessing microphone:", err);
			}
		}
	};

	const performSearch = async (query: string) => {
		setIsSearching(true);
		setError(null);
		
		try {
			console.log('Searching for:', query);
			const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&per_page=5`);
			
			if (!response.ok) {
				throw new Error('Search failed');
			}
			
			const data = await response.json();
			console.log('Search results:', data);
			
			if (data.search?.results) {
				setSearchResults(data.search.results);
			} else {
				setSearchResults([]);
				setError('No results found. Try different keywords.');
			}
		} catch (err) {
			console.error('Search error:', err);
			setError('Failed to search. Please try again.');
		} finally {
			setIsSearching(false);
		}
	};

	useEffect(() => {
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

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
				disabled={isSearching}
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
			
			{/* Audio Visualization */}
			{listening && (
				<canvas
					ref={canvasRef}
					width={500}
					height={100}
					className="w-full max-w-lg h-24 mx-auto mt-6 bg-black/20 rounded-lg"
				/>
			)}
			
			{transcript && (
				<div className="mt-4 p-3 bg-white/10 dark:bg-gray-800/30 rounded-lg">
					<p className="text-sm opacity-80">
						<strong>You said:</strong> &ldquo;{transcript}&rdquo;
					</p>
				</div>
			)}

			{isSearching && (
				<div className="mt-6 flex items-center justify-center gap-2 text-blue-500">
					<MagnifyingGlassIcon className="w-5 h-5 animate-spin" />
					<span>Searching...</span>
				</div>
			)}

			{error && (
				<div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
					<div className="flex items-center gap-2 text-red-400">
						<ExclamationTriangleIcon className="w-5 h-5" />
						<p>{error}</p>
					</div>
				</div>
			)}

			{/* Search Results */}
			{searchResults.length > 0 && (
				<div className="mt-6 space-y-4">
					<div className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400">
						<CheckCircleIcon className="w-5 h-5" />
						<h3 className="font-semibold">Found {searchResults.length} results</h3>
					</div>
					
					{searchResults.map((result, index) => {
						const [surah, ayah] = result.verse_key.split(':');
						return (
							<div 
								key={index}
								className="bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 text-left"
							>
								<div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
									Surah {surah}, Ayah {ayah}
								</div>
								<div className="text-right text-lg mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" dir="rtl">
									{result.text}
								</div>
								{result.translations && result.translations[0] && (
									<div className="text-sm text-gray-700 dark:text-gray-300 italic">
										&ldquo;{result.translations[0].text}&rdquo;
									</div>
								)}
								<div className="flex gap-2 mt-3">
									<button 
										onClick={() => console.log('Bookmark verse', surah, ayah)}
										className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
									>
										<BookmarkIcon className="w-3 h-3" />
										<span>Bookmark</span>
									</button>
									<button 
										onClick={() => console.log('Listen to verse', surah, ayah)}
										className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition-colors"
									>
										<SpeakerWaveIcon className="w-3 h-3" />
										<span>Listen</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
