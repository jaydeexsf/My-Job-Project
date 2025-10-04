"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
// import { Play, Pause, Volume2 } from "lucide-react";

type Props = {
	src?: string;
	caption?: string;
};

export default function AudioPlayer({ src, caption }: Props) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		setPlaying(false);
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.load();
		}
	}, [src]);

	return (
		<div
			className={clsx(
				"rounded-xl p-6 w-full max-w-xl",
				"bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
				"shadow-lg"
			)}
		>
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
					<span className="text-white text-lg">🔊</span>
				</div>
				{caption && <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{caption}</div>}
			</div>
			
			<audio 
				ref={audioRef} 
				controls 
				className="w-full" 
				onPlay={() => {
					console.log('Button clicked: Audio play');
					setPlaying(true);
				}} 
				onPause={() => {
					console.log('Button clicked: Audio pause');
					setPlaying(false);
				}}
			>
				{src ? <source src={src} /> : null}
			</audio>
			
			<div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
				{playing ? (
					<>
						<span>⏸️</span>
						<span>Playing</span>
					</>
				) : (
					<>
						<span>▶️</span>
						<span>Ready to play</span>
					</>
				)}
			</div>
		</div>
	);
}


