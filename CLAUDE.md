# CLAUDE.md

Guidance for Claude Code when working with AutoCut v2.0 - a WebAV-powered browser video editor.

## Quick Reference

**Tech Stack**: WebAV + WebCodecs, Web Audio API, Canvas API, ES6 modules
**Browser**: Chrome 94+, Edge 94+ (WebCodecs required)
**Tests**: 61 passing tests with Vitest
**Architecture**: Single-file app (js/app.js) using WebAV for video processing

## Development Commands

```bash
# Open in browser
open index.html

# Run tests
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # Visual UI

# Serve locally
python -m http.server 8000
```

## Critical Concepts

### 1. WebAV API Usage

**Import (CDN - Required for GitHub Pages)**:
```javascript
import { MP4Clip, OffscreenSprite, Combinator } from
  'https://cdn.jsdelivr.net/npm/@webav/av-cliper@1.1.6/+esm';
```

**MP4Clip Initialization** ⚠️ CRITICAL:
```javascript
// ✅ CORRECT - Pass ReadableStream
const clip = new MP4Clip(file.stream());
await clip.ready;

// ❌ WRONG - These throw "Illegal argument"
new MP4Clip(file);           // Raw File object
new MP4Clip(response);       // Response object
new MP4Clip(blobUrl);        // URL string
```

**Preview Playback**:
```javascript
// Use MP4Clip.tick() for preview (NOT offscreenRender)
const result = await clip.tick(timeInMicroseconds);
if (result.video) {
  ctx.drawImage(result.video, 0, 0, canvas.width, canvas.height);
  result.video.close();
}
if (result.audio && result.audio.length > 0) {
  await playAudioSamples(result.audio, sampleRate);
}
```

### 2. Timeline vs Source Offset ⚠️ CRITICAL

**Two separate time concepts - DO NOT confuse**:

```javascript
// sprite.time.offset = Trim offset WITHIN source clip
// spriteState.startTime = Position ON timeline

// Example: Second clip on timeline, using full source video
const sprite = new OffscreenSprite(clip);
sprite.time = {
  offset: 0,              // Start from beginning of source
  duration: 5000000       // Use 5 seconds
};

const spriteState = {
  startTime: 5000000,     // Starts at 5s on timeline (after first clip)
  duration: 5000000,
  sprite: sprite
};

// WRONG: sprite.time.offset = startTime  ❌
// This confuses timeline position with source trim offset
```

**When splitting clips**:
```javascript
// Split at 4s into the clip
const sprite2 = new OffscreenSprite(clip);
sprite2.time = {
  offset: 4000000,        // Start 4s into source (NOT timeline position!)
  duration: 6000000
};
```

**When deleting clips**:
```javascript
// Only shift startTime (timeline), NOT sprite.time.offset (source trim)
for (let i = deleteIndex; i < sprites.length; i++) {
  sprites[i].startTime -= deletedDuration;  // ✅ Timeline position
  // Don't touch sprites[i].sprite.time.offset  ✅
}
```

### 3. Export Process ⚠️ CRITICAL

