# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoCut is a browser-based video editor built with vanilla JavaScript, HTML5, and CSS3. It runs entirely client-side with no server required. The application uses HTML5 Video API, Canvas API, and MediaRecorder API to provide real-time video editing, filter application, and export functionality.

## Development Commands

### Running the Application
```bash
# Serve with Python (recommended)
python -m http.server 8000
# Then visit http://localhost:8000

# Alternative: Node.js
npx http-server

# Or simply open index.html directly in browser
open index.html
```

### NPM Scripts
```bash
npm start  # Starts Python HTTP server on port 8000
npm run dev  # Same as npm start
```

No build process, linting, or tests are configured. This is a pure client-side application.

## Architecture

### Two-Layer Architecture

**VideoEditor Class (js/video-editor.js)**: Core editing engine
- Manages video state, clips, and filters
- Provides editing operations (split, trim, delete, reorganize)
- Handles playback control
- Canvas rendering with filter pipeline
- Export configuration generation

**Application Layer (js/app.js)**: UI and event handling
- DOM event listeners for all user interactions
- Timeline rendering and clip visualization
- File upload and drag-and-drop handling
- Real-time UI synchronization with video state

### Key Technical Patterns

#### Dual Video Architecture: Hidden Video + Visible Canvas

The app uses a hidden `<video>` element for decoding/playback/audio and a visible `<canvas>` element for displaying filtered frames:

```javascript
// Video element is hidden (1px, opacity 0) but plays normally
video.style.opacity = '0';

// Canvas displays video with filters applied in real-time
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
ctx.filter = 'grayscale(100%)';
ctx.drawImage(canvas, 0, 0);
```

**Why**: Allows real-time pixel manipulation without re-encoding, while keeping native audio playback.

#### Event-Driven UI Synchronization

UI state is synchronized via native video events:
```javascript
video.addEventListener('play', updatePlayPauseButton);
video.addEventListener('pause', updatePlayPauseButton);
video.addEventListener('timeupdate', updateTimeDisplay);
video.addEventListener('ended', updatePlayPauseButton);
```

The video element is the single source of truth. The UI reacts to its state changes.

#### Canvas Stream Capture for Export

Export works by capturing the canvas as a live video stream:
```javascript
const stream = canvas.captureStream(30);  // 30 fps
const audioTracks = video.captureStream().getAudioTracks();
audioTracks.forEach(track => stream.addTrack(track));
const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
```

The video plays through once while recording, baking filters directly into output.

#### Clip Data Structure

Each clip references a portion of the source video:
```javascript
{
    id: 0,
    startTime: 0,        // Start in source video (seconds)
    endTime: 10,         // End in source video (seconds)
    startPosition: 0,    // Timeline position start
    endPosition: 10,     // Timeline position end
    duration: 10         // Clip duration
}
```

Operations like split and delete manipulate this structure non-destructively.

### Filter Pipeline

Filters are applied using Canvas 2D context:
- Rendering uses `requestAnimationFrame` loop while playing
- Updates on `timeupdate` and `seeked` events when paused
- CSS-like filters: grayscale, sepia, brightness, contrast
- Canvas properties: globalAlpha for opacity

## File Structure

```
AutoCut/
├── index.html          # Main HTML structure, UI layout
├── css/
│   └── styles.css      # All styling (dark theme)
├── js/
│   ├── video-editor.js # VideoEditor class (core engine)
│   └── app.js          # Application logic, event handlers, UI updates
└── package.json        # Minimal package file with start scripts
```

## Important Implementation Details

### VideoEditor Class (js/video-editor.js)

**Key Methods**:
- `init(videoElement, canvasElement)` - Initialize with DOM elements
- `loadVideo(file)` - Load video from File object, returns promise with metadata
- `splitClip(clipId, splitTime)` - Split clip at timeline position
- `deleteClip(clipId)` - Remove clip and reorganize timeline
- `reorganizeClips()` - Recalculate clip positions after deletion
- `applyFilters()` - Draw current frame with filters to canvas
- `startRendering()` - Begin requestAnimationFrame loop for playback
- `setFilter(filterName, value)` - Apply specific filter
- `seekTo(position)` - Jump to timeline position
- `getExportConfig()` - Get clip/filter configuration for export

**State Properties**:
- `clips[]` - Array of clip objects
- `filters{}` - Current filter state
- `selectedClip` - Currently selected clip
- `isPlaying` - Playback state
- `currentTime`, `duration` - Time tracking

### Application Layer (js/app.js)

**Key Functions**:
- `handleFile(file)` - Process uploaded/dropped video file
- `renderTimeline()` - Redraw timeline with all clips
- `createClipElement(clip, totalDuration)` - Generate clip DOM element
- `selectClip(clip)` - Select clip and update UI
- `splitCurrentClip()` - Split selected clip at current time
- `deleteSelectedClip()` - Delete selected clip with confirmation
- `applyFilter(filterName)` - Apply filter via VideoEditor
- `exportVideo()` - Real video export using MediaRecorder
- `updatePlayPauseButton()` - Sync button state with video
- `updateTimeDisplay()` - Update time/progress displays
- `updateProgressBar(currentTime, duration)` - Update progress bar UI

**Export Implementation** (js/app.js:592-709):
The export function plays through the entire video while recording canvas output with MediaRecorder. Progress is tracked via timeupdate events and displayed in real-time.

### Browser Compatibility Notes

- Canvas `captureStream()` (Chrome/Edge) vs `mozCaptureStream()` (Firefox)
- MediaRecorder mime type support varies by browser
- Fallback order: MP4 → WebM H264 → WebM VP9
- Context options: `{ willReadFrequently: true }` for filter performance

## Common Workflows

### Adding a New Filter
1. Add filter button to index.html with `data-filter="filterName"`
2. Add filter to VideoEditor's `filters` object (js/video-editor.js:14)
3. Implement filter logic in `applyFilters()` method (js/video-editor.js:229)
4. Add case to `applyFilter()` switch in app.js (js/app.js:528)

### Modifying Timeline Behavior
- Timeline rendering: `renderTimeline()` in js/app.js:223
- Clip creation: `createClipElement()` in js/app.js:248
- Timeline interaction: `handleTimelineClick()` in js/app.js:320
- Playhead updates: `updatePlayhead()` in js/app.js:365

### Extending Export Functionality
- Export logic: `exportVideo()` in js/app.js:592
- Quality/format settings: Lines 611-628
- Progress tracking: `updateExportProgress()` in js/app.js:572
- MediaRecorder setup: Lines 646-677

## Technical Constraints

- **No build process**: Pure vanilla JavaScript, no transpilation or bundling
- **No dependencies**: No npm packages, frameworks, or libraries
- **Client-side only**: All processing happens in browser
- **Single video track**: Only one video file loaded at a time
- **Browser API limitations**: Export quality/formats limited by MediaRecorder support
- **Memory constraints**: Large videos loaded entirely into memory may cause performance issues

## Code Style

- ES6+ JavaScript (classes, arrow functions, const/let, async/await)
- Clear function names describing actions (handleFileUpload, renderTimeline)
- JSDoc-style comments for major functions
- Event-driven architecture with addEventListener
- No global state except `editor`, `currentVideo`, and drag tracking
- Modular organization: VideoEditor class vs app.js functions
