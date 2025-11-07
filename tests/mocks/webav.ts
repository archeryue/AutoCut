/**
 * Mock WebAV Classes
 * For testing our integration code without real WebAV
 * Matches WebAV's actual type definitions
 */

import { vi } from 'vitest';

// Match WebAV's ClipMeta structure
interface ClipMeta {
  duration: number;
  width: number;
  height: number;
  audioSampleRate: number;
  audioChanCount: number;
}

interface RenderResult {
  video: any;
  audio: Float32Array[] | null;
}

interface SpriteTime {
  offset: number;
  duration: number;
  playbackRate?: number;
}

interface CombinatorConfig {
  width: number;
  height: number;
  bitrate?: number;
  videoCodec?: string;
  audioCodec?: string;
}

export class MockMP4Clip {
  source: any;
  meta: ClipMeta;
  ready: Promise<void>;

  constructor(source: any) {
    this.source = source;
    this.meta = {
      duration: 10000000, // 10 seconds in microseconds
      width: 1920,
      height: 1080,
      audioSampleRate: 48000,
      audioChanCount: 2,
    };
    this.ready = Promise.resolve();
  }

  tick(time: number): Promise<RenderResult> {
    return Promise.resolve({
      video: {
        close: vi.fn(),
      } as any,
      audio: null,
    });
  }
}

export class MockOffscreenSprite {
  clip: MockMP4Clip;
  time: SpriteTime;
  opacity: number;
  _renderCalls: number;

  constructor(clip: MockMP4Clip) {
    this.clip = clip;
    this.time = {
      offset: 0,
      duration: 0,
      playbackRate: 1.0,
    };
    this.opacity = 1.0;
    this._renderCalls = 0;
  }

  async offscreenRender(time: number): Promise<RenderResult> {
    this._renderCalls++;
    return {
      video: {
        close: vi.fn(),
        width: 1920,
        height: 1080,
      } as any,
      audio: null,
    };
  }
}

export class MockCombinator {
  config: CombinatorConfig;
  sprites: MockOffscreenSprite[];

  constructor(config: CombinatorConfig) {
    this.config = config;
    this.sprites = [];
  }

  async addSprite(sprite: MockOffscreenSprite): Promise<void> {
    this.sprites.push(sprite);
  }

  output(): ReadableStream<Uint8Array> {
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
