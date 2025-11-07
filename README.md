# AutoCut v2.0 ✂️

Professional browser-based video editor powered by [WebAV](https://github.com/WebAV-Tech/WebAV) and WebCodecs. Edit videos with per-clip effects, real-time preview, and MP4 export - all in your browser, no server required.

## Features

### Timeline Editing
- **Multi-clip timeline** with drag-and-drop video upload
- **Split clips** at any point on the timeline
- **Delete clips** with automatic timeline reorganization
- **Per-clip properties**: Each clip has independent filters, speed, and opacity
- **Real-time preview** with video and audio playback

### Visual Effects (Per-Clip)
- **Filters**: Grayscale, Sepia, Brightness, Contrast, Blur
- **Opacity control**: 0-100% transparency
- **Playback speed**: 0.5x to 2x (future feature)

### Export
- **True MP4 export**: Uses WebCodecs for hardware-accelerated encoding
- **Sequential rendering**: Clips exported in timeline order
- **Progress tracking**: Real-time export progress indicator

## Quick Start

### Live Demo
Visit: https://archeryue.github.io/AutoCut/

### Local Development
```bash
# Clone the repository
git clone https://github.com/archeryue/AutoCut.git
cd AutoCut

# Install dependencies (for tests)
npm install

# Open in browser
open index.html

# Or serve with Python
python -m http.server 8000
# Visit http://localhost:8000
```

### Running Tests
```bash
npm test           # Run all 61 tests
npm run test:watch # Watch mode
npm run test:ui    # Visual test runner
```

## How to Use

1. **Upload Video**: Click "Upload Video" or drag-and-drop a video file
2. **Edit Timeline**:
   - Click clips to select them
   - Use "Split Clip" to cut at current playhead position
   - Use "Delete Clip" to remove selected clip
3. **Apply Effects**: Select a clip, then choose filters from the Filters tab
4. **Preview**: Use play/pause controls to preview your edits
5. **Export**: Click "Export Video" to render final MP4

## Architecture

### WebAV Integration
AutoCut v2.0 uses [WebAV](https://github.com/WebAV-Tech/WebAV) for video processing:

- **MP4Clip**: Decodes video files using WebCodecs
- **OffscreenSprite**: Represents clips with trim offsets and effects
- **Combinator**: Encodes final video with hardware acceleration

### Key Technologies
- **WebCodecs API**: Hardware-accelerated video encoding/decoding (Chrome 94+, Edge 94+)
- **Web Audio API**: Real-time audio playback with scheduling
- **Canvas API**: Real-time video preview
- **ES6 Modules**: Modern JavaScript with CDN imports

### Browser Support
- ✅ Chrome 94+
- ✅ Edge 94+
- ⚠️ Firefox/Safari: Limited WebCodecs support

## Project Structure

```
AutoCut/
├── index.html              # Main UI
├── favicon.svg             # ✂️ icon
├── css/
│   └── styles.css          # Dark theme styling
├── js/
│   └── app.js              # Main application logic
├── tests/                  # Test suite (61 tests)
│   ├── setup.js
│   ├── mocks/
│   │   └── webav.js
│   ├── mp4clip-initialization.test.js
│   ├── export-issues.test.js
│   ├── playback-timeline.test.js
│   └── integration.test.js
└── package.json
```

## Technical Highlights

### Real-time Preview
- Uses `MP4Clip.tick(time)` for frame-by-frame playback
- Audio scheduled on Web Audio API timeline (no overlap/gaps)
- Filters applied via Canvas 2D context

### Export Process
- Creates **new** OffscreenSprite instances for each timeline clip
- Configures sprites with correct `time.offset` (trim in source) and `time.duration`
- Combinator encodes sprites sequentially in timeline order
- Outputs MP4 stream collected as chunks and downloaded

### Key Concepts
- **`sprite.time.offset`**: Trim offset WITHIN source clip (0 = start from beginning)
- **`spriteState.startTime`**: Position ON the timeline
- These are separate! Confusing them causes bugs.

## Known Limitations

1. **Browser Support**: Requires WebCodecs (Chrome/Edge only)
2. **Single Video Track**: One video file on timeline at a time
3. **Filters in Export**: Filters are preview-only, not encoded (WebAV limitation)
4. **Large Files**: Memory constraints for very long/high-resolution videos

## Development

### Test Coverage
The project has comprehensive tests (61 passing tests) that document:
- Correct MP4Clip initialization patterns
- Export issues (black frames, wrong order)
- Playback rendering and audio scheduling
- Timeline offset handling (split/delete operations)

See `tests/README.md` for details.

### Adding Features

**New Filter**:
1. Add filter UI in index.html (Filters tab)
2. Add filter application in `applyFilters()` function (js/app.js)
3. Store filter state in `spriteState.filters` object

**Timeline Operations**:
- Timeline rendering: `renderTimeline()` in js/app.js
- Sprite creation: `addMaterialToTimeline()` in js/app.js
- Split/delete logic: `splitClip()` and `deleteClip()` in js/app.js

## Contributing

Contributions welcome! Areas for improvement:
- [ ] Audio track editing
- [ ] Multiple video tracks
- [ ] Transitions between clips
- [ ] Text overlays
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Mobile responsive design

## License

MIT License

## Acknowledgments

Built with:
- [WebAV](https://github.com/WebAV-Tech/WebAV) - WebCodecs-based video processing library
- WebCodecs API - Hardware-accelerated encoding/decoding
- Modern Web APIs
