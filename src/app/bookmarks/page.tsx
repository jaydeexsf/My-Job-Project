"use client";

import useSWR from "swr";
import Link from "next/link";
import { BookOpenIcon, HeartIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BookmarksPage() {
  const { data: verseBookmarks, mutate: mutateVerseBookmarks } = useSWR(`/api/bookmarks`, fetcher);
  const { data: surahBookmarks, mutate: mutateSurahBookmarks } = useSWR(`/api/surah-bookmarks`, fetcher);
  
  const verseItems = verseBookmarks?.data || [];
  const surahItems = surahBookmarks?.data || [];

  const removeVerseBookmark = async (surah: number, ayah: number) => {
    console.log('Button clicked: Remove verse bookmark', surah, ayah);
    await fetch(`/api/bookmarks?surah=${surah}&ayah=${ayah}`, { method: "DELETE" });
    console.log('Verse bookmark removed successfully');
    mutateVerseBookmarks();
  };

  const removeSurahBookmark = async (surah: number) => {
    console.log('Button clicked: Remove surah bookmark', surah);
    await fetch(`/api/surah-bookmarks?surah=${surah}`, { method: "DELETE" });
    console.log('Surah bookmark removed successfully');
    mutateSurahBookmarks();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Bookmarks</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your saved verses and surahs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Surah Bookmarks */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Surah Bookmarks</h2>
            <span className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full text-sm font-medium">
              {surahItems.length}
            </span>
          </div>
          
          {surahItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No surah bookmarks yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Bookmark surahs from the surah pages
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {surahItems.map((bookmark: any) => (
                <div key={`surah-${bookmark.surah}`} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link 
                        href={`/surah/${bookmark.surah}`}
                        className="block hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {bookmark.surah}. {bookmark.surahName}
                        </h3>
                        {bookmark.surahNameArabic && (
                          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2" dir="rtl">
                            {bookmark.surahNameArabic}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{bookmark.versesCount} verses</span>
                          <span>{new Date(bookmark.createdAt).toLocaleDateString()}</span>
                        </div>
                        {bookmark.note && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            "{bookmark.note}"
                          </p>
                        )}
                      </Link>
                    </div>
                    <button 
                      onClick={() => removeSurahBookmark(bookmark.surah)}
                      className="ml-4 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verse Bookmarks */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <HeartIcon className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verse Bookmarks</h2>
            <span className="bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 px-2 py-1 rounded-full text-sm font-medium">
              {verseItems.length}
            </span>
          </div>
          
          {verseItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No verse bookmarks yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Bookmark specific verses from the surah pages
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {verseItems.map((bookmark: any) => (
                <div key={`${bookmark.surah}:${bookmark.ayah}`} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link 
                        href={`/surah/${bookmark.surah}`}
                        className="block hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Surah {bookmark.surah} • Ayah {bookmark.ayah}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(bookmark.createdAt).toLocaleDateString()}
                        </div>
                        {bookmark.note && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            "{bookmark.note}"
                          </p>
                        )}
                      </Link>
                    </div>
                    <button 
                      onClick={() => removeVerseBookmark(bookmark.surah, bookmark.ayah)}
                      className="ml-4 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


