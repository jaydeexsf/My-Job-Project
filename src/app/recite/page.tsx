"use client";

import { useEffect, useState } from "react";
import { getMachineId } from "@/lib/machineId";
import { getSurahName } from "@/lib/surahNames";
import { Heart, Trophy, Mic, Upload } from "lucide-react";

interface Recitation {
  _id: string;
  userId: string;
  surah: number;
  ayah?: number;
  audioPath: string;
  likes: string[];
  likeCount: number;
  rank: number;
  createdAt: string;
}

export default function ReciteCompetitionPage() {
  const [userId, setUserId] = useState<string>("");
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedAyah, setSelectedAyah] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [rankings, setRankings] = useState<Recitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"submit" | "rankings">("submit");
  const [filterSurah, setFilterSurah] = useState<number | "">("");

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

  useEffect(() => {
    if (viewMode === "rankings") {
      loadRankings(filterSurah || undefined);
    }
  }, [viewMode, filterSurah]);

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
        // Reload rankings to show updated likes
        loadRankings(filterSurah || undefined);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Quran Recitation Competition
        </h2>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("submit")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "submit"
              ? "bg-emerald-500 text-white"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          <Mic className="w-4 h-4 inline mr-2" />
          Submit Recitation
        </button>
        <button
          onClick={() => setViewMode("rankings")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "rankings"
              ? "bg-emerald-500 text-white"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Rankings
        </button>
      </div>

      {/* Submit Mode */}
      {viewMode === "submit" && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Chapter (Surah)
              </label>
              <select
                value={selectedSurah}
                onChange={(e) => setSelectedSurah(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              >
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}. {getSurahName(num)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Verse (Ayah) - Optional (leave empty for full chapter)
              </label>
              <input
                type="number"
                value={selectedAyah}
                onChange={(e) => setSelectedAyah(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
            </div>

            <div className="flex gap-2">
              {!recording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              )}

              {recording && (
                <button
                  onClick={stopRecording}
                  className="flex-1 px-4 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium animate-pulse"
                >
                  🔴 Recording... Click to Stop
                </button>
              )}

              {audioBlob && !recording && (
                <>
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={submitRecitation}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    {loading ? "Submitting..." : "Submit"}
                  </button>
                </>
              )}
            </div>

            {audioBlob && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
              </div>
            )}
          </div>

          <div className="text-sm text-gray-400 p-4 rounded-lg bg-white/5">
            <strong>How it works:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Select a chapter (and optionally a verse)</li>
              <li>Record your recitation</li>
              <li>Submit it to compete with others</li>
              <li>Get likes from the community to climb the rankings!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Rankings Mode */}
      {viewMode === "rankings" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Filter by Surah:</label>
            <select
              value={filterSurah}
              onChange={(e) => setFilterSurah(e.target.value ? Number(e.target.value) : "")}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
            >
              <option value="">All Surahs</option>
              {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}. {getSurahName(num)}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="text-center py-8">Loading rankings...</div>
          )}

          {!loading && rankings.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No recitations yet. Be the first to submit!
            </div>
          )}

          {!loading && rankings.length > 0 && (
            <div className="space-y-3">
              {rankings.map((rec) => (
                <div
                  key={rec._id}
                  className={`p-4 rounded-xl border ${
                    rec.rank === 1
                      ? "bg-yellow-500/10 border-yellow-500/50"
                      : rec.rank === 2
                      ? "bg-gray-400/10 border-gray-400/50"
                      : rec.rank === 3
                      ? "bg-orange-600/10 border-orange-600/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${
                        rec.rank === 1 ? "text-yellow-500" :
                        rec.rank === 2 ? "text-gray-400" :
                        rec.rank === 3 ? "text-orange-600" :
                        "text-gray-500"
                      }`}>
                        #{rec.rank}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {getSurahName(rec.surah)}
                          {rec.ayah && ` - Verse ${rec.ayah}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLike(rec._id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                        rec.likes.includes(userId)
                          ? "bg-red-500 text-white"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={rec.likes.includes(userId) ? "currentColor" : "none"}
                      />
                      {rec.likeCount}
                    </button>
                  </div>
                  <audio src={rec.audioPath} controls className="w-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


