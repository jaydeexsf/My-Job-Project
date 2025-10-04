// Machine ID utility for anonymous user identification (prototype)
// Uses browser fingerprinting + localStorage for consistent user identification

export function getMachineId(): string {
	if (typeof window === 'undefined') {
		return 'server';
	}

	// Check if we already have a stored ID
	const stored = localStorage.getItem('machineId');
	if (stored) {
		return stored;
	}

	// Generate a new ID based on browser fingerprint
	const fingerprint = generateFingerprint();
	localStorage.setItem('machineId', fingerprint);
	return fingerprint;
}

function generateFingerprint(): string {
	// Collect browser/device information
	const canvas = getCanvasFingerprint();
	const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const language = navigator.language;
	const platform = navigator.platform;
	const userAgent = navigator.userAgent;
	
	// Combine all data
	const data = `${canvas}|${screen}|${timezone}|${language}|${platform}|${userAgent}`;
	
	// Create a simple hash (for prototype - in production use crypto.subtle)
	return simpleHash(data);
}

function getCanvasFingerprint(): string {
	try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return 'no-canvas';
		
		canvas.width = 200;
		canvas.height = 50;
		
		ctx.textBaseline = 'top';
		ctx.font = '14px Arial';
		ctx.fillStyle = '#f60';
		ctx.fillRect(125, 1, 62, 20);
		ctx.fillStyle = '#069';
		ctx.fillText('Quran App', 2, 15);
		
		return canvas.toDataURL();
	} catch (e) {
		return 'canvas-error';
	}
}

function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	
	// Convert to positive hex string and add timestamp for uniqueness
	const hashStr = Math.abs(hash).toString(36);
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	
	return `user_${hashStr}_${timestamp}_${random}`;
}
