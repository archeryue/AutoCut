# AutoCut E2E Testing Guide

Complete guide for running end-to-end tests with Playwright, including setup, troubleshooting, and platform-specific requirements.

## Quick Start

```bash
# Install dependencies
npm install

# Apply WebAV Opus patch (Linux/WSL2 ONLY - DO NOT apply on macOS/Windows)
sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js
# ⚠️ If you applied the patch, clear Vite cache: rm -rf node_modules/.vite

# Install system Chrome (REQUIRED - Playwright's Chromium has WebCodecs limitations)
# macOS: Download from https://www.google.com/chrome/
# Linux: sudo apt install google-chrome-stable
# Windows: Download from https://www.google.com/chrome/

# Start dev server (in one terminal)
npm run dev

# Run E2E tests (in another terminal)
npm run test:e2e

# Or run all tests at once
npx playwright test
```

## Test Suite Overview

**7 E2E Tests** (all must pass):
1. ✅ **Application Load** - Verifies app loads and UI elements present
2. ✅ **Video Upload** - Tests file upload and timeline addition
3. ✅ **Clip Splitting** - Tests timeline clip splitting functionality
4. ✅ **Filter Application** - Tests per-clip filter isolation
5. ✅ **Playback Speed** - Tests speed control
6. ✅ **Video Export with Playback Speed** - Tests 2x speed export with audio sync
7. ✅ **Video Export with Filters** - Tests multi-clip export pipeline with filters + audio

**Total Test Count**: 68 tests
- 61 Vitest unit tests
- 7 Playwright E2E tests

**Expected E2E Result**: `7 passed (36.2s)` with all tests showing ✓

## Platform-Specific Requirements

### macOS / Windows

