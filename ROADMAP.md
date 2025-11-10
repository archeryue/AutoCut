# AutoCut Enhancement Roadmap

This document outlines planned enhancements for AutoCut v2.0 with detailed implementation plans.

## Status Legend
- ✅ **Completed** - Implemented and tested
- 🚧 **In Progress** - Currently being developed
- 📋 **Planned** - Ready to implement
- 💭 **Future** - Idea for future consideration

---

## Recently Completed ✅

### Playback Speed Timeline Fix (2025-11-09)
**Status**: ✅ Completed

**What it does**:
- Timeline duration automatically adjusts when playback speed changes (2x = half duration)
- Subsequent clips shift positions automatically
- Split clips preserve playback rate correctly

**Files modified**:
- `src/app.ts`: Updated `setSelectedSpriteSpeed()` and `splitClip()` functions
- Tests: All 61 unit + 7 E2E tests pass

### Inspector Panel (2025-11-09)
**Status**: ✅ Completed

**What it does**:
- Right-side panel for clip properties (speed, opacity, volume)
- Auto-shows when clip selected, auto-hides when deselected
- Clean separation: Left = Asset Library, Right = Clip Editor

**Files modified**:
- `index.html`: Added right inspector panel structure
- `public/css/styles.css`: Added inspector styles and 3-column layout
- `src/app.ts`: Added inspector functions and event handlers
- `e2e/autocut.spec.ts`: Updated tests to use new inspector selectors

---

## Priority 1: Core Functionality 📋

### 1. Volume Control
**Status**: ✅ Completed (2025-11-09)

**What it does**:
- Per-clip volume adjustment (0-100%) using Web Audio API GainNode
- Mute checkbox for individual clips
- Volume controls in inspector panel
- Real-time volume adjustment during playback

**Implementation**:
- Added `volume` and `isMuted` properties to SpriteState
- Updated `playAudioSamples()` to accept volume/mute parameters
- Implemented GainNode for smooth volume control
- Wired up inspector controls
- All 61 unit + 10 E2E tests pass

**Files modified**:
- `src/types/app.ts`
- `src/app.ts`
- `e2e/autocut.spec.ts` (added volume control test)

---

### 2. Keyboard Shortcuts
**Status**: ✅ Completed (2025-11-09)

**What it does**:
Comprehensive keyboard shortcuts for video editing workflow:
- `Space` / `K` - Play/Pause
- `J` / `L` - Rewind/Forward 1 second
- `S` - Split clip at playhead
- `Delete` / `Backspace` - Delete selected clip
- `Arrow Left/Right` - Move playhead 1 frame (~33ms)
- `Arrow Up/Down` - Select previous/next clip
- `Home` / `End` - Go to timeline start/end
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo

**Implementation**:
- Created `handleKeyPress()` function with input field detection
- Added helper functions: seekRelative(), seekTo(), selectAdjacentClip()
- Keyboard shortcuts ignore input when typing in text fields
- All 61 unit + 10 E2E tests pass

**Files modified**:
- `src/app.ts`
- `e2e/autocut.spec.ts` (added keyboard shortcuts test)

---

### 3. Undo/Redo
**Status**: ✅ Completed (2025-11-09)

**What it does**:
- Full undo/redo support for split and delete operations
- Cmd/Ctrl+Z to undo, Cmd/Ctrl+Shift+Z to redo
- UI buttons in header with dynamic tooltips
- History stack with 50 action limit
- Snapshot-based state restoration

**Implementation**:
- Created `src/history.ts` with HistoryManager class
- Added snapshot helpers: createSpritesSnapshot(), restoreSpritesSnapshot()
- Wrapped splitClip() and deleteClip() with history tracking
- Added keyboard shortcuts and UI buttons
- All 61 unit + 7 E2E tests pass

**Files created**:
- `src/history.ts`

**Files modified**:
- `src/app.ts`
- `index.html`

---

## Priority 2: Lightweight Editing Features 📋

### 4. Transitions
**Status**: 📋 Planned

**Goal**: Simple transitions between clips (fade, dissolve)

**What it does**:
- Fade transition: Clip fades out while next fades in
- Dissolve/Cross-fade: Smooth blend between clips
- Simple duration control (0.5s, 1s, 2s)

**Implementation Plan**:
1. **Add transition property to clips**
   ```typescript
   export interface SpriteState {
     // ... existing properties
     transitionDuration: number; // microseconds, 0 = no transition
   }
   ```

2. **Render transitions during playback**
   - During transition period, render both clips with opacity blending
   - Simple linear fade works for lightweight editing

3. **Add transition UI**
   - Add "Transition" control to inspector panel
   - Dropdown: None, 0.5s, 1s, 2s
   - Apply to selected clip

4. **Export transitions**
   - Blend frames during export using Canvas compositing
   - Keep it simple - no complex wipes needed

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `index.html` (inspector panel)
- `e2e/autocut.spec.ts`

