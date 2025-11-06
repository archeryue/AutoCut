# AutoCut Test Suite

Tests for WebAV integration code. These tests verify that our code correctly interacts with WebAV APIs.

**Total: 36 passing tests**

## What We Test

### ✅ MP4Clip Initialization (18 tests)
- **Incorrect patterns** that throw "Illegal argument":
  - Passing raw File object to MP4Clip
  - Passing Response object instead of ReadableStream
  - Passing blob URL string instead of stream
- **Correct patterns** that work:
  - Using `file.stream()` to get ReadableStream
  - Using `response.body` from fetch
- Integration with loadVideoFile function
- ReadableStream validation and characteristics
- Performance considerations
- Mock integration testing

### ✅ Video Loading Integration (18 tests)
- Creating MP4Clip from blob URL + fetch
- Handling MP4Clip metadata (duration, width, height)

### ✅ Sprite Creation
- Creating OffscreenSprite with correct configuration
- Setting playback rate per sprite
- Setting opacity per sprite

### ✅ Sprite Rendering
- Rendering sprite at specific timestamps
- Properly closing video frames

### ✅ Timeline Operations
- Calculating sprite positions
- Splitting clips correctly
- Deleting clips and reorganizing timeline

### ✅ Filter Application
- Storing filter settings per sprite
- Building correct CSS filter strings
- Applying multiple filters

### ✅ Export Integration
- Creating Combinator with correct config
- Adding sprites to Combinator
- Generating output stream
- Collecting chunks from stream

### ✅ Utility Functions
- Time formatting (microseconds to MM:SS)
- Time conversions

## Running Tests

```bash
# Install dependencies first
npm install

# Run tests once
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# UI mode (visual test runner)
npm run test:ui
```

## Test Structure

```
tests/
├── setup.js                        # Test environment setup, mocks browser APIs
├── mocks/
│   └── webav.js                    # Mock WebAV classes (MP4Clip, OffscreenSprite, Combinator)
├── mp4clip-initialization.test.js  # Tests for correct MP4Clip initialization patterns
├── integration.test.js             # Integration tests for WebAV
└── README.md                       # This file
```

## Mock Strategy

We **don't test WebAV itself** - we assume it works correctly. Instead, we:

1. **Mock WebAV classes** with realistic behavior
2. **Test our integration code** that calls WebAV APIs
3. **Verify** we pass correct parameters and handle responses properly

## Example Test

```javascript
it('should create OffscreenSprite with correct time configuration', async () => {
  // Arrange
  const clip = new MockMP4Clip('mock-source');
  await clip.ready;

  // Act
  const sprite = new MockOffscreenSprite(clip);
  sprite.time = {
    offset: 0,
    duration: clip.meta.duration,
  };

  // Assert
  expect(sprite.time.offset).toBe(0);
  expect(sprite.time.duration).toBe(10000000);
});
```

## Adding New Tests

When adding new WebAV integration code:

1. **Add mock behavior** to `tests/mocks/webav.js` if needed
2. **Write integration test** in `tests/integration.test.js`
3. **Test the integration**, not WebAV itself
4. **Run tests** with `npm test`

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run tests
  run: npm test
```
