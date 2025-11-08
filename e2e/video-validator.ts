import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number;        // Duration in seconds
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  hasAudio: boolean;
  frameRate: number;
  bitrate: number;
}

/**
 * Get video metadata using ffprobe
 */
export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;

  const { stdout } = await execAsync(command);
  const data = JSON.parse(stdout);

  const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
  const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');

  if (!videoStream) {
    throw new Error('No video stream found in file');
  }

  // Parse frame rate (can be in format "30/1" or "29.97")
  let frameRate = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    frameRate = den ? num / den : num;
  }

  return {
    duration: parseFloat(data.format.duration || '0'),
    width: videoStream.width,
    height: videoStream.height,
    videoCodec: videoStream.codec_name,
    audioCodec: audioStream ? audioStream.codec_name : null,
    hasAudio: !!audioStream,
    frameRate,
    bitrate: parseInt(data.format.bit_rate || '0', 10)
  };
}

/**
 * Check if video frames are not black (samples N frames)
 */
export async function checkFramesNotBlack(videoPath: string, sampleCount: number = 5): Promise<boolean> {
  try {
    // Use ffmpeg to extract sample frames and check if they have meaningful content
    // blackdetect filter will output if frames are black
    const command = `ffmpeg -i "${videoPath}" -vf "blackdetect=d=0.1:pix_th=0.1" -an -f null - 2>&1 | grep blackdetect`;

    const { stdout } = await execAsync(command);

    // If blackdetect found black sections, stdout will have content
    // For a good export, we expect no or minimal black sections
    const blackSections = stdout.trim().split('\n').filter(line => line.includes('black_start')).length;

    // Allow up to 1 black section (might be at start/end transitions)
    return blackSections <= 1;
  } catch (error: any) {
    // If grep finds nothing (no black sections), it exits with code 1
    // This is actually a good thing - no black frames detected
    if (error.code === 1 && error.stdout === '') {
      return true; // No black frames found
    }
    throw error;
  }
}

/**
 * Validate exported video meets expectations
 */
export interface ValidationOptions {
  minDuration?: number;      // Minimum duration in seconds
  maxDuration?: number;      // Maximum duration in seconds
  expectedDuration?: number; // Expected duration (with tolerance)
  durationTolerance?: number; // Tolerance in seconds (default 0.5)
  requireAudio?: boolean;
  expectedCodec?: string;
  checkFrames?: boolean;     // Check if frames are not black
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  metadata: VideoMetadata;
}

export async function validateVideo(
  videoPath: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Get metadata
  let metadata: VideoMetadata;
  try {
    metadata = await getVideoMetadata(videoPath);
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Failed to read video metadata: ${error.message}`],
      metadata: null as any
    };
  }

  // Check duration constraints
  if (options.minDuration !== undefined && metadata.duration < options.minDuration) {
    errors.push(`Duration too short: ${metadata.duration}s < ${options.minDuration}s`);
  }

  if (options.maxDuration !== undefined && metadata.duration > options.maxDuration) {
    errors.push(`Duration too long: ${metadata.duration}s > ${options.maxDuration}s`);
  }

  if (options.expectedDuration !== undefined) {
    const tolerance = options.durationTolerance || 0.5;
    const diff = Math.abs(metadata.duration - options.expectedDuration);
    if (diff > tolerance) {
      errors.push(
        `Duration mismatch: expected ${options.expectedDuration}s ± ${tolerance}s, got ${metadata.duration}s (diff: ${diff.toFixed(2)}s)`
      );
    }
  }

  // Check audio
  if (options.requireAudio && !metadata.hasAudio) {
    errors.push('Video has no audio track');
  }

  // Check codec
  if (options.expectedCodec && metadata.videoCodec !== options.expectedCodec) {
    errors.push(`Video codec mismatch: expected ${options.expectedCodec}, got ${metadata.videoCodec}`);
  }

  // Check frames are not black
  if (options.checkFrames) {
    try {
      const framesOk = await checkFramesNotBlack(videoPath);
      if (!framesOk) {
        errors.push('Video contains significant black frames');
      }
    } catch (error: any) {
      errors.push(`Frame check failed: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metadata
  };
}
