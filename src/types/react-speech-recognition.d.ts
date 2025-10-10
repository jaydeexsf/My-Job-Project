declare module 'react-speech-recognition' {
  export interface SpeechRecognitionOptions {
    transcribing?: boolean;
    clearTranscriptOnListen?: boolean;
    continuous?: boolean;
  }

  export interface UseSpeechRecognitionHook {
    transcript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
    isMicrophoneAvailable: boolean;
    finalTranscript: string;
    interimTranscript: string;
  }

  export function useSpeechRecognition(
    options?: SpeechRecognitionOptions
  ): UseSpeechRecognitionHook;

  export interface SpeechRecognitionStatic {
    startListening(options?: {
      continuous?: boolean;
      language?: string;
      interimResults?: boolean;
    }): Promise<void>;
    stopListening(): void;
    abortListening(): void;
    browserSupportsSpeechRecognition(): boolean;
    getRecognition(): any;
  }

  const SpeechRecognition: SpeechRecognitionStatic;
  export default SpeechRecognition;
}