**Estimated effort**: 6-8 hours

---

### 5. Add Background Music/Audio
**Status**: 📋 Planned

**Goal**: Add separate audio tracks (background music, sound effects)

**What it does**:
- Upload audio files (MP3, WAV, etc.)
- Audio plays alongside video audio
- Volume control for background audio
- Trim audio to fit video duration

**Implementation Plan**:
1. **Add audio file upload**
   - New "Audio" tab in left sidebar (already exists!)
   - Upload audio files, show in audio list
   - Audio file metadata (duration, sample rate)

2. **Add audio state**
   ```typescript
   export interface AudioTrack {
     id: string;
     name: string;
     file: File;
     startTime: number; // Position on timeline
     duration: number;
     volume: number; // 0-1
     isMuted: boolean;
   }
   ```

3. **Render audio during playback**
   - Mix background audio with video audio using Web Audio API
   - GainNode for volume control

4. **Export with background audio**
   - Research WebAV audio mixing support
   - May need to mix audio manually before export

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `e2e/autocut.spec.ts`

**Estimated effort**: 8-10 hours

---

### 6. Add Stickers/Overlays
**Status**: 📋 Planned

**Goal**: Add image overlays (stickers, logos, watermarks)

**What it does**:
- Upload PNG/SVG images
- Position on video (drag to move)
- Resize and adjust opacity
- Duration control (when sticker appears/disappears)

**Implementation Plan**:
1. **Add sticker upload**
   - New "Stickers" tab or section
   - Upload image files (PNG, SVG, JPG)
   - Library of uploaded stickers

2. **Add sticker state**
   ```typescript
   export interface Sticker {
     id: string;
     name: string;
     image: HTMLImageElement;
     x: number; // Position on canvas (0-1)
     y: number;
     width: number; // Size (0-1)
     height: number;
     startTime: number; // When to show
     duration: number; // How long to show
     opacity: number;
   }
   ```

3. **Render stickers during playback**
   - Draw images on canvas after rendering video frame
   - Simple canvas drawImage() with opacity

4. **Add sticker UI**
   - Drag to position on preview canvas
   - Inspector panel: position, size, opacity, timing

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `index.html` (new stickers tab)
- `public/css/styles.css`
- `e2e/autocut.spec.ts`

**Estimated effort**: 10-12 hours

---

### 7. Add Captions/Subtitles
**Status**: 📋 Planned

**Goal**: Add text captions/subtitles to video

**What it does**:
- Add text at specific timestamps
- Customize font, size, color, position
- Multiple caption styles (bottom centered, top, custom position)
- Export with captions burned into video

**Implementation Plan**:
1. **Add caption state**
   ```typescript
   export interface Caption {
     id: string;
     text: string;
     startTime: number;
     duration: number;
     style: {
       fontSize: number;
       fontFamily: string;
       color: string;
       backgroundColor: string;
       position: 'bottom' | 'top' | 'center' | 'custom';
       x?: number; // For custom position
       y?: number;
     };
   }
   ```

2. **Add caption editor UI**
   - Timeline view showing caption timing
   - Text editor for caption content
   - Style controls (font, color, position)

3. **Render captions during playback**
   - Canvas text rendering with background box
   - Display caption if current time is within its range

4. **Export with captions**
   - Burn captions into video during export
   - Canvas text rendering for each frame

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `index.html` (caption UI)
- `public/css/styles.css`
- `e2e/autocut.spec.ts`

**Estimated effort**: 8-10 hours

**Note**: Captions tab already exists in sidebar, just needs implementation!

---

---

## Priority 3: AI-Powered Features 🤖

### 8. AutoCut - Silence Detection
**Status**: 💭 Future

**Goal**: Automatically detect and remove silent sections from video

**What it does**:
- Analyze audio track for silent/quiet sections
- Automatically create cuts to remove silence
- Perfect for podcasts, tutorials, vlogs
- Adjustable silence threshold and minimum duration

**Implementation Plan**:
1. **Analyze audio with Web Audio API**
   ```typescript
   interface SilenceDetectionOptions {
     threshold: number; // Volume threshold (0-1)
     minDuration: number; // Minimum silence duration (ms)
     paddingBefore: number; // Keep N ms before speech
     paddingAfter: number; // Keep N ms after speech
   }
   ```

2. **Detect silent sections**
   - Use AnalyserNode to get audio levels
   - Find continuous sections below threshold
   - Mark sections for removal

3. **Auto-generate cuts**
   - Automatically split and remove silent clips
   - Keep spoken sections with padding
   - Preview before applying

4. **Add UI**
   - "AutoCut" button in timeline tools
   - Modal dialog with threshold slider and preview
   - Show detected silent sections highlighted on timeline

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `index.html` (AutoCut modal)
- `public/css/styles.css`
- `e2e/autocut.spec.ts`

**Estimated effort**: 12-15 hours

