# Key Learnings: Video Export Audio Fix

**Date**: 2025-11-07
**Issue**: Video exports worked but had no audio (0 channels, invalid sample rate)
**Resolution**: All 7/7 E2E tests passing with working audio

---

## Root Cause

**Vite was caching a modified WebAV library with broken audio configuration.**

When we applied the Opus patch to `node_modules/@webav/av-cliper/dist/av-cliper.js`, Vite cached the broken version in `node_modules/.vite/`. Even after reverting the patch, the old cached version was still being served to the browser, causing audio exports to fail.

---

## Critical Discoveries

### 1. **Vite Cache Issues with node_modules Modifications**

**Problem**: Modifying files in `node_modules/` doesn't automatically invalidate Vite's cache.

**Solution**:
```bash
rm -rf node_modules/.vite
npm run dev
```

**Lesson**: Always clear Vite cache when debugging issues after modifying node_modules, especially for codec/library configurations.

---

### 2. **Playwright Chromium vs System Chrome**

**Problem**: Playwright's bundled Chromium on macOS ARM64 has limited WebCodecs support:
- VideoEncoder works ✓
- VideoDecoder fails ✗ (cannot decode H.264 source videos)

**Solution**: Configure Playwright to use system-installed Chrome:
```typescript
// playwright.config.ts
{
  name: 'chrome',
  use: {
    channel: 'chrome', // Use system Chrome, not bundled Chromium
  }
}
```

**Lesson**: For WebCodecs-heavy applications, system Chrome has better codec support than Playwright's Chromium, especially on ARM64 architectures.

---

### 3. **WebAV Audio Codec Platform Differences**

**Problem**: The Opus patch was designed for Linux/WSL2 (where AAC encoder isn't available), but it breaks audio on macOS (where AAC works fine).

**Platform Support**:
- **macOS**: AAC ✓, Opus ✗ (broken metadata)
- **Linux/WSL2**: AAC ✗, Opus ✓ (via patch)
- **Windows**: AAC ✓, Opus ?

**Solution**: Use AAC by default (best compatibility), only apply Opus patch for Linux.

**Lesson**: Audio codec support varies by platform. AAC is the most widely supported option for WebAV exports.

---

### 4. **WebAV Combinator `{ main: true }` Behavior**

**Problem**: Using `{ main: true }` on the first sprite caused multi-clip exports to only export the first clip's duration.

**Behavior**:
- `{ main: true }`: Sets output duration to THIS sprite's duration (ignores other sprites)
- No `{ main: true }`: WebAV automatically calculates total duration from all sprites

**Solution**:
```typescript
// Only use { main: true } for single-sprite exports
await combinator.addSprite(
  exportSprite,
  state.sprites.length === 1 ? { main: true } : undefined
);
```

**Lesson**: The `{ main }` parameter is for setting the main audio/video track duration. For single clips it's needed, but for multi-clip timelines it should be omitted so WebAV calculates the full duration.

---

### 5. **H.264 Codec Profile Selection**

**Working**: `avc1.42E032` (H.264 Baseline Profile Level 5.0)
**Not Working**: `avc1.42E01E` (unsupported on macOS ARM64)

**Lesson**: H.264 codec profiles have different hardware support. Baseline Profile Level 5.0 has better compatibility on Apple Silicon.

---

## Testing Strategy

### Before the Fix
- Unit tests: 61/61 ✓
- E2E tests: 5/7 ✗ (export tests failing)
- Export result: Video works, no audio

### After the Fix
- Unit tests: 61/61 ✓
- E2E tests: 7/7 ✓
- Export result: Video + audio both working
- Playback speed: Correctly applied (38s for 2x speed on 76s video)
- Filters: Working (grayscale on first clip only)

---

## Debug Process That Worked

1. **Confirmed export generates data** (not 0 bytes like before)
2. **Used ffprobe to inspect audio metadata** (found 0 channels, 1000000 Hz)
3. **Tested with system Chrome** (exports worked in browser but not in Playwright)
4. **Switched Playwright to use system Chrome** (better WebCodecs support)
5. **Checked if Opus patch was still applied** (it was reverted but cached)
6. **Cleared Vite cache** → Audio started working!
7. **Fixed main sprite logic** → Multi-clip exports working

**Key insight**: The issue wasn't in the code logic—it was in the build cache serving stale library code.

---

## Best Practices Going Forward

### For Development
1. **Clear caches when modifying node_modules**: `rm -rf node_modules/.vite`
2. **Use system Chrome for E2E tests**: Better WebCodecs/codec support
3. **Check both video AND audio** in export validation tests
4. **Use ffprobe to inspect metadata** when debugging codec issues

### For Cross-Platform Support
1. **Platform-specific audio codec selection**:
   - macOS/Windows: Use AAC (default)
   - Linux/WSL2: Apply Opus patch during build/install
2. **Document platform differences** in README
3. **Test on target platforms** before assuming codec support

### For WebAV Usage
1. **Only use `{ main: true }` for single-sprite exports**
2. **Always create new sprites for export** (don't reuse preview sprites)
3. **Clear Vite cache after updating WebAV** or modifying its code

---

## Commands Reference

```bash
# Clear Vite cache (CRITICAL after modifying node_modules)
rm -rf node_modules/.vite

# Apply Opus patch (Linux/WSL2 only)
sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js

# Revert to AAC (macOS/Windows)
sed -i '' 's/codec: "opus"/codec: "aac"/g' node_modules/@webav/av-cliper/dist/av-cliper.js

# Inspect video metadata
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate video.mp4

# Run E2E tests with system Chrome
npm run test:e2e  # Uses playwright.config.ts with channel: 'chrome'
```

---

## Files Modified

1. **playwright.config.ts**: Changed to use system Chrome (`channel: 'chrome'`)
2. **src/app.ts**:
   - Fixed H.264 codec to `avc1.42E032`
   - Fixed main sprite logic for multi-clip exports
3. **node_modules/@webav/av-cliper**: Reverted Opus patch (use AAC on macOS)
4. **Vite cache**: Cleared to reload clean WebAV library

---

## Success Metrics

✅ **All 7 E2E tests passing**
✅ **Export with playback speed**: 38.02s (2x speed correctly applied)
✅ **Export with filters**: 76.05s (multi-clip export works)
✅ **Audio validation**: AAC, 48000 Hz, 2 channels (stereo)
✅ **Video playback**: Works in Chrome with both video and audio

---

**Conclusion**: The issue was not a bug in the export logic, but a build system caching problem. Vite was serving a stale, modified version of the WebAV library with broken audio configuration. Clearing the cache and using system Chrome resolved all issues.
