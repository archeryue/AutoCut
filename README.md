# AutoCut - Web Video Editor

A powerful, browser-based video editing tool built with vanilla JavaScript, HTML5, and CSS3. No server required - everything runs in your browser!

## Features

### Core Editing
- **Video Import**: Drag-and-drop or upload video files
- **Timeline Editor**: Visual timeline with clip management
- **Split Clips**: Cut videos at any point
- **Delete Clips**: Remove unwanted segments
- **Trim**: Adjust clip start and end points
- **Playback Controls**: Play, pause, stop, and scrub through your video

### Visual Effects
- **Filters**: Apply grayscale, sepia, brightness, and contrast filters
- **Opacity Control**: Adjust video transparency
- **Real-time Preview**: See changes instantly as you edit

### Playback Options
- **Variable Speed**: 0.5x, 1x, 1.5x, and 2x playback speeds
- **Volume Control**: Adjust audio levels
- **Timeline Scrubbing**: Click anywhere on the timeline to jump to that point

### Export
- **Multiple Formats**: Export as MP4 or WebM
- **Quality Settings**: Choose between low, medium, and high quality
- **Configuration Export**: Get a JSON export of your edit decisions

## Getting Started

### Quick Start
1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, or Safari)
2. Drag and drop a video file onto the drop zone, or click "Upload Video"
3. Use the tools on the left sidebar to edit your video
4. Adjust properties in the right sidebar
5. Click "Export Video" when done

### No Installation Required
This is a pure client-side application. Simply:
```bash
# Open the file directly in your browser
open index.html

# Or serve it with a simple HTTP server
python -m http.server 8000
# Then visit http://localhost:8000
```

## Project Structure

```
AutoCut/
├── index.html          # Main application interface
├── css/
│   └── styles.css      # Application styling
├── js/
│   ├── app.js          # Main application logic and UI handlers
│   └── video-editor.js # Core video editing engine
├── assets/             # Assets directory (for future use)
└── README.md           # This file
```

## How It Works

### Architecture
AutoCut is built with a clean separation of concerns:

1. **VideoEditor Class** (`video-editor.js`): Core editing engine
   - Manages video state and clips
   - Handles filter application
   - Provides editing operations (split, trim, delete)
   - Controls playback

2. **Application Layer** (`app.js`): UI and interaction handling
   - Event listeners for user interactions
   - Timeline rendering
   - UI updates
   - File handling

3. **Presentation Layer** (`index.html` + `styles.css`): User interface
   - Responsive layout
   - Modern, dark-themed design
   - Intuitive controls

### Key Technologies
- **HTML5 Video API**: For video playback and control
- **Canvas API**: For applying real-time filters and effects
- **MediaRecorder API**: For capturing and exporting edited video
- **File API**: For handling video file uploads
- **Drag and Drop API**: For intuitive file import

### Technical Principles

#### 1. Dual Video Architecture: Hidden Video + Visible Canvas

AutoCut uses a clever architecture where:
- **Video Element** (hidden): Handles video decoding, playback, and audio
- **Canvas Element** (visible): Displays video frames with filters applied

```
User Video → Hidden <video> → Canvas draws frames → User sees filtered output
                    ↓
                  Audio
```

**Why this approach?**
- Allows real-time pixel manipulation without re-encoding
- Canvas provides access to raw frame data for filters
- Audio stays with the native video element
- What you see on canvas is exactly what gets exported

**Implementation:**
```javascript
// Video is hidden (1px, opacity 0) but still plays
video.style.opacity = '0';

// Canvas displays the video with filters
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
ctx.filter = 'grayscale(100%)';  // Apply filters
ctx.drawImage(canvas, 0, 0);      // Redraw with filter
```

#### 2. Event-Driven UI Synchronization

The UI automatically stays in sync with video state using native browser events:

```javascript
video.addEventListener('play', updateButton);        // Video starts
video.addEventListener('pause', updateButton);       // Video pauses
video.addEventListener('timeupdate', updateProgress); // Time updates
video.addEventListener('ended', updateButton);       // Video ends
```

**Benefits:**
- No polling required (efficient)
- Single source of truth: the video element
- Handles all edge cases (auto-pause, errors, etc.)
- UI always reflects actual state

