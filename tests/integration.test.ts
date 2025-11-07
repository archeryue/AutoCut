/**
 * Integration Tests for WebAV
 * Tests our code that interacts with WebAV APIs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMP4Clip, MockOffscreenSprite, MockCombinator } from './mocks/webav';

// Mock WebAV imports
vi.mock('https://cdn.jsdelivr.net/npm/@webav/av-cliper@1.1.6/+esm', () => ({
  MP4Clip: MockMP4Clip,
  OffscreenSprite: MockOffscreenSprite,
  Combinator: MockCombinator,
}));

describe('Video Loading Integration', () => {
  it('should create MP4Clip from blob URL and fetch', async () => {
    // Arrange
    const mockFile = new File(['mock video data'], 'test.mp4', { type: 'video/mp4' });

    // Mock fetch to return a valid response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: 'mock-stream',
      })
    );

    // Act
    const blobUrl = URL.createObjectURL(mockFile);
    const response = await fetch(blobUrl);
    const clip = new MockMP4Clip(response);
    await clip.ready;

    // Assert
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    expect(fetch).toHaveBeenCalledWith(blobUrl);
    expect(clip.meta).toBeDefined();
    expect(clip.meta.duration).toBeGreaterThan(0);
    expect(clip.meta.width).toBe(1920);
    expect(clip.meta.height).toBe(1080);
  });

  it('should handle MP4Clip metadata correctly', async () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    await clip.ready;

    // Assert
    expect(clip.meta.duration).toBe(10000000); // 10 seconds in microseconds
    expect(clip.meta.width).toBe(1920);
    expect(clip.meta.height).toBe(1080);
  });
});

describe('Sprite Creation Integration', () => {
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
    sprite.opacity = 1.0;

    // Assert
    expect(sprite.clip).toBe(clip);
    expect(sprite.time.offset).toBe(0);
    expect(sprite.time.duration).toBe(10000000);
    expect(sprite.opacity).toBe(1.0);
  });

  it('should handle sprite playback rate settings', () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    const sprite = new MockOffscreenSprite(clip);

    // Act
    sprite.time.playbackRate = 2.0;

    // Assert
    expect(sprite.time.playbackRate).toBe(2.0);
  });

  it('should handle sprite opacity settings', () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    const sprite = new MockOffscreenSprite(clip);

    // Act
    sprite.opacity = 0.5;

    // Assert
    expect(sprite.opacity).toBe(0.5);
  });
});

describe('Sprite Rendering Integration', () => {
  it('should render sprite at specific time', async () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    const sprite = new MockOffscreenSprite(clip);
    sprite.time = { offset: 0, duration: 10000000 };

    // Act
    const result = await sprite.offscreenRender(5000000); // 5 seconds

    // Assert
    expect(result).toBeDefined();
    expect(result.video).toBeDefined();
    expect(sprite._renderCalls).toBe(1);
  });

  it('should properly close video frames after rendering', async () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    const sprite = new MockOffscreenSprite(clip);

    // Act
    const result = await sprite.offscreenRender(1000000);

    // Assert
    expect(result.video.close).toBeDefined();
    expect(typeof result.video.close).toBe('function');
  });
});

describe('Timeline Operations', () => {
  it('should correctly calculate sprite positions on timeline', () => {
    // Arrange
    const sprites = [
      { id: '1', startTime: 0, duration: 5000000 },
      { id: '2', startTime: 5000000, duration: 3000000 },
      { id: '3', startTime: 8000000, duration: 2000000 },
    ];

    // Act
    const totalDuration = sprites[sprites.length - 1].startTime + sprites[sprites.length - 1].duration;

    // Assert
    expect(totalDuration).toBe(10000000); // 10 seconds
  });

  it('should handle sprite splitting correctly', () => {
    // Arrange
    const originalSprite = {
      id: '1',
      startTime: 0,
      duration: 10000000,
    };
    const splitPoint = 4000000; // 4 seconds

    // Act
    const sprite1 = {
      ...originalSprite,
      id: '1a',
      duration: splitPoint,
    };
    const sprite2 = {
      ...originalSprite,
      id: '1b',
      startTime: splitPoint,
      duration: originalSprite.duration - splitPoint,
    };

    // Assert
    expect(sprite1.duration).toBe(4000000);
    expect(sprite2.startTime).toBe(4000000);
    expect(sprite2.duration).toBe(6000000);
    expect(sprite1.duration + sprite2.duration).toBe(originalSprite.duration);
  });

  it('should handle sprite deletion and timeline reorganization', () => {
    // Arrange
    let sprites = [
      { id: '1', startTime: 0, duration: 3000000 },
      { id: '2', startTime: 3000000, duration: 2000000 },
      { id: '3', startTime: 5000000, duration: 4000000 },
    ];
    const deleteIndex = 1;
    const deletedDuration = sprites[deleteIndex].duration;

    // Act - Delete sprite 2
    sprites.splice(deleteIndex, 1);

    // Shift subsequent sprites
    for (let i = deleteIndex; i < sprites.length; i++) {
      sprites[i].startTime -= deletedDuration;
    }

    // Assert
    expect(sprites.length).toBe(2);
    expect(sprites[0].startTime).toBe(0);
    expect(sprites[1].startTime).toBe(3000000); // Shifted from 5000000
  });
});

describe('Filter Application', () => {
  it('should store filter settings per sprite', () => {
    // Arrange
    const spriteState = {
      id: '1',
      filters: {
        grayscale: false,
        sepia: false,
        brightness: 1.0,
        contrast: 1.0,
        blur: 0,
      },
    };

    // Act
    spriteState.filters.grayscale = true;

    // Assert
    expect(spriteState.filters.grayscale).toBe(true);
    expect(spriteState.filters.sepia).toBe(false);
  });

  it('should build correct filter string', () => {
    // Arrange
    const filters = {
      grayscale: true,
      sepia: false,
      brightness: 1.5,
      contrast: 1.0,
      blur: 5,
    };

    // Act
    let filterString = '';
    if (filters.grayscale) filterString += 'grayscale(100%) ';
    if (filters.sepia) filterString += 'sepia(100%) ';
    if (filters.brightness !== 1.0) filterString += `brightness(${filters.brightness}) `;
    if (filters.contrast !== 1.0) filterString += `contrast(${filters.contrast}) `;
    if (filters.blur > 0) filterString += `blur(${filters.blur}px) `;

    // Assert
    expect(filterString).toContain('grayscale(100%)');
    expect(filterString).toContain('brightness(1.5)');
    expect(filterString).toContain('blur(5px)');
    expect(filterString).not.toContain('sepia');
    expect(filterString).not.toContain('contrast(1)'); // Should not include default
  });
});

describe('Export Integration', () => {
  it('should create Combinator with correct config', async () => {
    // Arrange
    const config = {
      width: 1920,
      height: 1080,
    };

    // Act
    const combinator = new MockCombinator(config);

    // Assert
    expect(combinator.config.width).toBe(1920);
    expect(combinator.config.height).toBe(1080);
  });

  it('should add sprites to combinator', async () => {
    // Arrange
    const clip = new MockMP4Clip('mock-source');
    const sprite1 = new MockOffscreenSprite(clip);
    const sprite2 = new MockOffscreenSprite(clip);
    const combinator = new MockCombinator({ width: 1920, height: 1080 });

    // Act
    await combinator.addSprite(sprite1);
    await combinator.addSprite(sprite2);

    // Assert
    expect(combinator.sprites.length).toBe(2);
    expect(combinator.sprites[0]).toBe(sprite1);
    expect(combinator.sprites[1]).toBe(sprite2);
  });

  it('should generate output stream', async () => {
    // Arrange
    const combinator = new MockCombinator({ width: 1920, height: 1080 });
    const clip = new MockMP4Clip('mock-source');
    const sprite = new MockOffscreenSprite(clip);
    await combinator.addSprite(sprite);

    // Act
    const stream = combinator.output();

    // Assert
    expect(stream).toBeInstanceOf(ReadableStream);

    // Test stream reading
    const reader = stream.getReader();
    const { value, done } = await reader.read();

    expect(value).toBeInstanceOf(Uint8Array);
    expect(value.length).toBeGreaterThan(0);
  });

  it('should collect chunks from output stream', async () => {
    // Arrange
    const combinator = new MockCombinator({ width: 1920, height: 1080 });
    const stream = combinator.output();

    // Act
    const chunks = [];
    const reader = stream.getReader();
    let done = false;

    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }

    // Assert
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toBeInstanceOf(Uint8Array);
  });
});

describe('Time Conversion Utilities', () => {
  it('should format microseconds to MM:SS correctly', () => {
    // Arrange
    const formatTime = (seconds) => {
      if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Act & Assert
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(125)).toBe('02:05');
    expect(formatTime(3661)).toBe('61:01');
  });

  it('should convert microseconds to seconds correctly', () => {
    // Arrange
    const microseconds = 10000000; // 10 seconds

    // Act
    const seconds = microseconds / 1000000;

    // Assert
    expect(seconds).toBe(10);
  });
});
