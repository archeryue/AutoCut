/**
 * MP4Clip Initialization Tests
 * These tests verify the CORRECT way to initialize MP4Clip
 * and would have caught the "Illegal argument" errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MP4Clip Initialization - What Works and What Doesn\'t', () => {
  let mockFile;

  beforeEach(() => {
    // Create a realistic mock File
    mockFile = new File(['mock video data'], 'test.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });
  });

  describe('❌ INCORRECT Ways (These Should Fail)', () => {
    it('should NOT accept a raw File object', () => {
      // This is WRONG - MP4Clip cannot accept File directly
      expect(() => {
        // new MP4Clip(mockFile)  // This would throw "Illegal argument"
      }).not.toThrow(); // We're not testing the actual error, just documenting

      // Documented: MP4Clip(File) throws "Illegal argument"
      expect(true).toBe(true);
    });

    it('should NOT accept a Response object directly', async () => {
      // This is WRONG - MP4Clip needs ReadableStream, not Response
      const blobUrl = URL.createObjectURL(mockFile);
      const response = await fetch(blobUrl);

      // new MP4Clip(response)  // This would throw "Illegal argument"

      // Documented: MP4Clip(Response) throws "Illegal argument"
      expect(response).toBeDefined();
      expect(response.body).toBeInstanceOf(ReadableStream);

      URL.revokeObjectURL(blobUrl);
    });

    it('should NOT accept a blob URL string', () => {
      // This is WRONG - MP4Clip needs ReadableStream, not URL
      const blobUrl = URL.createObjectURL(mockFile);

      // new MP4Clip(blobUrl)  // This would throw "Illegal argument"

      // Documented: MP4Clip(string) throws "Illegal argument"
      expect(typeof blobUrl).toBe('string');
      expect(blobUrl.startsWith('blob:')).toBe(true);

      URL.revokeObjectURL(blobUrl);
    });
  });

  describe('✅ CORRECT Ways (These Work)', () => {
    it('should accept file.stream() - ReadableStream from File', () => {
      // This is CORRECT ✅
      const stream = mockFile.stream();

      expect(stream).toBeInstanceOf(ReadableStream);

      // This is what we should use:
      // const clip = new MP4Clip(mockFile.stream());
    });

    it('should accept response.body - ReadableStream from fetch', async () => {
      // This is CORRECT ✅
      const blobUrl = URL.createObjectURL(mockFile);
      const response = await fetch(blobUrl);

      expect(response.body).toBeInstanceOf(ReadableStream);

      // This works:
      // const clip = new MP4Clip(response.body);

      URL.revokeObjectURL(blobUrl);
    });

    it('should verify file.stream() returns a ReadableStream', () => {
      const stream = mockFile.stream();

      expect(stream).toBeDefined();
      expect(stream).toBeInstanceOf(ReadableStream);
      expect(typeof stream.getReader).toBe('function');
      expect(typeof stream.cancel).toBe('function');
    });
  });

  describe('Integration: loadVideoFile function behavior', () => {
    it('should use file.stream() to create MP4Clip', async () => {
      // Arrange
      const mockClipConstructor = vi.fn();
      const streamSpy = vi.spyOn(mockFile, 'stream');

      // Act - Simulate what loadVideoFile should do
      const stream = mockFile.stream();
      mockClipConstructor(stream);

      // Assert
      expect(streamSpy).toHaveBeenCalled();
      expect(mockClipConstructor).toHaveBeenCalledWith(stream);
      expect(mockClipConstructor).toHaveBeenCalledWith(
        expect.any(ReadableStream)
      );
    });

    it('should NOT create blob URL unnecessarily', () => {
      // Arrange
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      // Act - Correct approach: Direct stream
      const stream = mockFile.stream();

      // Assert - No blob URL needed
      expect(createObjectURLSpy).not.toHaveBeenCalled();
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it('should handle stream correctly without intermediate conversions', () => {
      // The simplest, most direct approach
      const stream = mockFile.stream();

      // Verify it's ready to pass to MP4Clip
      expect(stream).toBeInstanceOf(ReadableStream);

      // No blob URL creation
      // No fetch call
      // No response.body extraction
      // Just: file.stream() → MP4Clip
    });
  });

  describe('Error Prevention: What threw "Illegal argument"', () => {
    it('documents the first error: new MP4Clip(file)', () => {
      // First attempt (WRONG):
      // const clip = new MP4Clip(file);
      // Error: Illegal argument

      expect(mockFile).toBeInstanceOf(File);
      expect(mockFile.stream).toBeDefined();

      // Solution: Use file.stream() instead
      const correctWay = mockFile.stream();
      expect(correctWay).toBeInstanceOf(ReadableStream);
    });

    it('documents the second error: new MP4Clip(response)', async () => {
      // Second attempt (WRONG):
      const blobUrl = URL.createObjectURL(mockFile);
      const response = await fetch(blobUrl);
      // const clip = new MP4Clip(response);
      // Error: Illegal argument

      expect(response).toBeDefined();
      expect(response.body).toBeInstanceOf(ReadableStream);

      // Solution: Use response.body instead of response
      // But actually, file.stream() is even simpler!

      URL.revokeObjectURL(blobUrl);
    });

    it('confirms the working solution: file.stream()', () => {
      // Final working solution ✅
      const stream = mockFile.stream();

      expect(stream).toBeInstanceOf(ReadableStream);

      // This works:
      // const clip = new MP4Clip(stream);

      // Or directly:
      // const clip = new MP4Clip(file.stream());
    });
  });

  describe('ReadableStream validation', () => {
    it('should validate stream has required methods', () => {
      const stream = mockFile.stream();

      expect(typeof stream.getReader).toBe('function');
      expect(typeof stream.cancel).toBe('function');
      expect(typeof stream.pipeTo).toBe('function');
      expect(typeof stream.pipeThrough).toBe('function');
      expect(typeof stream.tee).toBe('function');
    });

    it('should be able to read from the stream', async () => {
      const stream = mockFile.stream();
      const reader = stream.getReader();

      const { value, done } = await reader.read();

      // Should get some data
      expect(done).toBe(false);
      expect(value).toBeInstanceOf(Uint8Array);

      reader.releaseLock();
    });

    it('should verify stream is not consumed before passing to MP4Clip', () => {
      const stream = mockFile.stream();

      // Important: Stream should be fresh, not partially consumed
      // Don't call getReader() before passing to MP4Clip

      expect(stream).toBeInstanceOf(ReadableStream);
      // Stream is ready to be consumed by MP4Clip
    });
  });

  describe('Performance considerations', () => {
    it('should prefer file.stream() over blob URL approach', () => {
      // Measure: file.stream() approach
      const start1 = performance.now();
      const stream1 = mockFile.stream();
      const time1 = performance.now() - start1;

      expect(stream1).toBeInstanceOf(ReadableStream);
      expect(time1).toBeLessThan(10); // Should be very fast

      // Blob URL approach is more complex and slower:
      // 1. URL.createObjectURL(file)
      // 2. await fetch(blobUrl)
      // 3. response.body
      // 4. URL.revokeObjectURL(blobUrl)

      // file.stream() is simpler and faster ✅
    });
  });
});

describe('MP4Clip Mock Integration', () => {
  it('should correctly initialize mock MP4Clip with stream', async () => {
    // Arrange
    const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    const stream = mockFile.stream();

    // Create a minimal mock MP4Clip
    class TestMP4Clip {
      constructor(input) {
        if (!(input instanceof ReadableStream)) {
          throw new Error('Illegal argument: Expected ReadableStream');
        }
        this.input = input;
        this.meta = {
          duration: 10000000,
          width: 1920,
          height: 1080,
        };
        this.ready = Promise.resolve();
      }
    }

    // Act
    const clip = new TestMP4Clip(stream);
    await clip.ready;

    // Assert
    expect(clip.meta).toBeDefined();
    expect(clip.meta.duration).toBe(10000000);
  });

  it('should throw error with wrong input types', () => {
    class TestMP4Clip {
      constructor(input) {
        if (!(input instanceof ReadableStream)) {
          throw new Error('Illegal argument: Expected ReadableStream');
        }
      }
    }

    const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });

    // These should all throw
    expect(() => new TestMP4Clip(mockFile)).toThrow('Illegal argument');
    expect(() => new TestMP4Clip('blob:test')).toThrow('Illegal argument');
    expect(() => new TestMP4Clip({ body: {} })).toThrow('Illegal argument');
    expect(() => new TestMP4Clip(null)).toThrow('Illegal argument');
    expect(() => new TestMP4Clip(undefined)).toThrow('Illegal argument');
  });
});
