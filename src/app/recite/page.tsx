"use client";

import { useEffect, useState } from "react";
import { getMachineId } from "@/lib/machineId";
import { getSurahName } from "@/lib/surahNames";
import { Heart, Trophy, Mic, Upload, Star, Bookmark, Clock, TrendingUp } from "lucide-react";

interface Recitation {
  _id: string;
  userId: string;
  surah: number;
  ayah?: number;
  audioPath: string;
  likes: string[];
  likeCount: number;
  rank?: number;
  createdAt: string;
  ratings?: Array<{ userId: string; rating: number; createdAt: Date }>;
  averageRating?: number;
  ratingCount?: number;
  bookmarkedBy?: string[];
}

export default function ReciteCompetitionPage() {
  const [userId, setUserId] = useState<string>("");
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedAyah, setSelectedAyah] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [rankings, setRankings] = useState<Recitation[]>([]);
  const [latestRecitations, setLatestRecitations] = useState<Recitation[]>([]);
  const [bookmarkedRecitations, setBookmarkedRecitations] = useState<Recitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"submit" | "rankings" | "latest" | "bookmarks">("submit");
  const [filterSurah, setFilterSurah] = useState<number | "">("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRecitationForRating, setSelectedRecitationForRating] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);

  // Initialize user ID
  useEffect(() => {
    const id = getMachineId();
    setUserId(id);
  }, []);

  // Load rankings
  const loadRankings = async (surah?: number) => {
    try {
      setLoading(true);
      const url = surah 
        ? `/api/competition/rankings?surah=${surah}`
        : `/api/competition/rankings`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRankings(data.data);
      }
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load latest recitations
  const loadLatestRecitations = async (surah?: number) => {
    try {
      setLoading(true);
      const url = surah 
        ? `/api/competition/latest?surah=${surah}&limit=20`
        : `/api/competition/latest?limit=20`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLatestRecitations(data.data);
      }
    } catch (error) {
      console.error("Error loading latest recitations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load bookmarked recitations
  const loadBookmarkedRecitations = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/competition/bookmark?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setBookmarkedRecitations(data.data);
      }
    } catch (error) {
      console.error("Error loading bookmarked recitations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "rankings") {
      loadRankings(filterSurah || undefined);
    } else if (viewMode === "latest") {
      loadLatestRecitations(filterSurah || undefined);
    } else if (viewMode === "bookmarks") {
      loadBookmarkedRecitations();
    }
  }, [viewMode, filterSurah, userId]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please allow microphone access.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // Submit recitation
  const submitRecitation = async () => {
    if (!audioBlob || !userId) {
      console.warn("⚠️ Cannot submit: Missing audio or userId");
      alert("Please record audio first");
      return;
    }

    console.log("🚀 Starting recitation submission...");
    console.log("📋 Submission info:", {
      userId: userId.substring(0, 20) + "...",
      surah: selectedSurah,
      ayah: selectedAyah || "full chapter",
      audioBlobSize: `${(audioBlob.size / 1024).toFixed(2)} KB`,
      audioBlobType: audioBlob.type,
    });

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recitation.webm");
      formData.append("userId", userId);
      formData.append("surah", selectedSurah.toString());
      if (selectedAyah) {
        formData.append("ayah", selectedAyah);
      }

      console.log("📤 Sending request to /api/competition/submit...");
      const res = await fetch("/api/competition/submit", {
        method: "POST",
        body: formData,
      });

      console.log("📬 Response received:", {
        status: res.status,
        statusText: res.statusText,
      });

      const data = await res.json();
      console.log("📦 Response data:", data);

      if (data.success) {
        console.log("✅ Recitation submitted successfully!", data.data);
        alert("Recitation submitted successfully! 🎉");
        setAudioBlob(null);
        setSelectedAyah("");
      } else {
        console.error("❌ Submission failed:", data.error);
        alert("Failed to submit recitation: " + data.error);
      }
    } catch (error) {
      console.error("❌ Error submitting recitation:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      alert("Failed to submit recitation");
    } finally {
      setLoading(false);
      console.log("🏁 Submission process completed");
    }
  };

  // Like/unlike recitation
  const toggleLike = async (recitationId: string) => {
    try {
      const res = await fetch("/api/competition/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recitationId, userId }),
      });

      const data = await res.json();
      if (data.success) {
        // Reload current view to show updated likes
        refreshCurrentView();
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // Bookmark/unbookmark recitation
  const toggleBookmark = async (recitationId: string) => {
    try {
      const res = await fetch("/api/competition/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recitationId, userId }),
      });

      const data = await res.json();
      if (data.success) {
        // Reload current view to show updated bookmarks
        refreshCurrentView();
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  // Open rating modal
  const openRatingModal = (recitationId: string, currentRating?: number) => {
    setSelectedRecitationForRating(recitationId);
    setSelectedRating(currentRating || 0);
    setRatingModalOpen(true);
  };

  // Submit rating
  const submitRating = async () => {
    if (!selectedRecitationForRating || selectedRating === 0) return;

    try {
      const res = await fetch("/api/competition/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recitationId: selectedRecitationForRating,
          userId,
          rating: selectedRating,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRatingModalOpen(false);
        setSelectedRecitationForRating(null);
        setSelectedRating(0);
        // Reload current view to show updated ratings
        refreshCurrentView();
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // Refresh current view
  const refreshCurrentView = () => {
    if (viewMode === "rankings") {
      loadRankings(filterSurah || undefined);
    } else if (viewMode === "latest") {
      loadLatestRecitations(filterSurah || undefined);
    } else if (viewMode === "bookmarks") {
      loadBookmarkedRecitations();
    }
  };

  // Get user's rating for a recitation
  const getUserRating = (recitation: Recitation): number => {
    if (!recitation.ratings) return 0;
    const userRating = recitation.ratings.find(r => r.userId === userId);
    return userRating ? userRating.rating : 0;
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              Quran Recitation Competition
            </h2>
          </div>

          {/* View Mode Tabs */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setViewMode("submit")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base flex items-center gap-2 ${
                viewMode === "submit"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Recitation</span>
              <span className="sm:hidden">Submit</span>
            </button>
            <button
              onClick={() => setViewMode("latest")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base flex items-center gap-2 ${
                viewMode === "latest"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              }`}
            >
              <Clock className="w-4 h-4" />
              Latest
            </button>
            <button
              onClick={() => setViewMode("rankings")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base flex items-center gap-2 ${
                viewMode === "rankings"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Top Rated</span>
              <span className="sm:hidden">Top</span>
            </button>
            <button
              onClick={() => setViewMode("bookmarks")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base flex items-center gap-2 ${
                viewMode === "bookmarks"
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">My Bookmarks</span>
              <span className="sm:hidden">Saved</span>
            </button>
          </div>

          {/* Submit Mode */}
          {viewMode === "submit" && (
            <div className="space-y-6 sm:space-y-8">
              <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Select Chapter (Surah)
                    </label>
                    <select
                      value={selectedSurah}
                      onChange={(e) => setSelectedSurah(Number(e.target.value))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}. {getSurahName(num)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Verse (Ayah) - Optional
                    </label>
                    <input
                      type="number"
                      value={selectedAyah}
                      onChange={(e) => setSelectedAyah(e.target.value)}
                      placeholder="e.g., 1, 2, 3..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for full chapter</p>
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!recording && !audioBlob && (
                      <button
                        onClick={startRecording}
                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Mic className="w-5 h-5" />
                        <span className="text-sm sm:text-base">Start Recording</span>
                      </button>
                    )}

                    {recording && (
                      <button
                        onClick={stopRecording}
                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium animate-pulse transition-all duration-200 shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                          <span className="text-sm sm:text-base">Recording... Click to Stop</span>
                        </div>
                      </button>
                    )}

                    {audioBlob && !recording && (
                      <>
                        <button
                          onClick={() => setAudioBlob(null)}
                          className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <span className="text-sm sm:text-base">Re-record</span>
                        </button>
                        <button
                          onClick={submitRecitation}
                          disabled={loading}
                          className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-sm sm:text-base">{loading ? "Submitting..." : "Submit"}</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Enhanced Audio Player */}
                  {audioBlob && (
                    <div className="p-4 sm:p-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">Your Recording</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ready to submit</p>
                        </div>
                      </div>
                      <audio 
                        src={URL.createObjectURL(audioBlob)} 
                        controls 
                        className="w-full h-12 bg-white dark:bg-gray-800 rounded-lg shadow-inner"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 sm:p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  How it works
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-blue-800 dark:text-blue-200">
                  <li>Select a chapter (and optionally a verse)</li>
                  <li>Record your recitation using the microphone</li>
                  <li>Submit it to compete with others</li>
                  <li>Get likes and ratings from the community to climb the rankings!</li>
                </ul>
              </div>
            </div>
          )}

          {/* Render Recitation Cards */}
          {(viewMode === "rankings" || viewMode === "latest" || viewMode === "bookmarks") && (
            <div className="space-y-4 sm:space-y-6">
              {viewMode !== "bookmarks" && (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Surah:</label>
                  <select
                    value={filterSurah}
                    onChange={(e) => setFilterSurah(e.target.value ? Number(e.target.value) : "")}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">All Surahs</option>
                    {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num}. {getSurahName(num)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loading && (
                <div className="text-center py-8 sm:py-12">
                  <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                </div>
              )}

              {!loading && 
               ((viewMode === "rankings" && rankings.length === 0) ||
                (viewMode === "latest" && latestRecitations.length === 0) ||
                (viewMode === "bookmarks" && bookmarkedRecitations.length === 0)) && (
                <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                  <div className="max-w-md mx-auto">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No recitations yet</p>
                    <p className="text-sm">
                      {viewMode === "bookmarks" 
                        ? "You haven't bookmarked any recitations yet."
                        : "Be the first to submit a recitation!"}
                    </p>
                  </div>
                </div>
              )}

              {!loading && (
                <div className="space-y-4 sm:space-y-6">
                  {(viewMode === "rankings" ? rankings : 
                    viewMode === "latest" ? latestRecitations : 
                    bookmarkedRecitations).map((rec) => {
                    const userRating = getUserRating(rec);
                    const isBookmarked = rec.bookmarkedBy?.includes(userId) || false;
                    
                    return (
                      <div
                        key={rec._id}
                        className={`p-4 sm:p-6 rounded-xl border shadow-lg transition-all duration-200 hover:shadow-xl ${
                          rec.rank === 1
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-600"
                            : rec.rank === 2
                            ? "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-300 dark:border-gray-600"
                            : rec.rank === 3
                            ? "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-300 dark:border-orange-600"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {rec.rank && (
                              <div className={`text-2xl sm:text-3xl font-bold flex-shrink-0 ${
                                rec.rank === 1 ? "text-yellow-500" :
                                rec.rank === 2 ? "text-gray-400" :
                                rec.rank === 3 ? "text-orange-600" :
                                "text-gray-500"
                              }`}>
                                #{rec.rank}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-white mb-1">
                                {getSurahName(rec.surah)}
                                {rec.ayah && ` - Verse ${rec.ayah}`}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(rec.createdAt).toLocaleDateString()}
                                </span>
                                {rec.averageRating !== undefined && rec.ratingCount !== undefined && rec.ratingCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                    {rec.averageRating.toFixed(1)} ({rec.ratingCount})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleLike(rec._id)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                                rec.likes.includes(userId)
                                  ? "bg-red-500 text-white shadow-lg"
                                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <Heart
                                className="w-4 h-4"
                                fill={rec.likes.includes(userId) ? "currentColor" : "none"}
                              />
                              <span className="hidden sm:inline">{rec.likeCount}</span>
                              <span className="sm:hidden">{rec.likeCount}</span>
                            </button>
                            <button
                              onClick={() => toggleBookmark(rec._id)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                                isBookmarked
                                  ? "bg-blue-500 text-white shadow-lg"
                                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <Bookmark
                                className="w-4 h-4"
                                fill={isBookmarked ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              onClick={() => openRatingModal(rec._id, userRating)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                                userRating > 0
                                  ? "bg-yellow-500 text-white shadow-lg"
                                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <Star
                                className="w-4 h-4"
                                fill={userRating > 0 ? "currentColor" : "none"}
                              />
                              <span className="hidden sm:inline">{userRating > 0 ? userRating : "Rate"}</span>
                              <span className="sm:hidden">{userRating > 0 ? userRating : "★"}</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Enhanced Audio Player */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">Recitation</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Click play to listen</p>
                            </div>
                          </div>
                          <audio 
                            src={rec.audioPath} 
                            controls 
                            className="w-full h-12 bg-white dark:bg-gray-800 rounded-lg shadow-inner"
                            style={{
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rating Modal */}
          {ratingModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRatingModalOpen(false)}>
              <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-gray-700 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">Rate this Recitation</h3>
                <div className="flex gap-2 sm:gap-3 justify-center mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      className="transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                          star <= selectedRating
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setRatingModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={selectedRating === 0}
                    className="flex-1 px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors shadow-lg"
                  >
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


