# CLAUDE.md

Guidance for Claude Code when working with AutoCut v2.0 - a WebAV-powered browser video editor.

## Quick Reference

**Tech Stack**: WebAV + WebCodecs, Web Audio API, Canvas API, ES6 modules
**Browser**: Chrome 94+, Edge 94+ (WebCodecs required)
**Tests**: 67 tests (61 unit + 6 E2E) - ALL MUST PASS
**Architecture**: Single-file app (src/app.ts) using WebAV for video processing

## 🚨 CRITICAL PRINCIPLE: Run Tests Yourself

**NEVER ask the user to manually test features. ALWAYS run automated tests yourself.**

### Testing Policy

1. **After implementing ANY feature**: Run `npm test && npm run test:e2e` yourself
2. **To verify functionality**: Use automated E2E tests (Playwright), not manual browser testing
3. **Export verification**: E2E test checks export works - trust the test results
4. **Debugging issues**: Use Playwright's screenshots/videos in `test-results/` directory
5. **If tests fail**: Fix the code and re-run tests until they pass

### Why This Matters

- **User's time is valuable**: Don't waste it on tasks automation can handle
- **Consistency**: Automated tests are reliable and repeatable
- **Efficiency**: Tests run faster than manual verification
- **Professionalism**: Testing is the developer's job, not the user's

**Remember**: The user should ONLY need to manually test if ALL automated tests pass and you suspect an edge case not covered by tests. In that case, add a new automated test first!

## Development Commands

```bash
# Open in browser
open index.html

# Run unit tests
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # Visual UI

# Run E2E tests (REQUIRED after implementing features)
npm run dev           # Start dev server (terminal 1)
npm run test:e2e      # Run E2E tests (terminal 2)

# Or run everything
npm test && npx playwright test

# Serve locally
python -m http.server 8000
```

## ⚠️ MANDATORY: E2E Testing Workflow

**CRITICAL**: After implementing ANY feature, you MUST run E2E tests before considering the work complete.

### Standard Feature Development Workflow

1. **Implement Feature** - Write code in `src/app.ts`
2. **Write/Update Unit Tests** - Add tests in `tests/`
3. **Run Unit Tests** - `npm test` (must pass)
4. **✅ RUN E2E TESTS** - `npm run test:e2e` (must pass all 6 tests)
5. **Verify Export Test** - Most critical test, ensures core functionality works
6. **Update Documentation** - If needed

### Why E2E Tests Are Mandatory

E2E tests verify:
- ✅ Application loads correctly
- ✅ Video upload works
- ✅ Timeline operations (split, delete) work
- ✅ Filters apply correctly per clip
- ✅ **Export works with audio** (MOST CRITICAL)

**If E2E tests fail, the feature is NOT complete!**

### Quick E2E Test Command

```bash
# One-line command to run everything
npm test && npx playwright test
```

**Expected result**: `6 passed (52.9s)` with all tests showing ✓

### When to Update E2E Tests

Update `e2e/autocut.spec.ts` if you:
- Add new UI elements
- Change workflow (e.g., new buttons, dialogs)
- Add new features that users interact with
- Modify export process

See [E2E_TESTING.md](./E2E_TESTING.md) for complete E2E testing guide.

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

**Codec Configuration** (H.264 + Opus):
```javascript
const combinator = new Combinator({
  width: material.metadata.width,
  height: material.metadata.height,
  videoCodec: 'avc1.42E01E',  // H.264 Baseline Profile (only codec supported by WebAV)
  fps: 30,
  bitrate: 5e6          // 5 Mbps
  // audio: true by default, uses Opus (patched WebAV)
});
```

⚠️ **IMPORTANT - WebAV Limitations**:
1. **Video codec**: WebAV Combinator ONLY supports H.264 encoding, regardless of `videoCodec` parameter
2. **Audio codec**: WebAV hardcodes AAC audio, which only works on Windows/macOS. For Linux/WSL2 support, we patched WebAV to use Opus instead
3. **ARM64 Linux**: H.264 VideoEncoder may be broken on ARM64 Linux, producing corrupted exports. For a solution, see [WEBAV_ARCHITECTURE.md](./WEBAV_ARCHITECTURE.md)
4. **Opus patch**: See `patches/webav-opus-audio.patch` for details. Must be reapplied after `npm install`

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

### Implementation Steps

1. **Check tests first** - See how existing features work in `tests/`
2. **Update state object** - Add new properties to `state` or `spriteState`
3. **Handle in renderFrame** - Update frame rendering if needed
4. **Handle in export** - Update exportVideo if needed
5. **Add unit tests** - Document the feature with tests in `tests/`
6. **Update this file** - Add notes for future Claude instances

### ⚠️ MANDATORY: Testing Before Completion

**After implementing ANY feature, you MUST run tests in this order:**

```bash
# 1. Run unit tests
npm test
# Expected: All 61 tests pass

# 2. Start dev server (if not running)
npm run dev

# 3. Run E2E tests (CRITICAL - DO NOT SKIP!)
npm run test:e2e
# Expected: All 6 tests pass (52.9s)

# OR run everything at once
npm run test:all
```

**Success Criteria**:
- ✅ All 61 unit tests pass
- ✅ All 6 E2E tests pass
- ✅ Export test completes successfully (most critical)
- ✅ No console errors during E2E tests

**If any test fails, the feature is NOT complete!** Debug and fix before moving on.

### E2E Test Coverage Reminder

The 6 E2E tests verify:
1. Application loads correctly
2. Video upload works
3. Clip splitting works
4. Filters apply per-clip correctly
5. Playback speed changes
6. **Video export works with audio** (MOST CRITICAL)

If your feature affects any of these areas, verify the related test still passes.

### Updating E2E Tests

If your feature changes the UI or workflow, update `e2e/autocut.spec.ts`:
- New buttons/controls → Add selectors and interactions
- Modified export → Update export test expectations
- New dialogs → Add dialog handling

See [E2E_TESTING.md](./E2E_TESTING.md) for complete guide.
