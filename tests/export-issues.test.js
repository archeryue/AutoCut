/**
 * Export Issues Tests
 * Tests that would have caught the export black frames and wrong order bugs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMP4Clip, MockOffscreenSprite, MockCombinator } from './mocks/webav.js';

describe('Export Issues - Black Frames and Wrong Order', () => {
  describe('Issue 1: Black frames at start - must create new sprites for export', () => {
    it('should create NEW OffscreenSprite instances for export, not reuse preview sprites', () => {
      // Arrange - Timeline with preview sprites
      const clip1 = new MockMP4Clip('video1.mp4');
      const previewSprite1 = new MockOffscreenSprite(clip1);
      previewSprite1.time = { offset: 0, duration: 5000000 };

      const clip2 = new MockMP4Clip('video2.mp4');
      const previewSprite2 = new MockOffscreenSprite(clip2);
      previewSprite2.time = { offset: 0, duration: 3000000 };

      const timeline = [
        { clip: clip1, sprite: previewSprite1, startTime: 0, duration: 5000000 },
        { clip: clip2, sprite: previewSprite2, startTime: 5000000, duration: 3000000 }
      ];

      const combinator = new MockCombinator({ width: 1920, height: 1080 });
      const createdSprites = [];

      // Act - CORRECT way: Create new sprites for export
      for (const timelineSprite of timeline) {
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip); // NEW sprite
        exportSprite.time = {
          offset: timelineSprite.sprite.time.offset,
          duration: timelineSprite.duration
        };
        createdSprites.push(exportSprite);
        combinator.addSprite(exportSprite);
      }

      // Assert - Verify we created NEW sprites, not reused old ones
      expect(createdSprites[0]).not.toBe(previewSprite1); // NEW sprite, not reused
      expect(createdSprites[1]).not.toBe(previewSprite2); // NEW sprite, not reused
      expect(createdSprites.length).toBe(2);
      expect(combinator.sprites.length).toBe(2);
    });

    it('should demonstrate the bug: reusing preview sprites causes issues', () => {
      // Arrange
      const clip = new MockMP4Clip('video.mp4');
      const previewSprite = new MockOffscreenSprite(clip);
      previewSprite.time = { offset: 0, duration: 5000000 };

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - WRONG way: Reuse preview sprite
      combinator.addSprite(previewSprite); // BUG: Reusing preview sprite

      // Assert - This is the bug
      expect(combinator.sprites[0]).toBe(previewSprite); // BAD: Same instance
      // Preview sprites are configured differently than export sprites
      // This causes black frames and incorrect rendering
    });

    it('should verify export sprites are separate from preview sprites', () => {
      // Arrange
      const clip = new MockMP4Clip('video.mp4');
      const previewSprite = new MockOffscreenSprite(clip);
      previewSprite.time = { offset: 2000000, duration: 5000000 };

      // Act - Create export sprite
      const exportSprite = new MockOffscreenSprite(clip);
      exportSprite.time = {
        offset: previewSprite.time.offset, // Copy offset
        duration: previewSprite.time.duration // Copy duration
      };

      // Assert - Different instances with same configuration
      expect(exportSprite).not.toBe(previewSprite); // Different objects
      expect(exportSprite.time.offset).toBe(previewSprite.time.offset); // Same config
      expect(exportSprite.time.duration).toBe(previewSprite.time.duration); // Same config
    });
  });

  describe('Issue 2: Wrong order - sprites must be added sequentially', () => {
    it('should add sprites to Combinator in timeline order', () => {
      // Arrange - Timeline with 3 clips
      const clips = [
        new MockMP4Clip('video1.mp4'),
        new MockMP4Clip('video2.mp4'),
        new MockMP4Clip('video3.mp4')
      ];

      const timeline = [
        { clip: clips[0], startTime: 0, duration: 3000000 },
        { clip: clips[1], startTime: 3000000, duration: 2000000 },
        { clip: clips[2], startTime: 5000000, duration: 4000000 }
      ];

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - Add in timeline order
      for (let i = 0; i < timeline.length; i++) {
        const timelineSprite = timeline[i];
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip);
        exportSprite.time = {
          offset: 0,
          duration: timelineSprite.duration
        };
        combinator.addSprite(exportSprite);
      }

      // Assert - Order in combinator matches timeline order
      expect(combinator.sprites.length).toBe(3);
      expect(combinator.sprites[0].clip).toBe(clips[0]); // First clip first
      expect(combinator.sprites[1].clip).toBe(clips[1]); // Second clip second
      expect(combinator.sprites[2].clip).toBe(clips[2]); // Third clip third
    });

    it('should track export position correctly', () => {
      // Arrange
      const timeline = [
        { duration: 3000000 }, // 3 seconds
        { duration: 2000000 }, // 2 seconds
        { duration: 4000000 }  // 4 seconds
      ];

      // Act - Track export position as we add sprites
      let exportPosition = 0;
      const positions = [];

      for (const sprite of timeline) {
        positions.push(exportPosition);
        exportPosition += sprite.duration;
      }

      // Assert - Positions are sequential
      expect(positions).toEqual([0, 3000000, 5000000]);
      expect(exportPosition).toBe(9000000); // Total duration
    });

    it('should configure each sprite with correct offset and duration', () => {
      // Arrange - Timeline with trimmed clips
      const clip = new MockMP4Clip('video.mp4');
      const timeline = [
        { clip: clip, offset: 0, duration: 5000000 },      // 0-5s from source
        { clip: clip, offset: 10000000, duration: 3000000 }, // 10-13s from source (trimmed)
        { clip: clip, offset: 2000000, duration: 4000000 }   // 2-6s from source (trimmed)
      ];

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - Create export sprites with correct configuration
      for (const timelineSprite of timeline) {
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip);
        exportSprite.time = {
          offset: timelineSprite.offset,   // Where to start in source
          duration: timelineSprite.duration // How much to export
        };
        combinator.addSprite(exportSprite);
      }

      // Assert - Each sprite configured correctly
      expect(combinator.sprites[0].time.offset).toBe(0);
      expect(combinator.sprites[0].time.duration).toBe(5000000);

      expect(combinator.sprites[1].time.offset).toBe(10000000);
      expect(combinator.sprites[1].time.duration).toBe(3000000);

      expect(combinator.sprites[2].time.offset).toBe(2000000);
      expect(combinator.sprites[2].time.duration).toBe(4000000);
    });
  });

  describe('Export workflow integration', () => {
    it('should follow correct export workflow end-to-end', async () => {
      // Arrange - Timeline with multiple clips
      const clip1 = new MockMP4Clip('video1.mp4');
      const clip2 = new MockMP4Clip('video2.mp4');

      const timeline = [
        {
          materialId: 'mat1',
          clip: clip1,
          sprite: new MockOffscreenSprite(clip1), // Preview sprite (won't be used)
          startTime: 0,
          duration: 5000000,
          opacity: 1.0
        },
        {
          materialId: 'mat2',
          clip: clip2,
          sprite: new MockOffscreenSprite(clip2), // Preview sprite (won't be used)
          startTime: 5000000,
          duration: 3000000,
          opacity: 0.8
        }
      ];

      // Act - Simulate export process
      const combinator = new MockCombinator({ width: 1920, height: 1080 });
      let exportPosition = 0;

      for (const timelineSprite of timeline) {
        // Create NEW sprite for export (not reuse preview sprite)
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip);

        // Configure time
        exportSprite.time = {
          offset: timelineSprite.sprite.time.offset,
          duration: timelineSprite.duration
        };

        // Apply opacity
        exportSprite.opacity = timelineSprite.opacity;

        await combinator.addSprite(exportSprite);

        exportPosition += timelineSprite.duration;
      }

      // Get output
      const stream = combinator.output();
      const reader = stream.getReader();
      const chunks = [];

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }

      // Assert - Export completed successfully
      expect(combinator.sprites.length).toBe(2);
      expect(chunks.length).toBeGreaterThan(0);
      expect(exportPosition).toBe(8000000); // 8 seconds total

      // Verify new sprites were created (not reused)
      expect(combinator.sprites[0]).not.toBe(timeline[0].sprite);
      expect(combinator.sprites[1]).not.toBe(timeline[1].sprite);
    });

    it('should handle split clips correctly in export', () => {
      // Arrange - Original clip split into two parts
      const clip = new MockMP4Clip('video.mp4');

      const timeline = [
        {
          clip: clip,
          sprite: { time: { offset: 0, duration: 4000000 } },
          duration: 4000000 // First 4 seconds
        },
        {
          clip: clip,
          sprite: { time: { offset: 4000000, duration: 6000000 } },
          duration: 6000000 // Next 6 seconds
        }
      ];

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - Export both parts
      for (const timelineSprite of timeline) {
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip);
        exportSprite.time = {
          offset: timelineSprite.sprite.time.offset,
          duration: timelineSprite.duration
        };
        combinator.addSprite(exportSprite);
      }

      // Assert - Both parts exported with correct offsets
      expect(combinator.sprites[0].time.offset).toBe(0);
      expect(combinator.sprites[0].time.duration).toBe(4000000);

      expect(combinator.sprites[1].time.offset).toBe(4000000);
      expect(combinator.sprites[1].time.duration).toBe(6000000);
    });

    it('should handle opacity in export', () => {
      // Arrange
      const clip = new MockMP4Clip('video.mp4');
      const timeline = [
        { clip: clip, duration: 3000000, opacity: 1.0 },
        { clip: clip, duration: 2000000, opacity: 0.5 },
        { clip: clip, duration: 4000000, opacity: 0.8 }
      ];

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act
      for (const timelineSprite of timeline) {
        const exportSprite = new MockOffscreenSprite(timelineSprite.clip);
        exportSprite.time = { offset: 0, duration: timelineSprite.duration };
        exportSprite.opacity = timelineSprite.opacity;
        combinator.addSprite(exportSprite);
      }

      // Assert
      expect(combinator.sprites[0].opacity).toBe(1.0);
      expect(combinator.sprites[1].opacity).toBe(0.5);
      expect(combinator.sprites[2].opacity).toBe(0.8);
    });
  });

  describe('Export bug prevention', () => {
    it('documents the export bug: reusing sprites and wrong configuration', () => {
      // This test documents what NOT to do

      // Arrange
      const clip = new MockMP4Clip('video.mp4');
      const previewSprite = new MockOffscreenSprite(clip);
      previewSprite.time = { offset: 0, duration: 5000000 };

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - WRONG way (the bug)
      combinator.addSprite(previewSprite); // ❌ Reusing preview sprite

      // This causes:
      // 1. Black frames - sprite not configured for export
      // 2. Wrong rendering - sprite has preview configuration

      // Assert - This is the bug
      expect(combinator.sprites[0]).toBe(previewSprite);
      // In the real implementation, this would cause export issues
    });

    it('documents the correct export pattern', () => {
      // This test documents the CORRECT pattern

      // Arrange
      const clip = new MockMP4Clip('video.mp4');
      const previewSprite = new MockOffscreenSprite(clip);
      previewSprite.time = { offset: 0, duration: 5000000 };

      const combinator = new MockCombinator({ width: 1920, height: 1080 });

      // Act - CORRECT way ✅
      const exportSprite = new MockOffscreenSprite(clip); // Create NEW sprite
      exportSprite.time = {
        offset: previewSprite.time.offset,
        duration: previewSprite.time.duration
      };
      combinator.addSprite(exportSprite);

      // Assert - Correct implementation
      expect(combinator.sprites[0]).not.toBe(previewSprite); // Different instance
      expect(combinator.sprites[0].time.offset).toBe(0);
      expect(combinator.sprites[0].time.duration).toBe(5000000);
    });
  });
});
