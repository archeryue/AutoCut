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
- **File API**: For handling video file uploads
- **Drag and Drop API**: For intuitive file import

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