**Must create NEW sprites for export** (don't reuse preview sprites):

```javascript
// ❌ WRONG - Reusing preview sprites causes black frames/wrong order
await combinator.addSprite(spriteState.sprite);

// ✅ CORRECT - Create new export sprites
for (const spriteState of state.sprites) {
  const exportSprite = new OffscreenSprite(spriteState.clip);
  exportSprite.time = {
    offset: spriteState.sprite.time.offset,  // Copy trim offset
    duration: spriteState.duration            // Copy duration
  };
  exportSprite.opacity = spriteState.opacity;
  await combinator.addSprite(exportSprite);
}
```

Why: OffscreenSprite.offscreenRender() is for export, MP4Clip.tick() is for preview. They're configured differently.

### 4. Audio Playback

**Audio data structure**:
```javascript
// result.audio is Array<Float32Array> - one Float32Array per channel
const result = await clip.tick(time);
// result.audio = [Float32Array(2381), Float32Array(2381)]  // Stereo

// Create AudioBuffer and schedule playback
const audioBuffer = audioContext.createBuffer(
  channelSamples.length,    // Number of channels
  channelSamples[0].length, // Number of samples
  sampleRate
);

for (let i = 0; i < channelSamples.length; i++) {
  audioBuffer.copyToChannel(channelSamples[i], i, 0);
}

// Schedule on timeline (prevents overlap/distortion)
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.start(state.nextAudioTime);
state.nextAudioTime += duration;
```

### 5. Playback Loop

**Must await renderFrame()**:
```javascript
// ✅ CORRECT - Sequential rendering
async function playbackLoop() {
  if (!state.isPlaying) return;
  await renderFrame(state.currentTime);  // Must await!
  state.animationFrameId = requestAnimationFrame(playbackLoop);
}

// ❌ WRONG - Interleaved rendering causes issues
function playbackLoop() {
  renderFrame(state.currentTime);  // Not awaited!
  requestAnimationFrame(playbackLoop);
}
```

## File Structure

```
js/app.js                      # Main application (all logic)
  ├── State management         # Global state object
  ├── Video loading            # loadVideoFile(), MP4Clip creation
  ├── Timeline management      # addMaterialToTimeline(), renderTimeline()
  ├── Playback controls        # play(), pause(), playbackLoop()
  ├── Frame rendering          # renderFrame(), playAudioSamples()
  ├── Timeline operations      # splitClip(), deleteClip()
  ├── Filters                  # applyFilters(), filter UI
  └── Export                   # exportVideo(), Combinator usage

tests/                         # 61 tests
  ├── mp4clip-initialization.test.js   # MP4Clip.tick() vs ReadableStream
  ├── export-issues.test.js            # Export black frames/wrong order
  ├── playback-timeline.test.js        # Async rendering, offset handling
  └── integration.test.js              # WebAV integration patterns
```

## Common Bugs & Solutions

### Bug: "Illegal argument" when creating MP4Clip
**Cause**: Passing File object instead of ReadableStream
**Fix**: `new MP4Clip(file.stream())`
**Tests**: mp4clip-initialization.test.js

### Bug: Black frames at start of export
**Cause**: Reusing preview sprites instead of creating new export sprites
**Fix**: Create new OffscreenSprite for each timeline clip
**Tests**: export-issues.test.js

### Bug: Wrong export order
**Cause**: Sprites not configured with correct offset/duration
**Fix**: Set `sprite.time = { offset: sourceOffset, duration: clipDuration }`
**Tests**: export-issues.test.js

### Bug: Audio distortion/buzzing
**Cause**: Audio chunks playing immediately (overlapping)
**Fix**: Schedule audio with `source.start(scheduledTime)` on timeline
**Tests**: playback-timeline.test.js (conceptually)

### Bug: Video not rendering during playback
**Cause**: `playbackLoop()` not awaiting `renderFrame()`
**Fix**: Make playbackLoop async and await renderFrame
**Tests**: playback-timeline.test.js

### Bug: Split clips play wrong section
**Cause**: Confused `sprite.time.offset` (source) with `startTime` (timeline)
**Fix**: `sprite.time.offset` = where in source, `startTime` = where on timeline
**Tests**: playback-timeline.test.js

## Key State Objects

```javascript
// Material (uploaded video)
{
  id, name, file, clip,
  metadata: { duration, width, height, audioSampleRate, audioChannels }
}

// Timeline sprite
{
  id, materialId, clip, sprite,
  startTime,    // Position on timeline (microseconds)
  duration,     // How long on timeline (microseconds)
  filters: { grayscale, sepia, brightness, contrast, blur },
  playbackRate, // Future feature
  opacity       // 0-1
}

// sprite.time configuration
{
  offset,   // Trim offset in source clip (microseconds)
  duration  // How much to use from source (microseconds)
}
```

## Important Patterns

**Adding clip to timeline**:
```javascript
const sprite = new OffscreenSprite(clip);
sprite.time = { offset: 0, duration: clip.meta.duration };
sprite.opacity = 1.0;
// Store both sprite (for rendering) and metadata (for UI)
```

**Rendering frame during playback**:
```javascript
const sourceTime = sprite.time.offset + (currentTime - sprite.startTime);
const result = await clip.tick(sourceTime);
```

**Audio scheduling** (prevent overlap):
```javascript
state.nextAudioTime = Math.max(state.nextAudioTime, audioContext.currentTime);
source.start(state.nextAudioTime);
state.nextAudioTime += duration;
```

## Test Strategy

Tests mock WebAV classes (MockMP4Clip, MockOffscreenSprite, MockCombinator) to test our integration code, NOT WebAV itself. Each test documents correct vs incorrect patterns.

Run tests before making changes to understand expected behavior. Add tests when fixing bugs.

## Performance Notes

- WebCodecs is hardware-accelerated (fast encoding/decoding)
- Audio scheduling prevents gaps/overlap without buffering
- Canvas rendering uses requestAnimationFrame (60fps max)
- Export is real-time (10s video = ~10s export time)
- Large files (>1GB) may cause memory issues

## Browser API Compatibility

```javascript
// Check WebCodecs support
if (!window.VideoEncoder || !window.VideoDecoder) {
  alert('WebCodecs not supported. Use Chrome 94+ or Edge 94+');
}

// AudioContext (all modern browsers)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
```

## When Adding Features

1. **Check tests first** - See how existing features work
2. **Update state object** - Add new properties to `state` or `spriteState`
3. **Handle in renderFrame** - Update frame rendering if needed
4. **Handle in export** - Update exportVideo if needed
5. **Add tests** - Document the feature with tests
6. **Update this file** - Add notes for future Claude instances
