import VoiceSearch from "@/components/VoiceSearch";
import AudioPlayer from "@/components/AudioPlayer";
import { Suspense } from "react";
import Link from "next/link";
// import { Mic, BookOpen, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-emerald-600 dark:text-emerald-400">
                AI-Powered
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Quran Learning</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Experience the future of Quranic study with advanced voice recognition, 
              personalized learning, and real-time recitation feedback.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">6,236</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Verses Searchable</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">99%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Voice Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-600 dark:text-slate-400">24/7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Learning Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Search Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Start Your Voice Search
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Speak any verse or topic, and our AI will find the exact Quranic reference
            </p>
          </div>
          
          <Suspense fallback={
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <VoiceSearch />
          </Suspense>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Powerful Features for Deep Learning
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to enhance your Quranic study and recitation practice
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Voice Search Feature */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">🎤</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Voice Search</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Search the entire Quran using your voice in Arabic or English. Our AI understands context and meaning.
              </p>
              <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                Try Voice Search →
              </Link>
            </div>

            {/* Bookmarks Feature */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">📖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Smart Bookmarks</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Save your favorite verses with personal notes and organize them by themes or study sessions.
              </p>
              <Link href="/bookmarks" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                View Bookmarks →
              </Link>
            </div>

            {/* Recitation Analysis */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recitation Analysis</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Get real-time feedback on your recitation with accuracy scores and pronunciation guidance.
              </p>
              <Link href="/recite" className="text-slate-600 dark:text-slate-400 font-medium hover:underline">
                Start Reciting →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Audio Player Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
            Beautiful Audio Experience
          </h2>
          <AudioPlayer caption="Listen to beautiful Quranic recitations" />
        </div>
      </section>
    </div>
  );
}
