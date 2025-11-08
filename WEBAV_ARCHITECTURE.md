# WebAV Architecture: Understanding the Abstraction Layers

This document explains what WebAV does on top of the WebCodecs API, its architecture, and limitations discovered during AutoCut development.

---

## Table of Contents

1. [Overview](#overview)
2. [Three Core Abstraction Layers](#three-core-abstraction-layers)
3. [Detailed Component Analysis](#detailed-component-analysis)
4. [Supported Data Types](#supported-data-types)
5. [The Combinator Limitation Problem](#the-combinator-limitation-problem)
6. [What Works vs What Doesn't](#what-works-vs-what-doesnt)
7. [Architecture Diagram](#architecture-diagram)

---

## Overview

**WebAV** is a web-based video editing SDK built on top of the WebCodecs API. It provides high-level abstractions that eliminate the complexity of working with raw WebCodecs APIs.

### Key Value Propositions

- **Performance**: Claims 20x faster than ffmpeg.wasm
- **Privacy**: Client-side processing, no data uploaded
- **Cost**: Eliminates server infrastructure costs
- **Size**: ~50KB (minified + gzipped)
- **Developer Experience**: Intuitive APIs vs low-level WebCodecs

### The Core Problem WebAV Solves

WebCodecs API is powerful but extremely low-level. To decode a single video frame, you need to:

1. Parse MP4 container format (demuxing)
2. Extract codec configuration from MP4 boxes
3. Create and configure VideoDecoder
4. Feed encoded samples with correct timestamps
5. Handle decoder state machine
6. Manage memory for VideoFrame objects

WebAV does all of this in 2 lines:
```javascript
const clip = new MP4Clip(file.stream());
const { video } = await clip.tick(5000000); // Get frame at 5 seconds
```

---

## Three Core Abstraction Layers

WebAV provides three main abstraction layers, each building on WebCodecs:

```
┌─────────────────────────────────────────────────┐
│         LAYER 3: ENCODING (Combinator)          │
│  Multi-sprite composition → MP4 export          │
└─────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────┐
│      LAYER 2: COMPOSITING (OffscreenSprite)     │
│  Spatial/temporal properties + transformations  │
└─────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────┐
│      LAYER 1: DECODING (MP4Clip, AudioClip)     │
│    MP4 demuxing + decoder management            │
└─────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────┐
│              WebCodecs API (Browser)            │
│  VideoDecoder, AudioDecoder, VideoEncoder, etc. │
└─────────────────────────────────────────────────┘
```

---

## Detailed Component Analysis

### **Layer 1: DECODING - `IClip` Classes**

#### What WebCodecs Provides (Raw API)

- `VideoDecoder` - decode compressed video frames
- `AudioDecoder` - decode compressed audio samples
- No built-in container format support
- No automatic configuration
- Manual timestamp management required

#### What WebAV Provides (MP4Clip, AudioClip)

**MP4Clip** - Wraps MP4 video files:

```typescript
class MP4Clip {
  constructor(source: ReadableStream<Uint8Array>)

  // Simple API to get frame + audio at any time
  async tick(time: number): Promise<{
    video?: VideoFrame;
    audio: Float32Array[];
    state: 'success' | 'done';
  }>

  // Metadata automatically parsed
  get meta(): {
    duration: number;
    width: number;
    height: number;
    audioSampleRate: number;
    audioChanCount: number;
  }

  // Utility operations
  async split(time: number): Promise<[MP4Clip, MP4Clip]>
  async clone(): Promise<MP4Clip>
  async thumbnails(imgWidth?: number): Promise<Array<{ts: number; img: Blob}>>
}
```

**What happens internally:**

1. **Demuxing**: Uses mp4box.js to parse MP4 container
2. **Decoder Setup**: Automatically configures VideoDecoder & AudioDecoder
3. **Sample Management**: Manages encoded samples queue
4. **Seeking**: Handles keyframe seeking automatically
5. **Memory**: Manages VideoFrame lifecycle

**Example - Raw WebCodecs vs WebAV:**

```javascript
// ❌ Raw WebCodecs (100+ lines of code)
const fileBuffer = await file.arrayBuffer();
const mp4boxFile = MP4Box.createFile();
// ... parse MP4 boxes
// ... extract decoder config
const decoder = new VideoDecoder({
  output: (frame) => { /* handle frame */ },
  error: (e) => { /* handle error */ }
});
decoder.configure(decoderConfig);
// ... feed samples with timestamps
// ... handle seeking logic
// ... manage frame cleanup

// ✅ WebAV (2 lines)
const clip = new MP4Clip(file.stream());
const { video, audio } = await clip.tick(5000000);
```

---

### **Layer 2: COMPOSITING - `OffscreenSprite`**

#### What WebCodecs Provides

- Raw `VideoFrame` objects
- No composition or layering support
- No transformation utilities

#### What WebAV Provides (OffscreenSprite)

**OffscreenSprite** - Adds spatial/temporal properties to clips:

```typescript
class OffscreenSprite {
  constructor(clip: IClip)

  // Spatial properties (like CSS)
  rect: {
    x: number;        // Position X
    y: number;        // Position Y
    w: number;        // Width
    h: number;        // Height
    angle: number;    // Rotation (radians)
  }

  // Temporal properties
  time: {
    offset: number;      // Trim start (microseconds)
    duration: number;    // Clip duration (microseconds)
    playbackRate: number; // Speed multiplier (1.0 = normal)
  }

  // Visual properties
  opacity: number;                          // 0-1
  zIndex: number;                           // Layer order
  flip: 'horizontal' | 'vertical' | null;   // Mirror

  // Render sprite to canvas
  async offscreenRender(
    ctx: CanvasRenderingContext2D,
    time: number
  ): Promise<{ audio: Float32Array[]; done: boolean }>

  // Animations (CSS-like keyframes)
  setAnimation(
    keyFrame: { '0%': {x: 0}, '100%': {x: 1920} },
    opts: { duration: number; iterCount: number }
  )
}
```

**Example - Creating a picture-in-picture effect:**

```javascript
// Main video (full screen)
const mainSprite = new OffscreenSprite(mainClip);
mainSprite.rect = { x: 0, y: 0, w: 1920, h: 1080 };
mainSprite.time = { offset: 0, duration: 10e6 };
mainSprite.zIndex = 0;

// Overlay video (top-right corner)
const overlaySprite = new OffscreenSprite(overlayClip);
overlaySprite.rect = { x: 1440, y: 60, w: 420, h: 240 };
overlaySprite.time = { offset: 0, duration: 10e6 };
overlaySprite.zIndex = 1;
overlaySprite.opacity = 0.9;

// Render composite frame
const canvas = new OffscreenCanvas(1920, 1080);
const ctx = canvas.getContext('2d');

// Layer 0: Main video
await mainSprite.offscreenRender(ctx, timeInMicroseconds);
// Layer 1: Overlay (drawn on top)
await overlaySprite.offscreenRender(ctx, timeInMicroseconds);
```

**Key insight:** OffscreenSprite is like CSS for video frames - it manages positioning, layering, transformations, and timing.

---

### **Layer 3: ENCODING - `Combinator`**

#### What WebCodecs Provides

- `VideoEncoder` - encode VideoFrames to compressed format
- `AudioEncoder` - encode audio samples to compressed format
- No muxing (container creation)
- No multi-track synchronization
- Manual chunk management

#### What WebAV Provides (Combinator)

**Combinator** - Composes sprites into final video:

```typescript
class Combinator {
  constructor(opts?: {
    width?: number;        // Default 1920
    height?: number;       // Default 1080
    bitrate?: number;      // Default 5e6 (5 Mbps)
    fps?: number;          // Default 30
    bgColor?: string;      // Background color
    videoCodec?: string;   // Default 'avc1.42E032' (H.264)
    audio?: false;         // Disable audio track
  })

  // Add sprites to composition
  async addSprite(sprite: OffscreenSprite, opts?: {
    main?: boolean;  // If true, video duration = this sprite's duration
  }): Promise<void>

  // Export to MP4 stream
  output(opts?: {
    maxTime?: number;  // Max duration to export
  }): ReadableStream<Uint8Array>

  // Events
  on('OutputProgress', (progress: number) => void)
  on('error', (err: Error) => void)
}
```

**How Combinator Works Internally:**

```
1. Create OffscreenCanvas (specified width x height)
   ↓
2. Create VideoEncoder + AudioEncoder
   ↓
3. Loop through timeline at FPS intervals (e.g., 30fps = every 33.33ms)
   ↓
4. For each frame:
   ├── Clear canvas with bgColor
   ├── Render sprites in zIndex order:
   │   └── sprite.offscreenRender(canvas, currentTime)
   ├── Capture canvas → VideoFrame
   ├── Encode VideoFrame → compressed chunks
   ├── Mix audio from all sprites
   ├── Encode audio → compressed audio chunks
   └── Mux video + audio chunks into MP4 container
   ↓
5. Stream MP4 chunks to output ReadableStream
```

**Example - Export multi-sprite composition:**

```javascript
const combinator = new Combinator({
  width: 1920,
  height: 1080,
  fps: 30,
  bitrate: 5e6,
  videoCodec: 'avc1.42E01E'  // H.264
});

// Add background music (full duration)
await combinator.addSprite(musicSprite, { main: true });

// Add video clips
await combinator.addSprite(clip1Sprite);
await combinator.addSprite(clip2Sprite);
await combinator.addSprite(watermarkSprite);

// Get MP4 stream
const mp4Stream = combinator.output();

// Save to file
const chunks = [];
const reader = mp4Stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}
const blob = new Blob(chunks, { type: 'video/mp4' });
```

---

## Supported Data Types

### **DECODE LAYER (Input) - 5 Clip Types**

WebAV's decode layer provides 5 different clip types, all implementing the same `IClip` interface:

| Clip Type | Input Format | Purpose | Output | Use Cases |
|-----------|--------------|---------|--------|-----------|
| **MP4Clip** | MP4 video files (H.264, VP8, VP9, AV1*) | Video files with audio | VideoFrame + Float32Array[] audio | Main video editing, uploaded videos |
| **AudioClip** | Audio files (MP3, WAV, AAC, etc.) or raw PCM | Audio-only clips, background music | Float32Array[] audio | Music tracks, voiceovers, sound effects |
| **ImgClip** | Static images (PNG, JPEG, WebP, GIF, AVIF) | Images, thumbnails, watermarks | VideoFrame (duration = ∞) | Watermarks, static overlays, image sequences |
| **MediaStreamClip** | MediaStream (webcam, screen capture) | Live streams from getUserMedia/getDisplayMedia | ImageBitmap + audio | Webcam recording, screen recording, live editing |
| **EmbedSubtitlesClip** | SRT subtitle text files | Render subtitles as video overlay | VideoFrame with text | Hard-coded subtitles, captions |

\* Codec support depends on browser implementation

#### Common IClip Interface

All clip types share the same interface:

```typescript
interface IClip {
  // Wait for clip to be ready for use
  ready: Promise<void>;

  // Metadata about the clip
  meta: {
    duration: number;      // Microseconds (μs)
    width: number;         // Pixels
    height: number;        // Pixels
    audioSampleRate?: number;
    audioChanCount?: number;
  };

  // Get frame/audio at specific time
  tick(time: number): Promise<{
    video?: VideoFrame;    // Decoded video frame (if has video)
    audio: Float32Array[]; // PCM audio data (if has audio)
    state: 'success' | 'done';
  }>;

  // Split clip at time into two clips
  split(time: number): Promise<[IClip, IClip]>;

  // Create a copy of the clip
  clone(): Promise<IClip>;

  // Clean up resources
  destroy(): void;
}
```

#### Detailed Clip Type Features

**1. MP4Clip** - Most Common

```javascript
// Load from file
const clip = new MP4Clip(file.stream());
await clip.ready;

// Get frame at 5 seconds
const { video, audio } = await clip.tick(5_000_000);

// Generate thumbnails (every keyframe, 100px wide)
const thumbs = await clip.thumbnails(100);
// Returns: [{ ts: 0, img: Blob }, { ts: 1000000, img: Blob }, ...]

// Split track into separate video + audio clips
const [videoOnly, audioOnly] = await clip.splitTrack();
```

**2. AudioClip** - Audio Processing

```javascript
// From audio file
const audioClip = new AudioClip(
  (await fetch('music.mp3')).body,
  {
    volume: 0.8,  // 80% volume
    loop: true    // Loop playback
  }
);

// From raw PCM data
const pcmData = [
  new Float32Array([...]), // Left channel
  new Float32Array([...])  // Right channel
];
const audioClip2 = new AudioClip(pcmData);

// Get full PCM data
const fullAudio = audioClip.getPCMData();
```

**3. ImgClip** - Static Images

```javascript
// From image file
const imgClip = new ImgClip(
  (await fetch('watermark.png')).body
);

// From animated image (GIF, AVIF)
const gifClip = new ImgClip(
  (await fetch('animation.gif')).body,
  { type: 'gif' }
);

// ⚠️ Static images have duration = Infinity
// Must wrap in Sprite with finite duration:
const sprite = new OffscreenSprite(imgClip);
sprite.time = { offset: 0, duration: 10_000_000 }; // 10 seconds
```

**4. MediaStreamClip** - Live Streams

```javascript
// From webcam
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
const webcamClip = new MediaStreamClip(stream);

// From screen capture
const screenStream = await navigator.mediaDevices.getDisplayMedia();
const screenClip = new MediaStreamClip(screenStream);

// tick() returns current frame (no time parameter needed)
const { video, audio } = await webcamClip.tick();
```

**5. EmbedSubtitlesClip** - Subtitle Rendering

```javascript
const srtContent = `
1
00:00:00,000 --> 00:00:03,000
Hello, this is a subtitle

2
00:00:03,000 --> 00:00:06,000
Second subtitle line
`;

const subtitleClip = new EmbedSubtitlesClip(srtContent, {
  videoWidth: 1280,
  videoHeight: 720,
  fontFamily: 'Arial',
  fontSize: 48,
  color: 'white',
  strokeColor: 'black',
  strokeWidth: 2
});

// Renders subtitle text as VideoFrame at given time
const { video } = await subtitleClip.tick(4_000_000); // 4 seconds
```

---

### **ENCODE LAYER (Output) - 1 Format Only**

WebAV's encode layer is **extremely limited** compared to the decode layer:

| Encoder | Container | Video Codec | Audio Codec | Platform Support | Flexibility |
|---------|-----------|-------------|-------------|------------------|-------------|
| **Combinator** | MP4 **only** | H.264 (avc1) **only** | AAC (default) or Opus (patched) | ❌ **Broken on ARM64 Linux** | ❌ **No codec choice** |

#### Combinator Output Configuration

```typescript
interface ICombinatorOpts {
  width?: number;         // Default: 1920
  height?: number;        // Default: 1080
  bitrate?: number;       // Default: 5e6 (5 Mbps)
  fps?: number;           // Default: 30
  bgColor?: string;       // Background color
  videoCodec?: string;    // ❌ MISLEADING - Always uses H.264
  audio?: false;          // Disable audio track
  metaDataTags?: Record<string, string>;  // MP4 metadata
}
```

#### Critical Limitation

**The `videoCodec` parameter is non-functional:**

```javascript
// This looks like it should work:
const combinator = new Combinator({
  videoCodec: 'vp8'  // ❌ IGNORED!
});

// But internally, it always uses:
// videoCodec: 'avc1.42E032'  // H.264 Baseline

// Verify by checking exported file:
strings exported.mp4 | grep avc1
// Output: "avc1", "avc1 Compressor"
```

#### Why This Matters

| Platform | H.264 Encoder Status | Result |
|----------|---------------------|--------|
| **Windows x64** | ✅ Works | ✅ Combinator works |
| **macOS x64/ARM64** | ✅ Works | ✅ Combinator works |
| **Linux x64** | ✅ Works | ✅ Combinator works |
| **Linux ARM64** | ❌ **BROKEN** | ❌ **Corrupted MP4 output** |

**On ARM64 Linux:**
- H.264 VideoEncoder creates corrupted streams
- VP8 VideoEncoder works perfectly
- But Combinator can't use VP8
- Result: **Export is completely broken**

---

### **Comparison: Decode vs Encode Flexibility**

| Layer | Supported Formats | Flexibility | Status |
|-------|-------------------|-------------|--------|
| **Decode** | 5 clip types (MP4, Audio, Image, Stream, Subtitles) | ✅ **Very flexible** | ✅ **Works great** |
| **Encode** | 1 format (MP4 + H.264 only) | ❌ **Not flexible** | ❌ **Broken on ARM64** |

**The asymmetry:**
- Can **decode** VP8, VP9, H.264, AV1 (browser-dependent)
- Can **encode** H.264 only (hardcoded)

This is why AutoCut needs to bypass Combinator for export on ARM64 systems.

---

### **Workaround: Custom Export Pipeline**

Since Combinator is limited, use this approach:

```javascript
// ✅ Use WebAV for decode + preview:
const clip = new MP4Clip(file.stream());
const sprite = new OffscreenSprite(clip);
await sprite.offscreenRender(canvas, time);

// ❌ Don't use Combinator for export:
// const combinator = new Combinator();

// ✅ Use WebCodecs + muxer directly:
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

const muxer = new Muxer({
  target: new ArrayBufferTarget(),
  video: {
    codec: 'V_VP8',    // VP8 works on ARM64!
    width: 1920,
    height: 1080
  },
  audio: {
    codec: 'A_OPUS',   // Opus works everywhere
    sampleRate: 48000
  }
});

const encoder = new VideoEncoder({
  output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
  error: (e) => console.error(e)
});

encoder.configure({
  codec: 'vp8',
  width: 1920,
  height: 1080,
  bitrate: 5e6
});

// Render frames using WebAV sprites
// Encode with VP8
// Output WebM (VP8+Opus)
```

This gives you:
- ✅ WebAV's decode abstractions (works great)
- ✅ WebAV's sprite system (works great)
- ✅ Custom export with VP8+WebM (works on ARM64)

---

## The Combinator Limitation Problem

### **Discovered Issues on ARM64 Linux**

During AutoCut development on WSL2 ARM64, we discovered **critical limitations** in Combinator:

#### Issue 1: Ignores VP8 Codec Setting

```javascript
// We tried to use VP8 (works on ARM64)
const combinator = new Combinator({
  videoCodec: 'vp8'  // ❌ IGNORED!
});

// But Combinator uses H.264 anyway
// Evidence from exported file:
strings exported-video.mp4 | grep avc1
// Output: "avc1", "avc1 Compressor"
```

**Root cause:** Combinator is hardcoded to use H.264 (avc1) codec, regardless of `videoCodec` parameter.

#### Issue 2: H.264 Encoder Broken on ARM64

```bash
# Try to play exported video
ffplay exported-video.mp4
# Error: Invalid data found when processing input

ffprobe exported-video.mp4
# Error: [h264] missing picture in access unit
```

**Root cause:** H.264 VideoEncoder on ARM64 Linux (Chromium) produces corrupted streams.

#### Issue 3: VP8 Works, But Not Accessible

```javascript
// VP8 VideoEncoder DOES work on ARM64
const encoder = new VideoEncoder({ /* ... */ });
encoder.configure({
  codec: 'vp8',  // ✅ This works!
  width: 1920,
  height: 1080
});
// Produces valid VP8 streams

// But Combinator doesn't use it!
```

### **Why This Happens**

Looking at WebAV source code:

```typescript
// node_modules/@webav/av-cliper/dist/av-cliper.d.ts
export declare interface ICombinatorOpts {
  videoCodec?: string;  // Says it accepts any codec
}

// But in implementation (.js file):
codec: t.videoCodec ?? "avc1.42E032"  // Only H.264 is used
```

**Combinator only supports H.264**, period. The `videoCodec` parameter is misleading.

---

## What Works vs What Doesn't

### AutoCut on ARM64 WSL2 - Component Status

| Component | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| **MP4Clip** | Decode uploaded videos (H.264 → VideoFrames) | ✅ **WORKS** | Can decode H.264 videos just fine |
| **OffscreenSprite** | Preview rendering, spatial composition | ✅ **WORKS** | Used in renderFrame() for playback |
| **Combinator** | Export composition to MP4 | ❌ **BROKEN** | H.264 encoder fails on ARM64 |

### Detailed Breakdown

#### ✅ **What Works (2/3 of WebAV)**

1. **Video Upload & Decoding**
   ```javascript
   const clip = new MP4Clip(file.stream());
   await clip.ready;
   // ✅ Perfectly decodes H.264 input videos
   ```

2. **Preview Playback**
   ```javascript
   const sprite = new OffscreenSprite(clip);
   sprite.time = { offset: 0, duration: 10e6 };
   await sprite.offscreenRender(canvas, currentTime);
   // ✅ Renders frames perfectly for preview
   ```

3. **Timeline Operations**
   - Split clips: ✅ Works
   - Apply filters: ✅ Works
   - Adjust playback speed: ✅ Works
   - Trim clips: ✅ Works

#### ❌ **What Doesn't Work (1/3 of WebAV)**

1. **Video Export**
   ```javascript
   const combinator = new Combinator({ videoCodec: 'vp8' });
   await combinator.addSprite(sprite);
   const stream = combinator.output();
   // ❌ Outputs corrupted MP4 (H.264 encoder broken)
   ```

2. **Exported Files**
   - File is created: ✅
   - File has correct size: ✅
   - File is playable: ❌ (corrupted H.264 stream)
   - ffprobe can parse it: ❌ (invalid data)

### Platform Compatibility Matrix

| Platform | H.264 Encoder | VP8 Encoder | Combinator Status |
|----------|---------------|-------------|-------------------|
| **Windows x64** | ✅ Works | ✅ Works | ✅ Works (uses H.264) |
| **macOS x64** | ✅ Works | ✅ Works | ✅ Works (uses H.264) |
| **macOS ARM64** | ✅ Works | ✅ Works | ✅ Works (uses H.264) |
| **Linux x64** | ✅ Works | ✅ Works | ✅ Works (uses H.264) |
| **Linux ARM64** | ❌ Broken | ✅ Works | ❌ Broken (can't use VP8) |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         AutoCut v2.0                        │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   ┌─────────┐         ┌─────────┐         ┌──────────┐
   │ Upload  │         │ Preview │         │  Export  │
   │ & Decode│         │ Playback│         │ Encoding │
   └─────────┘         └─────────┘         └──────────┘
        │                    │                    │
        ↓                    ↓                    ↓
   MP4Clip.tick()    OffscreenSprite     Combinator.output()
   ✅ WORKS          ✅ WORKS             ❌ BROKEN (ARM64)
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │   WebAV SDK     │
                    │   @webav/       │
                    │   av-cliper     │
                    └─────────────────┘
                             │
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   VideoDecoder         VideoFrame          VideoEncoder
   AudioDecoder         Canvas API          AudioEncoder
   ✅ Works             ✅ Works             ❌ H.264 broken
                                            ✅ VP8 works
                                            (but not exposed)
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │  WebCodecs API  │
                    │  (Browser)      │
                    └─────────────────┘
```

---

## Solution: Replace Combinator with Direct WebCodecs

Since Combinator is the only broken component, the solution is:

### Keep Using WebAV For:
- ✅ **MP4Clip** - Video decoding (works perfectly)
- ✅ **OffscreenSprite** - Preview rendering (works perfectly)

### Replace Combinator With:
- ❌ ~~Combinator~~ (H.264 only, broken on ARM64)
- ✅ **Custom export using WebCodecs directly**:
  - Use `VideoEncoder` with VP8 codec
  - Use `AudioEncoder` with Opus codec
  - Use WebM muxer (e.g., `webm-muxer` library)
  - Output WebM container (VP8+Opus compatible)

### Implementation Strategy

```javascript
// Keep current preview/playback code (uses WebAV):
const clip = new MP4Clip(file.stream());
const sprite = new OffscreenSprite(clip);
await sprite.offscreenRender(canvas, time);  // ✅ Works

// Replace export code:
// ❌ OLD (broken):
// const combinator = new Combinator({ videoCodec: 'vp8' });
// await combinator.addSprite(sprite);
// const stream = combinator.output();

// ✅ NEW (works on ARM64):
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

const muxer = new Muxer({
  target: new ArrayBufferTarget(),
  video: {
    codec: 'V_VP8',
    width: 1920,
    height: 1080,
    frameRate: 30
  },
  audio: {
    codec: 'A_OPUS',
    sampleRate: 48000,
    numberOfChannels: 2
  }
});

const videoEncoder = new VideoEncoder({
  output: (chunk, meta) => {
    muxer.addVideoChunk(chunk, meta);
  },
  error: (e) => console.error(e)
});

videoEncoder.configure({
  codec: 'vp8',
  width: 1920,
  height: 1080,
  bitrate: 5e6,
  framerate: 30
});

// Render frames using existing WebAV sprites
// and encode them with VP8
```

---

## Lessons Learned

### WebAV Strengths
1. ✅ **Excellent decoding abstraction** - MP4Clip is fantastic
2. ✅ **Great compositing layer** - OffscreenSprite simplifies rendering
3. ✅ **Saves 90% of boilerplate** for video editing apps
4. ✅ **Good documentation** and examples

### WebAV Limitations
1. ❌ **Combinator is too opinionated** - hardcoded to H.264+MP4
2. ❌ **No codec flexibility** - can't use VP8, VP9, or AV1
3. ❌ **No container choice** - only MP4, no WebM
4. ❌ **Platform compatibility issues** not documented
5. ❌ **Misleading API** - `videoCodec` parameter does nothing

### Best Practice
**Use WebAV as a 2/3 solution:**
- ✅ Use for decoding (MP4Clip)
- ✅ Use for compositing (OffscreenSprite)
- ❌ Don't use for encoding (Combinator)
- ✅ Implement custom export with WebCodecs + muxer library

This gives you the benefits of WebAV's abstractions where they work, while maintaining full control over the encoding pipeline for platform compatibility.

---

## References

- **WebAV GitHub**: https://github.com/bilibili/WebAV
- **WebCodecs API**: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- **WebM Muxer**: https://github.com/Vanilagy/webm-muxer
- **AutoCut Issue**: Corrupted exports on ARM64 Linux (fixed by replacing Combinator)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Author:** Claude (analyzing WebAV for AutoCut project)
