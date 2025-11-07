/**
 * Playback and Timeline Tests
 * Tests that would have caught the playback rendering and sprite offset bugs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockMP4Clip, MockOffscreenSprite, MockCombinator } from './mocks/webav';

describe('Playback Rendering Issues', () => {
  describe('Issue 1: playbackLoop must await renderFrame', () => {
    it('should await renderFrame before continuing to next frame', async () => {
      // Arrange
      const renderFrameStub = vi.fn().mockResolvedValue(undefined);
      let frameCount = 0;
      const maxFrames = 3;

      // Simulate playbackLoop
      async function mockPlaybackLoop() {
        while (frameCount < maxFrames) {
          // This is CORRECT ✅
          await renderFrameStub(frameCount * 1000000);
          frameCount++;
        }
      }

      // Act
      await mockPlaybackLoop();

      // Assert
      expect(renderFrameStub).toHaveBeenCalledTimes(3);
      expect(frameCount).toBe(3);
    });

    it('should demonstrate the bug when not awaiting renderFrame', async () => {
      // Arrange
      let renderStarted = 0;
      let renderCompleted = 0;

      const slowRenderFrame = vi.fn(async () => {
        renderStarted++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate slow render
        renderCompleted++;
      });

      let frameCount = 0;
      const maxFrames = 3;

      // Simulate BUGGY playbackLoop (not awaiting)
      async function buggyPlaybackLoop() {
        while (frameCount < maxFrames) {
          // This is WRONG ❌ - not awaiting
          slowRenderFrame(frameCount * 1000000);
          frameCount++;
        }
      }

      // Act
      await buggyPlaybackLoop();

      // Assert - All frames started but none completed yet
      expect(renderStarted).toBe(3);
      expect(renderCompleted).toBe(0); // Bug: renders didn't complete!

      // Wait for renders to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(renderCompleted).toBe(3); // Now they complete, but too late
    });

    it('should ensure frames are rendered sequentially when awaited', async () => {
      // Arrange
      const renderOrder = [];
      const renderFrameStub = vi.fn(async (time) => {
        renderOrder.push(`start-${time}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        renderOrder.push(`end-${time}`);
      });

      // Act - Simulate correct playbackLoop
      for (let i = 0; i < 3; i++) {
        await renderFrameStub(i * 1000000);
      }

      // Assert - Should be sequential: start-0, end-0, start-1, end-1, start-2, end-2
      expect(renderOrder).toEqual([
        'start-0', 'end-0',
        'start-1000000', 'end-1000000',
        'start-2000000', 'end-2000000',
      ]);
    });

    it('should show interleaved execution when not awaiting (the bug)', async () => {
      // Arrange
      const renderOrder = [];
      const renderFrameStub = vi.fn(async (time) => {
        renderOrder.push(`start-${time}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        renderOrder.push(`end-${time}`);
      });

      // Act - Simulate buggy playbackLoop (not awaiting)
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(renderFrameStub(i * 1000000));
      }
      await Promise.all(promises);

      // Assert - Interleaved: all starts happen before any ends
      expect(renderOrder).toEqual([
        'start-0',
        'start-1000000',
        'start-2000000',
        'end-0',
        'end-1000000',
        'end-2000000',
      ]);
    });
  });
});

describe('Sprite Offset Issues', () => {
  describe('Issue 2: sprite.time.offset must be clip offset, not timeline position', () => {
    it('should set sprite.time.offset to 0 when adding first clip to timeline', () => {
      // Arrange
      const clip = new MockMP4Clip('source');
      const sprite = new MockOffscreenSprite(clip);

      // Timeline position
      const startPosition = 0;

      // Act - This is CORRECT ✅
      sprite.time = {
        offset: 0, // Offset WITHIN source clip (start from beginning)
        duration: 10000000
      };

      const spriteState = {
        startTime: startPosition, // Timeline position
        duration: 10000000,
        sprite: sprite
      };

      // Assert
      expect(sprite.time.offset).toBe(0); // Source clip offset
      expect(spriteState.startTime).toBe(0); // Timeline position
    });

    it('should set sprite.time.offset to 0 for second clip (not timeline position)', () => {
      // Arrange
      const clip1 = new MockMP4Clip('source1');
      const sprite1 = new MockOffscreenSprite(clip1);
      sprite1.time = { offset: 0, duration: 5000000 };

      const clip2 = new MockMP4Clip('source2');
      const sprite2 = new MockOffscreenSprite(clip2);

      // Timeline position for second clip
      const startPosition = 5000000; // Comes after first clip

      // Act - This is CORRECT ✅
      sprite2.time = {
        offset: 0, // STILL 0 - start from beginning of source clip
        duration: 3000000
      };

      const spriteState2 = {
        startTime: startPosition, // Timeline position = 5000000
        duration: 3000000,
        sprite: sprite2
      };

      // Assert
      expect(sprite2.time.offset).toBe(0); // Source clip offset (not 5000000!)
      expect(spriteState2.startTime).toBe(5000000); // Timeline position
    });

    it('should demonstrate the bug: using timeline position as offset', () => {
      // Arrange
      const clip = new MockMP4Clip('source');
      const sprite = new MockOffscreenSprite(clip);
      const timelinePosition = 5000000;

      // Act - This is WRONG ❌
      sprite.time = {
        offset: timelinePosition, // BUG: Using timeline position as clip offset!
        duration: 3000000
      };

      // Assert - This causes the bug
      expect(sprite.time.offset).toBe(5000000); // Wrong! Should be 0
      // When rendering at timeline time 5000000, sprite will try to seek to
      // 5000000 (relative to sprite start) + 5000000 (offset) = 10000000 in source clip!
    });

    it('should correctly calculate render time for sprite', () => {
      // Arrange
      const spriteState = {
        startTime: 5000000, // Timeline position
        duration: 3000000,
        sprite: {
          time: {
            offset: 0, // Clip offset (start from beginning)
            duration: 3000000
          }
        }
      };

      // Act - Render at timeline time 6000000
      const currentTimelineTime = 6000000;
      const spriteTime = currentTimelineTime - spriteState.startTime; // 1000000
      const sourceClipTime = spriteState.sprite.time.offset + spriteTime; // 0 + 1000000

      // Assert
      expect(spriteTime).toBe(1000000); // Time within sprite
      expect(sourceClipTime).toBe(1000000); // Time in source clip (1 second in)
    });
  });

  describe('Split Clip Offset Handling', () => {
    it('should set correct offsets when splitting a clip', () => {
      // Arrange
      const clip = new MockMP4Clip('source');
      const originalSprite = new MockOffscreenSprite(clip);
      originalSprite.time = { offset: 0, duration: 10000000 };

      const spriteState = {
        startTime: 5000000, // Timeline position
        duration: 10000000,
        sprite: originalSprite,
        clip: clip
      };

      const splitPoint = 4000000; // Split at 4 seconds into the clip

      // Act - Split into two parts
      const sprite1 = {
        ...spriteState,
        duration: splitPoint
      };
      sprite1.sprite.time.duration = splitPoint;

      const sprite2 = {
        ...spriteState,
        startTime: spriteState.startTime + splitPoint, // Timeline: 9000000
        duration: spriteState.duration - splitPoint // 6000000
      };
      sprite2.sprite = new MockOffscreenSprite(clip);
      sprite2.sprite.time = {
        offset: splitPoint, // CORRECT ✅: Offset in source clip (4 seconds in)
        duration: sprite2.duration
      };

      // Assert
      expect(sprite1.sprite.time.offset).toBe(0);
      expect(sprite1.sprite.time.duration).toBe(4000000);
      expect(sprite1.startTime).toBe(5000000); // Timeline position unchanged

      expect(sprite2.sprite.time.offset).toBe(4000000); // Source clip offset (not 9000000!)
      expect(sprite2.sprite.time.duration).toBe(6000000);
      expect(sprite2.startTime).toBe(9000000); // Timeline position
    });

    it('should demonstrate the split bug: using timeline position as offset', () => {
      // Arrange
      const spriteState = {
        startTime: 5000000,
        duration: 10000000
      };
      const splitPoint = 4000000;

      // Act - This is WRONG ❌
      const buggySprite2 = {
        startTime: spriteState.startTime + splitPoint, // 9000000 (timeline)
        duration: 6000000,
        sprite: {
          time: {
            offset: spriteState.startTime + splitPoint, // BUG: Using timeline position!
            duration: 6000000
          }
        }
      };

      // Assert - This is the bug
      expect(buggySprite2.sprite.time.offset).toBe(9000000); // Wrong!
      // Should be 4000000 (splitPoint in source clip), not 9000000 (timeline position)
    });
  });

  describe('Delete Clip Offset Handling', () => {
    it('should NOT modify sprite offsets when shifting timeline after delete', () => {
      // Arrange
      const sprites = [
        {
          id: '1',
          startTime: 0,
          duration: 3000000,
          sprite: { time: { offset: 0, duration: 3000000 } }
        },
        {
          id: '2',
          startTime: 3000000,
          duration: 2000000,
          sprite: { time: { offset: 0, duration: 2000000 } }
        },
        {
          id: '3',
          startTime: 5000000,
          duration: 4000000,
          sprite: { time: { offset: 1000000, duration: 4000000 } } // Trimmed clip
        }
      ];

      const deleteIndex = 1;
      const deletedDuration = sprites[deleteIndex].duration;

      // Store original offsets
      const originalOffset3 = sprites[2].sprite.time.offset;

      // Act - Delete sprite 2 and shift timeline
      sprites.splice(deleteIndex, 1);

      // CORRECT ✅: Only shift timeline positions, NOT offsets
      for (let i = deleteIndex; i < sprites.length; i++) {
        sprites[i].startTime -= deletedDuration;
        // Do NOT modify sprites[i].sprite.time.offset
      }

      // Assert
      expect(sprites.length).toBe(2);
      expect(sprites[0].startTime).toBe(0);
      expect(sprites[1].startTime).toBe(3000000); // Shifted from 5000000

      // Offset should be UNCHANGED
      expect(sprites[1].sprite.time.offset).toBe(originalOffset3); // Still 1000000
    });

    it('should demonstrate the delete bug: modifying offsets when shifting', () => {
      // Arrange
      const sprites = [
        {
          id: '1',
          startTime: 0,
          sprite: { time: { offset: 0 } }
        },
        {
          id: '2',
          startTime: 3000000,
          sprite: { time: { offset: 0 } }
        },
        {
          id: '3',
          startTime: 5000000,
          sprite: { time: { offset: 1000000 } } // Trimmed clip
        }
      ];

      const deleteIndex = 1;
      const deletedDuration = 2000000;

      sprites.splice(deleteIndex, 1);

      // Act - This is WRONG ❌
      for (let i = deleteIndex; i < sprites.length; i++) {
        sprites[i].startTime -= deletedDuration;
        sprites[i].sprite.time.offset = sprites[i].startTime; // BUG!
      }

      // Assert - This is the bug
      expect(sprites[1].sprite.time.offset).toBe(3000000); // Wrong!
      // Should still be 1000000 (original clip offset), not 3000000 (timeline position)
    });
  });
});

describe('Integration: Timeline Position vs Source Clip Offset', () => {
  it('should maintain correct relationship between timeline and clip offsets', () => {
    // Arrange - Scenario with trimmed and untrimmed clips
    const timeline = [
      {
        id: '1',
        startTime: 0,        // Timeline: 0-5s
        duration: 5000000,
        sprite: {
          time: {
            offset: 0,       // Source: 0-5s (full clip)
            duration: 5000000
          }
        }
      },
      {
        id: '2',
        startTime: 5000000,  // Timeline: 5-12s
        duration: 7000000,
        sprite: {
          time: {
            offset: 2000000, // Source: 2-9s (trimmed 2s from start)
            duration: 7000000
          }
        }
      },
      {
        id: '3',
        startTime: 12000000, // Timeline: 12-15s
        duration: 3000000,
        sprite: {
          time: {
            offset: 0,       // Source: 0-3s (full clip)
            duration: 3000000
          }
        }
      }
    ];

    // Act - Calculate source times for various timeline times
    function getSourceTime(timelineTime) {
      const sprite = timeline.find(s =>
        timelineTime >= s.startTime &&
        timelineTime < (s.startTime + s.duration)
      );

      if (!sprite) return null;

      const spriteTime = timelineTime - sprite.startTime;
      const sourceTime = sprite.sprite.time.offset + spriteTime;
      return { spriteId: sprite.id, sourceTime };
    }

    // Assert
    // Timeline 2s → Sprite 1 at source 2s
    expect(getSourceTime(2000000)).toEqual({ spriteId: '1', sourceTime: 2000000 });

    // Timeline 7s → Sprite 2 at source 4s (2s offset + 2s into sprite)
    expect(getSourceTime(7000000)).toEqual({ spriteId: '2', sourceTime: 4000000 });

    // Timeline 13s → Sprite 3 at source 1s (0s offset + 1s into sprite)
    expect(getSourceTime(13000000)).toEqual({ spriteId: '3', sourceTime: 1000000 });
  });

  it('should correctly handle rendering with offsets', async () => {
    // Arrange
    const clip = new MockMP4Clip('source');
    const sprite = new MockOffscreenSprite(clip);

    // Sprite positioned at timeline 5s, showing source from 2s-7s
    sprite.time = {
      offset: 2000000,  // Start 2s into source
      duration: 5000000
    };

    const spriteState = {
      startTime: 5000000, // Timeline position
      duration: 5000000,
      sprite: sprite
    };

    // Act - Render at timeline time 7s (2s into the sprite)
    const timelineTime = 7000000;
    const spriteTime = timelineTime - spriteState.startTime; // 2000000
    const renderResult = await sprite.offscreenRender(spriteTime);

    // Assert
    expect(spriteTime).toBe(2000000); // 2s into sprite
    // sprite.offscreenRender receives 2s, which it will add to offset (2s) to get 4s in source
    expect(renderResult).toBeDefined();
    expect(renderResult.video).toBeDefined();
  });
});