**Example:** Play/pause button automatically updates when:
- User clicks the button
- Video reaches the end
- Video pauses during export
- Any other state change

#### 3. Canvas Stream Capture for Video Export

The export functionality uses a powerful technique:

```javascript
// Capture canvas as live video stream (30 fps)
const stream = canvas.captureStream(30);

// Add audio from the original video
const audioTracks = video.captureStream().getAudioTracks();
audioTracks.forEach(track => stream.addTrack(track));

// Record the combined stream
const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2500000  // 2.5 Mbps
});
```

**How it works:**
1. Canvas continuously displays video with filters
2. `captureStream()` creates a live video stream from canvas output
3. Audio tracks are captured from original video and added to stream
4. `MediaRecorder` records the combined audio/video stream
5. Video plays through once while recording
6. Result is downloaded as a new video file

**Why this is powerful:**
- No server-side processing needed
- No FFmpeg or external tools required
- Filters are "baked in" automatically
- Uses native browser APIs (efficient and fast)
- Export time = video duration (real-time encoding)

#### 4. Clip Data Structure & Timeline Management

Each clip is represented as:

```javascript
{
    id: 0,              // Unique identifier
    startTime: 0,       // Start time in source video (seconds)
    endTime: 10,        // End time in source video (seconds)
    startPosition: 0,   // Start position on timeline (seconds)
    endPosition: 10,    // End position on timeline (seconds)
    duration: 10        // Clip duration (endTime - startTime)
}
```

**Split Operation:**
```javascript
// User splits clip at 5 seconds
Original: [0s -------- 10s]

After split:
Clip 1: [0s --- 5s]
Clip 2: [5s --- 10s]

// Both clips reference different parts of the same source video
```

**Delete Operation:**
```javascript
// Delete Clip 2, remaining clips shift left
Before: [Clip1: 0-5s] [Clip2: 5-10s] [Clip3: 10-15s]
After:  [Clip1: 0-5s] [Clip3: 5-10s]

// Timeline positions automatically reorganized
```

**Benefits:**
- Non-destructive editing (original video unchanged)
- Multiple clips can reference the same source
- Easy to reorganize and rearrange

#### 5. Real-Time Filter Pipeline

Filters are applied using Canvas 2D context operations:

```javascript
applyFilters() {
    // 1. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Set opacity
    ctx.globalAlpha = 0.8;

    // 3. Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 4. Apply CSS-like filters
    ctx.filter = 'grayscale(100%) brightness(1.5)';

    // 5. Redraw with filters applied
    ctx.drawImage(canvas, 0, 0);
}
```

**Rendering Strategy:**
- **While playing**: Uses `requestAnimationFrame` loop for smooth 60fps rendering
- **While paused**: Updates on `timeupdate` and `seeked` events only
- **Efficient**: Only renders when necessary to save CPU/battery

**Filter Types:**
- **CSS Filters**: grayscale, sepia, brightness, contrast (GPU accelerated)
- **Canvas Properties**: globalAlpha for opacity
- **Extensible**: Easy to add custom pixel-level filters

#### 6. Progress Tracking & User Feedback

**Video Scrubber:**
- Progress bar synced with `video.currentTime`
- Click-to-seek: `video.currentTime = clickPosition * duration`
- Drag-to-scrub: Continuous `currentTime` updates

**Export Progress:**
```javascript
// Track export progress via timeupdate events
video.addEventListener('timeupdate', () => {
    const percent = (video.currentTime / duration) * 100;
    updateProgressBar(percent);
});
```

Real-time feedback shows:
- Progress percentage (0-100%)
- Current time / Total time
- Visual progress bar

#### 7. Browser Compatibility & Fallbacks

**Video Codec Support:**
```javascript
// Try MP4 first, fallback to WebM
if (MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
} else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
    mimeType = 'video/webm;codecs=h264';
} else {
    mimeType = 'video/webm;codecs=vp9';  // Most widely supported
}
```

**Browser Feature Detection:**
- Checks for `captureStream()` vs `mozCaptureStream()` (Firefox)
- Validates MediaRecorder codec support
- Graceful degradation when features unavailable

