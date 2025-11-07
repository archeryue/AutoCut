/**
 * AutoCut Application Types
 */

import type { MP4Clip, OffscreenSprite } from '@webav/av-cliper';

/**
 * Material metadata from uploaded video
 */
export interface MaterialMetadata {
  duration: number; // microseconds
  width: number;
  height: number;
  size: number; // bytes
  audioSampleRate: number;
  audioChannels: number;
}

/**
 * Material (uploaded video file)
 */
export interface Material {
  id: string;
  name: string;
  file: File;
  clip: MP4Clip;
  metadata: MaterialMetadata;
}

/**
 * Filter settings for a sprite
 */
export interface FilterSettings {
  grayscale: boolean;
  sepia: boolean;
  brightness: number; // 0-2, default 1
  contrast: number; // 0-2, default 1
  blur: number; // pixels, 0 = no blur
}

/**
 * Sprite state on timeline
 */
export interface SpriteState {
  id: string;
  materialId: string;
  clip: MP4Clip;
  sprite: OffscreenSprite;
  startTime: number; // Position on timeline (microseconds)
  duration: number; // Duration on timeline (microseconds)
  filters: FilterSettings;
  playbackRate: number;
  opacity: number; // 0-1
}

/**
 * Application state
 */
export interface AppState {
  // Materials
  materials: Material[];

  // Timeline
  sprites: SpriteState[];
  selectedSpriteId: string | null;

  // Playback
  currentTime: number; // microseconds
  isPlaying: boolean;
  animationFrameId: number | null;
  lastFrameTime: number | null;

  // Canvas
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;

  // Audio
  audioContext: AudioContext | null;
  nextAudioTime: number; // Scheduled audio time

  // UI
  zoom: number; // pixels per second
}

/**
 * Export progress state
 */
export interface ExportProgress {
  percent: number;
  currentTime: number;
  totalDuration: number;
}

/**
 * Utility type for generating unique IDs
 */
export type UniqueId = string;
