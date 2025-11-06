/**
 * VideoEditor Class
 * Core video editing functionality
 */
class VideoEditor {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.clips = [];
        this.currentClipId = 0;
        this.selectedClip = null;
        this.isPlaying = false;
        this.filters = {
            grayscale: false,
            sepia: false,
            brightness: 1.0,
            contrast: 1.0,
            opacity: 1.0
        };
        this.playbackRate = 1.0;
        this.duration = 0;
        this.currentTime = 0;
    }

    /**
     * Initialize the video editor with video element and canvas
     */
    init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Set up video event listeners
        this.video.addEventListener('loadedmetadata', () => {
            this.duration = this.video.duration;
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.createDefaultClip();
        });

        this.video.addEventListener('timeupdate', () => {
            this.currentTime = this.video.currentTime;
            this.applyFilters();
        });

        this.video.addEventListener('play', () => {
            this.isPlaying = true;
            this.startRendering();
        });

        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
        });

        this.video.addEventListener('ended', () => {
            this.isPlaying = false;
        });
    }

    /**
     * Load video from file
     */
    loadVideo(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('video/')) {
                reject(new Error('Invalid file type'));
                return;
            }

            const url = URL.createObjectURL(file);
            this.video.src = url;

            this.video.onloadedmetadata = () => {
                resolve({
                    duration: this.video.duration,
                    width: this.video.videoWidth,
                    height: this.video.videoHeight,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            };

            this.video.onerror = () => {
                reject(new Error('Failed to load video'));
            };
        });
    }

    /**
     * Create a default clip representing the entire video
     */
    createDefaultClip() {
        const clip = {
            id: this.currentClipId++,
            startTime: 0,
            endTime: this.duration,
            startPosition: 0,
            endPosition: this.duration,
            duration: this.duration
        };
        this.clips = [clip];
        this.selectedClip = clip;
    }

    /**
     * Split clip at current time
     */
    splitClip(clipId, splitTime) {
        const clipIndex = this.clips.findIndex(c => c.id === clipId);
        if (clipIndex === -1) return null;

        const clip = this.clips[clipIndex];

        // Can't split at the edges
        if (splitTime <= clip.startPosition || splitTime >= clip.endPosition) {
            return null;
        }

        // Create two new clips
        const clip1 = {
            id: this.currentClipId++,
            startTime: clip.startTime,
            endTime: clip.startTime + (splitTime - clip.startPosition),
            startPosition: clip.startPosition,
            endPosition: splitTime,
            duration: splitTime - clip.startPosition
        };

        const clip2 = {
            id: this.currentClipId++,
            startTime: clip.startTime + (splitTime - clip.startPosition),
            endTime: clip.endTime,
            startPosition: splitTime,
            endPosition: clip.endPosition,
            duration: clip.endPosition - splitTime
        };

        // Replace the original clip with the two new clips
        this.clips.splice(clipIndex, 1, clip1, clip2);

        return { clip1, clip2 };
    }

    /**
     * Delete a clip
     */
    deleteClip(clipId) {
        const clipIndex = this.clips.findIndex(c => c.id === clipId);
        if (clipIndex === -1) return false;

        this.clips.splice(clipIndex, 1);

        // Reorganize positions
        this.reorganizeClips();

        if (this.selectedClip && this.selectedClip.id === clipId) {
            this.selectedClip = null;
        }

        return true;
    }

    /**
     * Reorganize clips after deletion or reordering
     */
    reorganizeClips() {
        let currentPosition = 0;
        this.clips.forEach(clip => {
            clip.startPosition = currentPosition;
            clip.endPosition = currentPosition + clip.duration;
            currentPosition = clip.endPosition;
        });
    }

    /**
     * Trim clip
     */
    trimClip(clipId, newStartTime, newEndTime) {
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return false;

        if (newStartTime < clip.startTime) newStartTime = clip.startTime;
        if (newEndTime > clip.endTime) newEndTime = clip.endTime;
        if (newStartTime >= newEndTime) return false;

        const oldDuration = clip.duration;
        clip.startTime = newStartTime;
        clip.endTime = newEndTime;
        clip.duration = newEndTime - newStartTime;

        // Update positions
        const durationChange = clip.duration - oldDuration;
        const clipIndex = this.clips.findIndex(c => c.id === clipId);

        for (let i = clipIndex; i < this.clips.length; i++) {
            if (i === clipIndex) {
                this.clips[i].endPosition = this.clips[i].startPosition + this.clips[i].duration;
            } else {
                this.clips[i].startPosition += durationChange;
                this.clips[i].endPosition += durationChange;
            }
        }

        return true;
    }

    /**
     * Apply visual filters to video
     */
    applyFilters() {
        if (!this.video || !this.canvas || !this.ctx) return;

        // Draw current video frame to canvas
        this.ctx.save();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Set global alpha (opacity)
        this.ctx.globalAlpha = this.filters.opacity;

        // Draw video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Apply CSS filters
        let filterString = '';

        if (this.filters.grayscale) {
            filterString += 'grayscale(100%) ';
        }

        if (this.filters.sepia) {
            filterString += 'sepia(100%) ';
        }

        if (this.filters.brightness !== 1.0) {
            filterString += `brightness(${this.filters.brightness}) `;
        }

        if (this.filters.contrast !== 1.0) {
            filterString += `contrast(${this.filters.contrast}) `;
        }

        if (filterString) {
            // Apply filters by redrawing with filter
            this.ctx.filter = filterString;
            this.ctx.drawImage(this.canvas, 0, 0);
            this.ctx.filter = 'none';
        }

        this.ctx.restore();
    }

    /**
     * Start rendering loop for filters
     */
    startRendering() {
        const render = () => {
            if (this.isPlaying) {
                this.applyFilters();
                requestAnimationFrame(render);
            }
        };
        render();
    }

    /**
     * Set filter
     */
    setFilter(filterName, value) {
        if (filterName in this.filters) {
            this.filters[filterName] = value;
            this.applyFilters();
        }
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        this.filters = {
            grayscale: false,
            sepia: false,
            brightness: 1.0,
            contrast: 1.0,
            opacity: 1.0
        };
        this.applyFilters();
    }

    /**
     * Set playback rate
     */
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.video) {
            this.video.playbackRate = rate;
        }
    }

    /**
     * Set volume
     */
    setVolume(volume) {
        if (this.video) {
            this.video.volume = volume / 100;
        }
    }

    /**
     * Get total duration of all clips
     */
    getTotalDuration() {
        if (this.clips.length === 0) return 0;
        return this.clips[this.clips.length - 1].endPosition;
    }

    /**
     * Get clip at specific position
     */
    getClipAtPosition(position) {
        return this.clips.find(clip =>
            position >= clip.startPosition && position <= clip.endPosition
        );
    }

    /**
     * Seek to position
     */
    seekTo(position) {
        const clip = this.getClipAtPosition(position);
        if (!clip) return;

        const offsetInClip = position - clip.startPosition;
        const videoTime = clip.startTime + offsetInClip;

        if (this.video) {
            this.video.currentTime = videoTime;
        }
    }

    /**
     * Play/Pause toggle
     */
    togglePlayPause() {
        if (!this.video) return;

        if (this.isPlaying) {
            this.video.pause();
        } else {
            this.video.play();
        }
    }

    /**
     * Stop playback
     */
    stop() {
        if (this.video) {
            this.video.pause();
            this.video.currentTime = 0;
        }
    }

    /**
     * Export video configuration
     */
    getExportConfig() {
        return {
            clips: this.clips,
            filters: this.filters,
            duration: this.getTotalDuration(),
            resolution: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }

    /**
     * Get video metadata
     */
    getMetadata() {
        if (!this.video) return null;

        return {
            duration: this.duration,
            currentTime: this.currentTime,
            width: this.video.videoWidth,
            height: this.video.videoHeight,
            playbackRate: this.playbackRate,
            volume: this.video.volume * 100
        };
    }
}

// Export for use in app.js
window.VideoEditor = VideoEditor;