**Technical Notes**:
- Web Audio API AnalyserNode for real-time audio analysis
- May need to process entire video upfront (loading state)
- Consider using Web Workers for heavy processing

---

### 9. Cut with Language (Transcript-based Editing)
**Status**: 💭 Future

**Goal**: Edit video by editing transcript - delete words to delete video sections

**What it does**:
- Transcribe video audio to text (speech-to-text)
- Display interactive transcript with timestamps
- Click words/sentences to delete them from video
- Auto-remove filler words (um, uh, like, you know)
- Generate captions automatically from transcript

**Implementation Plan**:
1. **Speech-to-text transcription**
   - Option 1: Web Speech API (browser built-in, free but limited)
   - Option 2: OpenAI Whisper API (accurate but requires API key)
   - Option 3: AssemblyAI / Deepgram (specialized STT services)

   ```typescript
   interface TranscriptWord {
     word: string;
     startTime: number; // microseconds
     endTime: number;
     confidence: number;
   }

   interface Transcript {
     words: TranscriptWord[];
     language: string;
   }
   ```

2. **Interactive transcript editor**
   - Display transcript in sidebar or modal
   - Click word to select/deselect
   - Click sentence to select/deselect
   - Highlight words as video plays
   - Deleted words marked with strikethrough

3. **Apply transcript edits to timeline**
   - Convert deleted words to timeline cuts
   - Automatically split and remove corresponding video sections
   - Keep selected words, remove unselected

4. **Auto-remove filler words**
   - Detect common filler words (um, uh, like, you know, so, basically)
   - One-click to remove all fillers
   - Adjustable word list

5. **Auto-generate captions**
   - Convert transcript to caption format
   - Automatically time captions to words
   - Export captions with video

**Files to modify**:
- `src/types/app.ts`
- `src/app.ts`
- `index.html` (transcript panel)
- `public/css/styles.css`
- `e2e/autocut.spec.ts`

**Estimated effort**: 20-25 hours

**Technical Considerations**:
- **Web Speech API**: Free, built-in, but accuracy varies and requires internet
- **Whisper API**: More accurate, costs ~$0.006/minute, requires API key
- **Privacy**: Keep audio processing client-side when possible
- **Performance**: Transcription can be slow for long videos
- **Language support**: Start with English, expand later

**User Flow**:
1. User clicks "Generate Transcript" button
2. System transcribes audio (show progress)
3. Transcript appears in sidebar with timestamps
4. User clicks words/sentences to delete
5. Click "Apply Edits" to cut video based on transcript
6. Optional: Auto-generate captions from cleaned transcript

---

### 10. Remove Filler Words (Quick AI Edit)
**Status**: 💭 Future

**Goal**: One-click removal of filler words (um, uh, like)

**What it does**:
- Detect filler words in speech
- One-click to remove all instances
- Faster than full transcript editing
- Perfect for cleaning up presentations

**Implementation Plan**:
- Similar to transcript editing but simplified
- Only detect and remove common fillers
- No need for full transcript UI
- Quick "Remove Filler Words" button

**Estimated effort**: 8-10 hours (depends on transcript feature)

---

## Not Planned (Too Complex for Lightweight Editor) 🚫

These features are too complex and better suited for professional NLE software:

- ❌ **Multi-track Timeline** - Too complex, single timeline is simpler
- ❌ **Keyframe Animation** - Advanced feature, not needed for casual editing
- ❌ **Advanced Transitions** (wipes, 3D transitions) - Simple fade/dissolve is enough
- ❌ **Clip Trimming Handles** - Split workflow is simpler for users
- ❌ **Snapping** - Nice to have but not essential

---

## Implementation Order

### Phase 1 (Completed 2025-11-09) ✅
1. ✅ Playback Speed Fix
2. ✅ Inspector Panel
3. ✅ Volume Control
4. ✅ Keyboard Shortcuts
5. ✅ Undo/Redo

**Test Coverage**: All features verified with 61 unit tests + 10 E2E tests

### Phase 2 (Lightweight Features - Future sessions)
4. Transitions (fade, dissolve)
5. Add Background Music/Audio
6. Add Stickers/Overlays
7. Add Captions/Subtitles

### Phase 3 (AI-Powered Features - Long-term)
8. AutoCut - Silence Detection (auto-remove silent sections)
9. Cut with Language (transcript-based editing)
10. Remove Filler Words (one-click cleanup)

### Nice-to-Have (Optional)
- Audio Waveforms (visual feedback on timeline)
- Clip Trimming Handles (alternative to split workflow)
- Snapping (magnetic alignment)

---

## Notes

- **Testing is mandatory** for all features - see CLAUDE.md testing policy
- **WebAV limitations** may affect some features (transitions, multi-track)
- **Performance** must be considered for complex features (waveforms, keyframes)
- **Browser compatibility** - Chrome 94+ / Edge 94+ only (WebCodecs requirement)

---

**Last updated**: 2025-11-09