## Usage Guide

### Importing Videos
1. **Drag and Drop**: Drag a video file onto the drop zone
2. **File Upload**: Click "Upload Video" button and select a file

Supported formats: Any format your browser can play (typically MP4, WebM, OGG)

### Editing Your Video

#### Split a Clip
1. Select a clip on the timeline (it will highlight in green)
2. Scrub to the desired split point
3. Click "Split Clip" button
4. The clip will be divided into two separate clips

#### Delete a Clip
1. Select the clip you want to remove
2. Click "Delete Clip" button
3. Confirm the deletion
4. Remaining clips will automatically reorganize

#### Apply Filters
1. Select a filter from the left sidebar:
   - **None**: Remove all filters
   - **Grayscale**: Black and white effect
   - **Sepia**: Vintage/warm tone effect
   - **Brightness**: Increase brightness by 50%
   - **Contrast**: Increase contrast by 50%

2. The filter applies immediately to the video

#### Adjust Properties
- **Volume**: Use the slider to adjust audio level (0-100%)
- **Opacity**: Make video more or less transparent (0-100%)
- **Speed**: Change playback speed (0.5x to 2x)

### Timeline Navigation
- **Click**: Click anywhere on the timeline to jump to that time
- **Playhead**: The green line shows current playback position
- **Time Markers**: Display timestamps for easy navigation

### Exporting
1. Configure export settings in the right sidebar:
   - **Format**: MP4 or WebM
   - **Quality**: Low, Medium, or High

2. Click "Export Video"
3. View the export configuration (in a production version, this would generate the actual video)

## Browser Compatibility

AutoCut works best in modern browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

Required browser features:
- HTML5 Video
- Canvas 2D Context
- File API
- Drag and Drop API
- ES6+ JavaScript

## Limitations

This is a client-side demo version with some limitations:

1. **Export**: Currently shows export configuration instead of generating actual video files. For production, integrate FFmpeg.wasm or a backend service.

2. **Large Files**: Very large video files may cause performance issues as they're loaded entirely into memory.

3. **Complex Edits**: Advanced features like transitions, multiple tracks, and audio editing are not yet implemented.

4. **Browser Codec Support**: Export formats limited to what the browser can encode.

## Future Enhancements

Potential improvements for production use:

- [ ] FFmpeg.wasm integration for real video export
- [ ] Multiple video tracks
- [ ] Audio track editing
- [ ] Transitions between clips
- [ ] Text overlays and titles
- [ ] More advanced filters and color correction
- [ ] Undo/Redo functionality
- [ ] Project save/load
- [ ] Keyboard shortcuts
- [ ] Zoom controls for timeline
- [ ] Waveform visualization
- [ ] Batch processing

## Development

### Running Locally
No build process required! Just open `index.html` in your browser.

For development with live reload, use any static file server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

### Code Structure

**VideoEditor Class Methods:**
- `init()`: Initialize with video and canvas elements
- `loadVideo()`: Load video from file
- `splitClip()`: Split clip at time position
- `deleteClip()`: Remove clip
- `trimClip()`: Adjust clip bounds
- `applyFilters()`: Apply visual effects
- `setFilter()`: Set specific filter
- `setPlaybackRate()`: Change playback speed
- `setVolume()`: Adjust audio level

**Main Application Functions:**
- `handleFileUpload()`: Process uploaded files
- `renderTimeline()`: Draw timeline and clips
- `togglePlayPause()`: Control playback
- `splitCurrentClip()`: Split operation handler
- `deleteSelectedClip()`: Delete operation handler
- `applyFilter()`: Filter application handler
- `exportVideo()`: Export handler

## Contributing

This is a demonstration project. Feel free to fork and enhance it with your own features!

Some areas that would benefit from contributions:
- Real export functionality with FFmpeg.wasm
- Advanced editing features
- Performance optimizations
- Mobile responsiveness improvements
- Accessibility enhancements

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built with modern web technologies and best practices for client-side video editing.

---

**Note**: This is a browser-based video editor demonstration. For production use, consider integrating backend processing or WebAssembly solutions like FFmpeg.wasm for more robust video export capabilities.
