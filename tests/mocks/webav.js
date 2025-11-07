/**
 * Mock WebAV Classes
 * For testing our integration code without real WebAV
 */

import { vi } from 'vitest';

export class MockMP4Clip {
  constructor(source) {
    this.source = source;
    this.meta = {
      duration: 10000000, // 10 seconds in microseconds
      width: 1920,
      height: 1080,
    };
    this.ready = Promise.resolve();
  }

  tick(time) {
    return Promise.resolve({
      video: {
        close: vi.fn(),
      },
      audio: null,
    });
  }
}

export class MockOffscreenSprite {
  constructor(clip) {
    this.clip = clip;
    this.time = {
      offset: 0,
      duration: 0,
      playbackRate: 1.0,
    };
    this.opacity = 1.0;
    this._renderCalls = 0;
  }

  async offscreenRender(time) {
    this._renderCalls++;
    return {
      video: {
        close: vi.fn(),
        width: 1920,
        height: 1080,
      },
      audio: null,
    };
  }
}

export class MockCombinator {
  constructor(config) {
    this.config = config;
    this.sprites = [];
  }

  async addSprite(sprite) {
    this.sprites.push(sprite);
  }

  output() {
    // Return a mock ReadableStream
    return new ReadableStream({
      start(controller) {
        // Mock MP4 data
        const mockData = new Uint8Array([0x00, 0x00, 0x00, 0x20]);
        controller.enqueue(mockData);
        controller.close();
      },
    });
  }
}