**System Chrome Required**: E2E tests use system-installed Google Chrome (not Playwright's Chromium).

**Why?**
- Playwright's bundled Chromium has WebCodecs limitations on macOS ARM64
- VideoDecoder cannot decode H.264 videos in Playwright Chromium
- System Chrome has better hardware acceleration and codec support

**Configuration**:
The `playwright.config.ts` is already configured to use system Chrome:
```typescript
{
  name: 'chrome',
  use: {
    channel: 'chrome', // Uses system Chrome
  }
}
```

**Installation**:
- **macOS**: Download from https://www.google.com/chrome/
- **Windows**: Download from https://www.google.com/chrome/

**Audio Codec**: AAC (default, no patch needed)

### Linux / WSL2

**CRITICAL**: WebAV hardcodes AAC audio codec, which is NOT supported on Linux. You MUST apply the Opus patch.

#### WebAV Opus Patch (Required)

**Problem**: AAC AudioEncoder only works on Windows/macOS via Media Foundation.

**Solution**: Patch WebAV to use Opus codec (cross-platform).

**Apply the patch**:
```bash
# Manual patch
sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js

# ⚠️ CRITICAL: Clear Vite cache after patching
rm -rf node_modules/.vite

# Verify patch applied
grep 'codec: "opus"' node_modules/@webav/av-cliper/dist/av-cliper.js
# Should show: codec: "opus",
```

**When to apply**:
- After `npm install`
- After `npm update`
- After deleting `node_modules`

**IMPORTANT**: Always clear Vite cache (`rm -rf node_modules/.vite`) after applying the patch, otherwise Vite will serve the old cached AAC version, causing exports with no audio (0 channels, invalid sample rate).

**Automation option** (future):
Use `patch-package` to automate this:
```bash
npm install patch-package --save-dev
# After manual patching:
npx patch-package @webav/av-cliper
# Add to package.json:
"postinstall": "patch-package"
```

#### GPU Support in WSL2

AutoCut uses WebCodecs which benefits from GPU acceleration. WSL2 supports GPU passthrough:

```bash
# Verify GPU is available
nvidia-smi  # For NVIDIA GPUs
# or
glxinfo | grep "OpenGL"
```

Playwright is configured to use hardware acceleration (see `playwright.config.ts`).

### Windows / macOS

No special patches required - AAC codec works natively. VP8 + Opus still work fine.

## Codec Configuration

Export uses **H.264 video + Opus audio**.

### Current Configuration

```javascript
// src/app.ts
const combinator = new Combinator({
  width: material.metadata.width,
  height: material.metadata.height,
  videoCodec: 'avc1.42E01E',  // H.264 Baseline Profile (only codec supported by WebAV)
  fps: 30,
  bitrate: 5e6          // 5 Mbps
  // audio: true by default, uses Opus (patched)
});
```

### Codec Support

| Codec | Platform Support | Quality | Notes |
|-------|-----------------|---------|-------|
| **H.264 (avc1)** | ✅ Windows/macOS/Linux x64<br>❌ Linux ARM64 | Excellent | Only codec supported by WebAV Combinator<br>**Broken on ARM64 Linux** |
| **Opus** | ✅ All platforms | Excellent | Required for Linux/WSL2 (patched WebAV) |
| AAC | ❌ Windows/macOS only | Good | Default WebAV audio, fails on Linux |
| VP8 | ⚠️ Not available | N/A | WebAV Combinator ignores VP8 setting, always uses H.264 |

### ⚠️ ARM64 Linux Limitation

**Known Issue**: H.264 VideoEncoder on ARM64 Linux produces corrupted output.

- **Symptom**: Exported videos cannot be played, ffprobe shows "Invalid data"
- **Affected Platforms**: WSL2 ARM64, Raspberry Pi, ARM-based Linux systems
- **Workaround**: See [WEBAV_ARCHITECTURE.md](./WEBAV_ARCHITECTURE.md) for implementing custom VP8+WebM export
- **Alternative**: Run tests on x64 platform where H.264 encoding works

**E2E Tests on ARM64**:
- Video validation includes `checkFrames: false` to skip frame analysis
- Tests verify file creation and basic metadata, but exported video may not be playable

## Test File Requirements

### test-video.mp4

The E2E tests use `test-video.mp4` in the project root.

**Requirements**:
- Format: MP4 container
- Video codec: H.264 is fine (WebAV can decode it)
- Audio codec: AAC is fine (WebAV can decode it)
- Duration: At least ~75 seconds (tests split into 2 clips)
- Resolution: Any (tests use 1104x622)

**Why the specific codec requirements?**:
- **Input** (test-video.mp4): Can be any codec WebAV can *decode* (H.264 + AAC works)
- **Output** (exported video): Must be codecs WebAV can *encode* (VP8 + Opus required for Linux)

## Running Tests

### Run All Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test --grep "export video"

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debugging
npx playwright test --debug
```

### Test Configuration

See `playwright.config.ts`:

```typescript
{
  testDir: './e2e',
  fullyParallel: false,  // Sequential for stability
  workers: 1,            // One test at a time
  timeout: 240000,       // 4 minutes (video export takes time)
  use: {
    baseURL: 'http://localhost:8000',
    headless: false,     // Use real GPU
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
}
```

### Dev Server Management

**Option 1: Manual** (recommended for development)
```bash
# Terminal 1
npm run dev

# Terminal 2
npx playwright test
```

**Option 2: Automatic** (tests manage server)
```bash
# Playwright can start/stop server automatically
# Uncomment webServer in playwright.config.ts
```

## Common Issues & Solutions

### Issue 1: "Cannot call 'encode' on AudioEncoder: closed codec"

**Symptom**:
```
Export error: Failed to execute 'encode' on 'AudioEncoder':
Cannot call 'encode' on a closed codec.
```

**Cause**: WebAV Opus patch not applied

**Solution**:
```bash
# Apply patch
sed -i 's/codec: "aac"/codec: "opus"/g' node_modules/@webav/av-cliper/dist/av-cliper.js

# Clear Vite cache
rm -rf node_modules/.vite/deps

# Restart dev server
npm run dev
```

### Issue 2: "Cannot call 'encode' on VideoEncoder: closed codec"

**Symptom**: Similar error but for video

**Cause**: Video codec compatibility

**Solution**: Already fixed - using VP8 codec (see `src/app.ts:1271`)

### Issue 3: Vite Cache Issues

**Symptom**: Changes not reflected, old errors persist

**Solution**:
```bash
# Clear Vite dependency cache
rm -rf node_modules/.vite/deps

# Restart dev server
npm run dev
```

### Issue 4: Port 8000 Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::8000`

**Solution**:
```bash
# Kill existing server
pkill -f "vite"

# Or use different port in vite.config.ts
```

### Issue 5: Tests Timeout

**Symptom**: Tests fail with timeout errors

**Possible causes**:
1. Dev server not running → Start `npm run dev`
2. Export takes too long → Normal, 75s video takes ~36s to export
3. System resources → Close other applications

**Solution**:
```bash
# Increase timeout for specific test
npx playwright test --timeout 300000  # 5 minutes
```

### Issue 6: Test Video Not Found

**Symptom**: `Error: ENOENT: no such file or directory, open 'test-video.mp4'`

**Solution**: Ensure `test-video.mp4` exists in project root

## Test Output Artifacts

Failed tests generate artifacts in `test-results/`:

```
test-results/
├── autocut-AutoCut-Features-should-export-video-with-filters-chromium/
│   ├── test-failed-1.png     # Screenshot of failure
│   ├── video.webm            # Recording of test
│   └── error-context.md      # Error details
└── downloads/
    └── autocut-export-*.mp4  # Exported videos (if export succeeds)
```

**Analyzing failures**:
1. Check screenshot to see UI state
2. Watch video recording to see what happened
3. Read error-context.md for stack traces
4. Check browser console logs in test output

## Debugging Tests

### Console Logging

Tests capture browser console logs with `[EXPORT]` prefix:

```typescript
// In test
page.on('console', msg => {
  if (msg.text().includes('[EXPORT]')) {
    console.log('BROWSER:', msg.text());
  }
});
```

**Useful logs**:
- `[EXPORT] exportVideo() called` - Export started
- `[EXPORT] Combinator created` - Codec configuration
- `[EXPORT] Stream complete` - Export finished
- `Export error: ...` - Error details

### Step-by-Step Debugging

```bash
# Run in debug mode (pauses at each step)
npx playwright test --debug

# Run specific test with headed mode
npx playwright test --grep "export" --headed

# Slow down execution
npx playwright test --headed --slowmo 1000  # 1s delay per action
```

### Accessing Test Video in Browser

```javascript
// In test, access download
const download = await downloadPromise;
const filePath = await download.path();
console.log('Video saved to:', filePath);
```

## Performance Expectations

Export performance for 75-second video (test-video.mp4):

| Metric | Value | Notes |
|--------|-------|-------|
| Export time | ~36 seconds | Real-time encoding |
| Chunk size | 5-13 KB | Per chunk (500ms intervals) |
| Total chunks | ~73 chunks | For 75s video |
| Output size | 0.84 MB | With VP8 + Opus audio |
| Output size (no audio) | 0.44 MB | Video only |

**Export rate**: ~2x real-time (75s video in 36s)

## CI/CD Considerations

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Apply WebAV Opus patch
        run: |
          sed -i 's/codec: "aac"/codec: "opus"/g' \
            node_modules/@webav/av-cliper/dist/av-cliper.js

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: test-results/
```

### Docker

Not recommended - WebCodecs requires real GPU access. Use native environment or GitHub Actions.

## Maintenance

### After Adding New Features

1. **Update tests** if UI changes
2. **Run full test suite**: `npx playwright test`
3. **Check export still works** - most critical test
4. **Update this document** if new issues discovered

### Regular Checks

```bash
# Weekly/before releases
npm test              # Unit tests (61 tests)
npx playwright test   # E2E tests (6 tests)
```

### Updating Dependencies

```bash
# After npm update
npm install

# CRITICAL: Re-apply Opus patch
sed -i 's/codec: "aac"/codec: "opus"/g' \
  node_modules/@webav/av-cliper/dist/av-cliper.js

# Clear caches
rm -rf node_modules/.vite/deps

# Verify tests still pass
npx playwright test
```

## Test Development

### Adding New E2E Tests

**Template**:
```typescript
test('should do something', async ({ page }) => {
  // 1. Navigate and wait for app
  await page.goto('http://localhost:8000');
  await page.waitForSelector('#previewCanvas');

  // 2. Perform actions
  await page.locator('#someButton').click();

  // 3. Verify results
  await expect(page.locator('.result')).toBeVisible();

  console.log('✅ Feature works correctly');
});
```

**Best practices**:
- Use descriptive test names
- Add console.log for progress tracking
- Use specific selectors (IDs preferred)
- Wait for elements before interacting
- Add timeouts for slow operations (export, upload)

### Test Data

Create test videos with ffmpeg:

```bash
# Create 10-second test video
ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=10 \
       -pix_fmt yuv420p -c:v libx264 -c:a aac \
       test-video-10s.mp4
```

## Troubleshooting Checklist

Before asking for help, check:

- [ ] Dev server running on port 8000
- [ ] WebAV Opus patch applied (check file: `grep opus node_modules/@webav/av-cliper/dist/av-cliper.js`)
- [ ] Vite cache cleared (`rm -rf node_modules/.vite/deps`)
- [ ] Playwright installed (`npx playwright install chromium`)
- [ ] test-video.mp4 exists in project root
- [ ] No other processes using port 8000
- [ ] GPU available (for WSL2: check `nvidia-smi`)
- [ ] All unit tests pass (`npm test`)

## Success Criteria

All tests should complete with:

```
✓  6 [chromium] › e2e/autocut.spec.ts

6 passed (52.9s)
```

**Export test specifically should show**:
- ✅ Video exported successfully
- ✅ Export file size: 0.84 MB
- ✅ 73 chunks exported
- ✅ ~36 seconds export time

## Getting Help

If tests fail after following this guide:

1. Check `test-results/` for screenshots and videos
2. Review browser console logs in test output
3. Try running in headed mode: `npx playwright test --headed`
4. Check if unit tests pass: `npm test`
5. Verify patch applied: `grep opus node_modules/@webav/av-cliper/dist/av-cliper.js`

## References

- [Playwright Documentation](https://playwright.dev/)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [WebAV GitHub](https://github.com/bilibili/WebAV)
- [VP8 Codec](https://en.wikipedia.org/wiki/VP8)
- [Opus Codec](https://opus-codec.org/)
- [WebCodecs Codec Support Issue](https://github.com/w3c/webcodecs/issues/259)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**AutoCut Version**: 2.0 (WebAV-powered)
