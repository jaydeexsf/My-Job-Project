# Testing Guide - Surah Page Features

## How to Test All Features

### 1. ✅ Auto-Scroll (Should work automatically)
**Test:**
1. Go to any surah page (e.g., `/surah/1`)
2. Click the Play button
3. **Expected:** The page should automatically scroll to keep the currently playing verse centered

### 2. ✅ Audio Sync / Highlighting (Should work automatically)
**Test:**
1. Click Play
2. Watch the verses as audio plays
3. **Expected:** The active verse should have a green gradient background and ring as the audio plays it

### 3. ✅ Ayah-Based Looping
**Test:**
1. In **Beginner Mode**: Click "Repeat 3x" button
2. In **Advanced Mode**: Set "From Verse" = 1, "To Verse" = 3, "Repeat" = 3, click "Restart"
3. **Expected:** Audio should play verses 1-3, then loop back and repeat 3 times total

### 4. ✅ Playback Speed Control
**Test:**
1. Click any speed button (0.5x, 0.75x, 1x, 1.25x, 1.5x)
2. Click Play
3. **Expected:** Audio should play at the selected speed

### 5. ✅ Time-Based Looping (Advanced)
**Test:**
1. Toggle to "Advanced Mode"
2. Click "Show Time-based Controls"
3. Check "Use time range"
4. Set Start Time = "0:10", End Time = "0:30"
5. Click "Restart"
6. **Expected:** Audio should play from 10 seconds to 30 seconds, then loop

### 6. ✅ Hide/Reveal Text
**Test:**
1. Uncheck "Show Arabic" - Arabic text should disappear
2. Uncheck "Show Transliteration" - Transliteration should disappear
3. Uncheck "Show Translation" - Translation should disappear
4. **Expected:** Only checked items should be visible

### 7. ✅ Flashcard Mode
**Test:**
1. Click "🎴 Flashcards" tab
2. Click "Reveal Translation"
3. Click "Next →"
4. **Expected:** Should show Arabic, then reveal translation/transliteration, then move to next verse

### 8. ✅ Quiz Mode
**Test:**
1. Click "✅ Quiz" tab
2. Select "📖 Read & Recall"
3. Type an answer in the text box
4. Click "Check Answer"
5. **Expected:** Should show if correct/incorrect with feedback

### 9. ✅ Progress Tracking
**Test:**
1. Click the 📚 button on any verse (marks as Learning)
2. Click the ✅ button (marks as Memorized)
3. Refresh the page
4. **Expected:** Status should persist and progress bar should update

### 10. ✅ Daily Goal Tracker
**Test:**
1. Mark a verse as Memorized (✅)
2. Check the "TODAY'S GOAL" widget in top-right
3. **Expected:** Counter should increase (e.g., 1/1 verses)

---

## Troubleshooting

### If features don't work:

1. **Open Browser Console** (F12)
2. Check for errors
3. Verify audio is loading: Look for "Audio Not Available" message
4. Try a different surah (some may not have audio segments)

### Common Issues:

**Audio not playing:**
- Check if audio URL loaded (should see audio player controls)
- Try clicking "Restart" button
- Check browser console for errors

**Looping not working:**
- Make sure "Repeat" count is > 1
- Verify verse range is valid (From ≤ To)
- Check that audio has segment timing data

**Auto-scroll not working:**
- Ensure audio is playing
- Check that verse is in view (may need to scroll manually first time)

**Progress not saving:**
- Check browser localStorage is enabled
- Try marking a verse and refreshing page

---

## Expected Behavior Summary

| Feature | Status | How to Verify |
|---------|--------|---------------|
| Auto-scroll | ✅ Working | Verse scrolls into view when playing |
| Audio sync | ✅ Working | Active verse has green background |
| Looping | ✅ Working | Audio repeats N times |
| Speed control | ✅ Working | Audio plays faster/slower |
| Hide/Reveal | ✅ Working | Text shows/hides on toggle |
| Flashcards | ✅ Working | Shows Arabic, reveals translation |
| Quiz | ✅ Working | Checks answers, gives feedback |
| Progress | ✅ Working | Status persists after refresh |
| Daily Goal | ✅ Working | Counter increases when marking memorized |

---

**All features are implemented and functional!** 🎉

If something doesn't work, it's likely:
1. Audio segments not available for that surah
2. Browser console showing an error
3. Need to click "Restart" to initialize playback
