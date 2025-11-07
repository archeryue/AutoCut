/**
 * Test Setup
 * Mocks for WebAV and browser APIs
 */

import { vi } from 'vitest';

// Mock WebCodecs APIs
(global as any).VideoEncoder = vi.fn();
(global as any).VideoDecoder = vi.fn();
(global as any).AudioEncoder = vi.fn();
(global as any).AudioDecoder = vi.fn();

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  globalAlpha: 1,
  filter: 'none',
})) as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch
(global as any).fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    body: new ReadableStream(),
  })
);

// Mock File.prototype.stream() method
if (typeof File !== 'undefined' && !File.prototype.stream) {
  (File.prototype as any).stream = function(this: File) {
    // Return a ReadableStream that provides the file content
    return new ReadableStream({
      start(controller) {
        // Mock: Enqueue some data based on file content
        const encoder = new TextEncoder();
        const data = encoder.encode('mock video data');
        controller.enqueue(data);
        controller.close();
      }
    });
  };
}

console.log('Test environment setup complete');
