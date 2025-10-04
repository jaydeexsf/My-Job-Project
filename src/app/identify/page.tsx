import AudioIdentifier from "@/components/AudioIdentifier";
import Link from "next/link";
import { 
  MusicalNoteIcon,
  MicrophoneIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  ArrowLeftIcon,
  BoltIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";

export const metadata = {
  title: "Identify Quran Verse | AI-Powered Quran Learning",
  description: "Upload or record Quran recitation to identify verses using AI",
};

export default function IdentifyPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Navigation */}
      <div className="max-w-4xl mx-auto mb-8">
        <Link 
          href="/" 
          onClick={() => console.log('Button clicked: Back to Home')}
          className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
            <MusicalNoteIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white text-center">
            Quran Verse Identifier
          </h1>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Just like Shazam identifies songs, our AI can identify Quran verses from audio.
          Record yourself reciting, upload an audio file, or let it listen to any Quran recitation.
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-600 rounded-xl">
                <MicrophoneIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Record</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Record yourself reciting or let it listen to any Quran audio
            </p>
          </div>
          <div className="text-center p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <MagnifyingGlassIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Analyze</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              AI analyzes the audio to identify the specific verse
            </p>
          </div>
          <div className="text-center p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-600 rounded-xl">
                <BookOpenIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Discover</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Get the Arabic text, translation, and Surah details
            </p>
          </div>
        </div>
      </div>

      {/* Audio Identifier Component */}
      <AudioIdentifier />

      {/* Features */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckBadgeIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">High Accuracy</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Advanced AI algorithms provide highly accurate verse identification from audio recordings.
            </p>
          </div>
          
          <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <BoltIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fast Processing</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Get results in seconds. Upload or record audio and receive instant verse identification.
            </p>
          </div>
          
          <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <GlobeAltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Multiple Formats</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Support for various audio formats including recordings from phones, videos, and audio files.
            </p>
          </div>
          
          <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <AcademicCapIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Details</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Get full verse details including Arabic text, translation, Surah information, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <div className="p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl backdrop-blur-sm border border-purple-200/20 dark:border-purple-800/20">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Try Other Features
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Explore more ways to interact with the Quran using AI
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/" 
              onClick={() => console.log('Button clicked: Voice Search')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Voice Search
            </Link>
            <Link 
              href="/recite" 
              onClick={() => console.log('Button clicked: Recitation Practice')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Recitation Practice
            </Link>
            <Link 
              href="/bookmarks" 
              onClick={() => console.log('Button clicked: Bookmarks')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Bookmarks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
