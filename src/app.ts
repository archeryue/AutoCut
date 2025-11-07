/**
 * AutoCut v2.0 - WebAV-Powered Video Editor
 * Main Application (TypeScript)
 */

// Import WebAV from npm package (Vite will bundle it)
import { MP4Clip, OffscreenSprite, Combinator } from '@webav/av-cliper';

// Import our application types
import type { AppState, Material, SpriteState, FilterSettings } from './types/app';

// ==================== Global State ====================

const state: AppState = {
    // Materials (uploaded videos)
    materials: [],

    // Timeline sprites (clips on timeline)
    sprites: [],

    // UI state
    selectedSpriteId: null,
    currentTime: 0, // microseconds
    isPlaying: false,
    zoom: 1.0, // pixels per second

    // Canvas
    canvas: null,
    ctx: null,

    // Playback
    animationFrameId: null,
    lastFrameTime: null,

    // Audio
    audioContext: null,
    nextAudioTime: 0, // Track when next audio chunk should play
};

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('AutoCut v2.0 initializing...');

    // Check WebCodecs support
    if (!window.VideoEncoder || !window.VideoDecoder) {
        alert('WebCodecs API is not supported in your browser. Please use Chrome 94+ or Edge 94+.');
        return;
    }

    initializeCanvas();
    setupEventListeners();

    console.log('AutoCut initialized successfully');
});

// ==================== Canvas Setup ====================

function initializeCanvas(): void {
    state.canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    if (!state.canvas) {
        console.error('Canvas element not found');
        return;
    }

    state.ctx = state.canvas.getContext('2d');
    if (!state.ctx) {
        console.error('Could not get 2D context');
        return;
    }

    // Set default canvas size
    state.canvas.width = 1920;
    state.canvas.height = 1080;
}

// ==================== Event Listeners ====================

function setupEventListeners(): void {
    // Tab switching
    setupTabs();

    // File upload
    setupFileUpload();

    // Playback controls
    setupPlaybackControls();

    // Timeline tools
    setupTimelineTools();

    // Timeline interaction
    setupTimelineInteraction();

    // Filters
    setupFilters();

    // Export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportVideo);
    }

    // New project
    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', newProject);
    }
}

// ==================== Tab System ====================

function setupTabs(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const tabPanels = document.querySelectorAll<HTMLDivElement>('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            if (!tabName) return;

            // Update button states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update panel states
            tabPanels.forEach(panel => {
                if (panel.dataset.panel === tabName) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });
}

// ==================== File Upload & Material Management ====================

function setupFileUpload(): void {
    const videoUpload = document.getElementById('videoUpload') as HTMLInputElement;
    const dropZone = document.getElementById('dropZone');

    if (!videoUpload || !dropZone) return;

    // File input change
    videoUpload.addEventListener('change', handleFileSelect);

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', handleDrop);
}

function preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

async function handleFileSelect(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    if (!target.files) return;

    const files = Array.from(target.files);
    for (const file of files) {
        await loadVideoFile(file);
    }
}

async function handleDrop(e: DragEvent): Promise<void> {
    if (!e.dataTransfer) return;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));

    for (const file of files) {
        await loadVideoFile(file);
    }
}

async function loadVideoFile(file: File): Promise<void> {
    showLoading(true, 'Loading video...');

    try {
        console.log('Loading video:', file.name);

        // Create MP4Clip directly from file stream
        const clip = new MP4Clip(file.stream());
        await clip.ready;

        // Get metadata
        const meta = clip.meta;
        console.log('Video metadata:', meta);

        // Create material object
        const material: Material = {
            id: generateId(),
            name: file.name,
            file: file,
            clip: clip,
            metadata: {
                duration: meta.duration, // microseconds
                width: meta.width,
                height: meta.height,
                size: file.size,
                // Audio info from WebAV (uses audioChanCount, not audioChannels)
                audioSampleRate: meta.audioSampleRate || 48000,
                audioChannels: meta.audioChanCount || 2
            }
        };

        console.log('Clip metadata:', meta);

        state.materials.push(material);

        // Add to material list UI
        addMaterialToUI(material);

        // Auto-add first video to timeline
        if (state.sprites.length === 0) {
            await addMaterialToTimeline(material);
        }

        showLoading(false);

    } catch (error) {
        console.error('Error loading video:', error);
        showLoading(false);
        alert('Failed to load video: ' + (error instanceof Error ? error.message : String(error)));
    }
}

function addMaterialToUI(material: Material): void {
    const materialList = document.getElementById('materialList');
    if (!materialList) return;

    const item = document.createElement('div');
    item.className = 'material-item';
    item.dataset.materialId = material.id;

    // Create thumbnail (placeholder for now)
    const thumbnail = document.createElement('div');
    thumbnail.className = 'material-thumbnail';
    thumbnail.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    // Info
    const info = document.createElement('div');
    info.className = 'material-info';

    const name = document.createElement('div');
    name.className = 'material-name';
    name.textContent = material.name;

    const meta = document.createElement('div');
    meta.className = 'material-meta';
    meta.textContent = `${formatDuration(material.metadata.duration)} • ${material.metadata.width}x${material.metadata.height}`;

    info.appendChild(name);
    info.appendChild(meta);

    item.appendChild(thumbnail);
    item.appendChild(info);

    // Click to add to timeline
    item.addEventListener('click', () => addMaterialToTimeline(material));

    materialList.appendChild(item);
}

async function addMaterialToTimeline(material: Material): Promise<void> {
    try {
        // Calculate start position (end of last sprite)
        let startPosition = 0;
        if (state.sprites.length > 0) {
            const lastSprite = state.sprites[state.sprites.length - 1];
            if (lastSprite) {
                startPosition = lastSprite.startTime + lastSprite.duration;
            }
        }

        // Create sprite
        const sprite = new OffscreenSprite(material.clip);

        // Configure sprite timing
        // NOTE: sprite.time.offset is the offset WITHIN the source clip (0 = start from beginning)
        // The timeline position is stored separately in spriteState.startTime
        const duration = material.metadata.duration;
        sprite.time = {
            offset: 0,  // Start from beginning of clip
            duration: duration
        };

        // Set opacity (rect is handled internally by WebAV)
        sprite.opacity = 1.0;

        // Create sprite state object
        const spriteState: SpriteState = {
            id: generateId(),
            materialId: material.id,
            clip: material.clip,
            sprite: sprite,
            startTime: startPosition,
            duration: duration,
            filters: {
                grayscale: false,
                sepia: false,
                brightness: 1.0,
                contrast: 1.0,
                blur: 0
            },
            playbackRate: 1.0,
            opacity: 1.0
        };

        state.sprites.push(spriteState);

        // Render timeline
        renderTimeline();

        // Hide placeholder if first video
        if (state.sprites.length === 1) {
            const placeholder = document.getElementById('canvasPlaceholder');
            if (placeholder) {
                placeholder.classList.remove('active');
            }
            await renderFrame(0);
        }

        console.log('Added sprite to timeline:', spriteState);

    } catch (error) {
        console.error('Error adding to timeline:', error);
        alert('Failed to add video to timeline: ' + (error instanceof Error ? error.message : String(error)));
    }
}

// ==================== Timeline Rendering ====================

function renderTimeline(): void {
    const clipsContainer = document.getElementById('clipsContainer');
    const timeMarkers = document.getElementById('timeMarkers');

    if (!clipsContainer || !timeMarkers) return;

    // Clear existing
    clipsContainer.innerHTML = '';
    timeMarkers.innerHTML = '';

    if (state.sprites.length === 0) return;

    // Calculate total duration
    const totalDuration = getTotalDuration();
    const totalDurationSec = totalDuration / 1000000;

    // Update duration display
    const totalDurationEl = document.getElementById('totalDuration');
    if (totalDurationEl) {
        totalDurationEl.textContent = formatTime(totalDurationSec);
    }

    // Render time markers
    renderTimeMarkers(totalDurationSec);

    // Render clips
    state.sprites.forEach(spriteState => {
        const clipEl = createClipElement(spriteState);
        clipsContainer.appendChild(clipEl);
    });

    // Update playhead
    updatePlayhead();
}

function renderTimeMarkers(totalDurationSec: number): void {
    const timeMarkers = document.getElementById('timeMarkers');
    if (!timeMarkers) return;

    const markerCount = Math.ceil(totalDurationSec / 5); // Every 5 seconds

    for (let i = 0; i <= markerCount; i++) {
        const time = i * 5;
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.style.left = (time * state.zoom) + 'px';
        marker.textContent = formatTime(time);
        timeMarkers.appendChild(marker);
    }
}

function createClipElement(spriteState: SpriteState): HTMLDivElement {
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.dataset.spriteId = spriteState.id;

    if (spriteState.id === state.selectedSpriteId) {
        clip.classList.add('selected');
    }

    // Position and width
    const startSec = spriteState.startTime / 1000000;
    const durationSec = spriteState.duration / 1000000;

    clip.style.left = (startSec * state.zoom) + 'px';
    clip.style.width = (durationSec * state.zoom) + 'px';

    // Label
    const label = document.createElement('span');
    label.className = 'clip-label';
    const material = state.materials.find(m => m.id === spriteState.materialId);
    label.textContent = material ? material.name : 'Clip';

    // Duration
    const duration = document.createElement('span');
    duration.className = 'clip-duration';
    duration.textContent = formatTime(durationSec);

    clip.appendChild(label);
    clip.appendChild(duration);

    // Resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-resize-handle left';

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-resize-handle right';

    clip.appendChild(leftHandle);
    clip.appendChild(rightHandle);

    // Click to select
    clip.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSprite(spriteState.id);
    });

    return clip;
}

function selectSprite(spriteId: string): void {
    state.selectedSpriteId = spriteId;
    renderTimeline();

    // Update filter UI for selected sprite
    updateFilterUI();

    console.log('Selected sprite:', spriteId);
}

// ==================== Playback Controls ====================

function setupPlaybackControls(): void {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const volumeSlider = document.getElementById('volumeSlider');

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', stop);
    }
    if (volumeSlider) {
        volumeSlider.addEventListener('input', handleVolumeChange);
    }
}

function togglePlayPause(): void {
    if (state.isPlaying) {
        pause();
    } else {
        play();
    }
}

function play(): void {
    if (state.sprites.length === 0) return;

    state.isPlaying = true;
    state.lastFrameTime = performance.now();

    // Initialize audio time for scheduling
    if (state.audioContext) {
        state.nextAudioTime = state.audioContext.currentTime;
    }

    const playIcon = document.querySelector('#playPauseBtn .icon');
    if (playIcon) {
        playIcon.textContent = '⏸';
    }

    playbackLoop();
}

function pause(): void {
    state.isPlaying = false;

    if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    // Reset audio scheduling when pausing
    if (state.audioContext) {
        state.nextAudioTime = state.audioContext.currentTime;
    }

    const playIcon = document.querySelector('#playPauseBtn .icon');
    if (playIcon) {
        playIcon.textContent = '▶';
    }
}

function stop(): void {
    pause();
    state.currentTime = 0;
    updatePlayhead();
    renderFrame(0);

    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = '00:00';
    }
}

async function playbackLoop(): Promise<void> {
    if (!state.isPlaying) return;

    const now = performance.now();
    const deltaMs = state.lastFrameTime !== null ? now - state.lastFrameTime : 0;
    state.lastFrameTime = now;

    // Find active sprite to get its playback rate
    const activeSprite = state.sprites.find(s =>
        state.currentTime >= s.startTime && state.currentTime < (s.startTime + s.duration)
    );
    const playbackRate = activeSprite ? activeSprite.playbackRate : 1.0;

    // Advance time (microseconds) - multiply by playback rate for speed control
    state.currentTime += deltaMs * 1000 * playbackRate;

    // Check if reached end
    const totalDuration = getTotalDuration();
    if (state.currentTime >= totalDuration) {
        state.currentTime = totalDuration;
        pause();
        console.log('Playback ended');
        return;
    }

    console.log('Playback loop - currentTime:', state.currentTime, 'totalDuration:', totalDuration);

    // Render frame (await to ensure frame is drawn)
    await renderFrame(state.currentTime);

    // Update UI
    updatePlayhead();
    const currentSec = state.currentTime / 1000000;
    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(currentSec);
    }

    // Continue loop
    state.animationFrameId = requestAnimationFrame(playbackLoop);
}

function handleVolumeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const volume = parseInt(target.value) / 100;
    // Note: Volume control would need to be implemented in WebAV audio handling
    console.log('Volume:', volume);
}

// ==================== Frame Rendering ====================

async function renderFrame(time: number): Promise<void> {
    if (!state.canvas || !state.ctx) return;

    // Find active sprite at current time
    const activeSprite = state.sprites.find(s =>
        time >= s.startTime && time < (s.startTime + s.duration)
    );

    if (!activeSprite) {
        // Clear canvas
        state.ctx.fillStyle = '#000';
        state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        console.log('No active sprite at time', time);
        return;
    }

    try {
        // Calculate time within sprite
        const spriteTime = time - activeSprite.startTime;

        // Calculate time in source clip (add offset for trimmed clips)
        // Multiply spriteTime by playbackRate for speed control (2x = twice as fast through source)
        const sourceTime = activeSprite.sprite.time.offset + (spriteTime * activeSprite.playbackRate);

        console.log('Rendering frame:', {
            timelineTime: time,
            spriteStartTime: activeSprite.startTime,
            spriteDuration: activeSprite.duration,
            spriteTime: spriteTime,
            spriteOffset: activeSprite.sprite.time.offset,
            sourceTime: sourceTime
        });

        // Get frame from clip (use tick for preview, not offscreenRender)
        const result = await activeSprite.clip.tick(sourceTime);

        console.log('Render result:', result);
        console.log('result.video type:', typeof result.video);
        console.log('result.video value:', result.video);

        if (result.video) {
            console.log('Drawing video frame to canvas');

            // Clear canvas
            state.ctx.fillStyle = '#000';
            state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

            // Apply opacity
            state.ctx.globalAlpha = activeSprite.opacity;

            // Draw video frame
            state.ctx.drawImage(result.video as unknown as CanvasImageSource, 0, 0, state.canvas.width, state.canvas.height);

            // Apply filters
            applyFilters(activeSprite.filters);

            // Close frame
            result.video.close();

            state.ctx.globalAlpha = 1.0;
        } else {
            console.log('No video frame in result - result.video is:', result.video);
        }

        // Handle audio (result.audio is an array of Float32Arrays - one per channel)
        if (result.audio && Array.isArray(result.audio) && result.audio.length > 0) {
            console.log('Audio frames available:', result.audio.length, 'channels');

            // Get audio metadata from the active sprite's material
            const material = state.materials.find(m => m.id === activeSprite.materialId);
            const sampleRate = material ? material.metadata.audioSampleRate : 48000;

            // Play the audio samples
            await playAudioSamples(result.audio, sampleRate);
        }
    } catch (error) {
        console.error('Error rendering frame:', error);
    }
}

async function playAudioSamples(channelSamples: Float32Array[], sampleRate: number): Promise<void> {
    try {
        // Create AudioContext if not exists
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            state.nextAudioTime = state.audioContext.currentTime;
            console.log('AudioContext created:', state.audioContext);
        }

        // Resume AudioContext if suspended (required by browser autoplay policy)
        if (state.audioContext.state === 'suspended') {
            await state.audioContext.resume();
            state.nextAudioTime = state.audioContext.currentTime;
        }

        // channelSamples is an array of Float32Arrays, one per channel
        const numberOfChannels = channelSamples.length;
        const length = channelSamples[0]?.length || 0;
        if (length === 0) return;

        const duration = length / sampleRate;

        console.log('Playing audio:', {
            numberOfChannels,
            length,
            sampleRate,
            duration: (duration * 1000).toFixed(2) + 'ms',
            scheduledAt: state.nextAudioTime.toFixed(3),
            currentTime: state.audioContext.currentTime.toFixed(3)
        });

        // Create AudioBuffer
        const audioBuffer = state.audioContext.createBuffer(
            numberOfChannels,
            length,
            sampleRate
        );

        // Copy samples to buffer
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const samples = channelSamples[channel];
            if (samples) {
                audioBuffer.copyToChannel(new Float32Array(samples), channel, 0);
            }
        }

        // Schedule audio to play at the correct time
        const source = state.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(state.audioContext.destination);

        // Schedule playback
        const playTime = Math.max(state.nextAudioTime, state.audioContext.currentTime);
        source.start(playTime);

        // Update next audio time
        state.nextAudioTime = playTime + duration;

        console.log('Audio scheduled successfully, next:', state.nextAudioTime.toFixed(3));
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

function applyFilters(filters: FilterSettings): void {
    if (!state.canvas || !state.ctx) return;

    let filterString = '';

    if (filters.grayscale) {
        filterString += 'grayscale(100%) ';
    }

    if (filters.sepia) {
        filterString += 'sepia(100%) ';
    }

    if (filters.brightness !== 1.0) {
        filterString += `brightness(${filters.brightness}) `;
    }

    if (filters.contrast !== 1.0) {
        filterString += `contrast(${filters.contrast}) `;
    }

    if (filters.blur > 0) {
        filterString += `blur(${filters.blur}px) `;
    }

    if (filterString) {
        state.ctx.filter = filterString;
        state.ctx.drawImage(state.canvas, 0, 0);
        state.ctx.filter = 'none';
    }
}

/**
 * Check if any filters are active (not default values)
 */
function hasActiveFilters(filters: FilterSettings): boolean {
    return filters.grayscale ||
           filters.sepia ||
           filters.brightness !== 1.0 ||
           filters.contrast !== 1.0 ||
           filters.blur > 0;
}

/**
 * Build CSS filter string from filter settings
 */
function buildFilterString(filters: FilterSettings): string {
    let filterString = '';

    if (filters.grayscale) {
        filterString += 'grayscale(100%) ';
    }

    if (filters.sepia) {
        filterString += 'sepia(100%) ';
    }

    if (filters.brightness !== 1.0) {
        filterString += `brightness(${filters.brightness}) `;
    }

    if (filters.contrast !== 1.0) {
        filterString += `contrast(${filters.contrast}) `;
    }

    if (filters.blur > 0) {
        filterString += `blur(${filters.blur}px) `;
    }

    return filterString.trim();
}

/**
 * Apply filters to clip using tickInterceptor for export
 * This processes video frames through an offscreen canvas with filters
 */
async function applyFiltersToClip(clip: MP4Clip, filters: FilterSettings): Promise<void> {
    const filterString = buildFilterString(filters);
    if (!filterString) return;

    // Create offscreen canvas for filter processing
    const canvas = new OffscreenCanvas(1920, 1080);
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    console.log('Setting up filter interceptor with:', filterString);

    // Set up tickInterceptor to process frames
    clip.tickInterceptor = async (time, tickRet) => {
        if (tickRet.video) {
            try {
                // Get video frame as any to access properties
                const videoFrame = tickRet.video as any;

                // Update canvas size to match video
                if (videoFrame.displayWidth && videoFrame.displayHeight) {
                    canvas.width = videoFrame.displayWidth;
                    canvas.height = videoFrame.displayHeight;
                }

                // Clear and draw video frame
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.filter = 'none';
                ctx.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);

                // Apply filters
                ctx.filter = filterString;
                ctx.drawImage(canvas, 0, 0);
                ctx.filter = 'none';

                // Close original frame and create new VideoFrame from filtered canvas
                const timestamp = videoFrame.timestamp;
                const duration = videoFrame.duration;
                videoFrame.close();

                // Create VideoFrame from canvas instead of ImageBitmap
                // VideoEncoder requires VideoFrame, not ImageBitmap
                const imageBitmap = await createImageBitmap(canvas);
                tickRet.video = new VideoFrame(imageBitmap, {
                    timestamp: timestamp,
                    duration: duration
                }) as any;
                imageBitmap.close();
            } catch (error) {
                console.error('Error applying filter in interceptor:', error);
            }
        }

        return tickRet;
    };
}

// ==================== Timeline Tools ====================

function setupTimelineTools(): void {
    const splitBtn = document.getElementById('splitBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');

    if (splitBtn) {
        splitBtn.addEventListener('click', splitClip);
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteClip);
    }
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => adjustZoom(1.5));
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => adjustZoom(0.67));
    }
}

function splitClip(): void {
    if (!state.selectedSpriteId) {
        alert('Please select a clip first');
        return;
    }

    const spriteIndex = state.sprites.findIndex(s => s.id === state.selectedSpriteId);
    if (spriteIndex === -1) return;

    const sprite = state.sprites[spriteIndex];
    if (!sprite) return;

    // Check if current time is within sprite
    if (state.currentTime <= sprite.startTime || state.currentTime >= (sprite.startTime + sprite.duration)) {
        alert('Move playhead within the selected clip to split');
        return;
    }

    // Calculate split point
    const splitPoint = state.currentTime - sprite.startTime;

    // Create two new sprites - MUST create new OffscreenSprite for BOTH parts
    // to avoid shared reference issues
    const sprite1: SpriteState = {
        ...sprite,
        id: generateId(),
        duration: splitPoint
    };
    // Create new sprite for first part (keep original offset)
    sprite1.sprite = new OffscreenSprite(sprite.clip);
    sprite1.sprite.time = {
        offset: sprite.sprite.time.offset,  // Keep original offset
        duration: splitPoint
    };
    sprite1.sprite.opacity = sprite.opacity;

    const sprite2: SpriteState = {
        ...sprite,
        id: generateId(),
        startTime: sprite.startTime + splitPoint,
        duration: sprite.duration - splitPoint
    };
    // Create new sprite for second part (offset by split point)
    sprite2.sprite = new OffscreenSprite(sprite.clip);
    sprite2.sprite.time = {
        // IMPORTANT: Add to existing offset, don't replace it
        offset: sprite.sprite.time.offset + splitPoint,
        duration: sprite2.duration
    };
    sprite2.sprite.opacity = sprite.opacity;

    // Replace original with split sprites
    state.sprites.splice(spriteIndex, 1, sprite1, sprite2);

    // Select first part
    state.selectedSpriteId = sprite1.id;

    renderTimeline();

    console.log('Split clip at', state.currentTime);
}

function deleteClip(): void {
    if (!state.selectedSpriteId) {
        alert('Please select a clip first');
        return;
    }

    if (!confirm('Delete selected clip?')) return;

    const spriteIndex = state.sprites.findIndex(s => s.id === state.selectedSpriteId);
    if (spriteIndex === -1) return;

    const deletedSprite = state.sprites[spriteIndex];
    if (!deletedSprite) return;

    const deletedDuration = deletedSprite.duration;

    // Remove sprite
    state.sprites.splice(spriteIndex, 1);

    // Shift subsequent sprites on timeline
    // NOTE: We only shift startTime (timeline position), not sprite.time.offset (source clip offset)
    for (let i = spriteIndex; i < state.sprites.length; i++) {
        const currentSprite = state.sprites[i];
        if (currentSprite) {
            currentSprite.startTime -= deletedDuration;
        }
    }

    state.selectedSpriteId = null;

    renderTimeline();

    // Show placeholder if no sprites
    if (state.sprites.length === 0) {
        const placeholder = document.getElementById('canvasPlaceholder');
        if (placeholder) {
            placeholder.classList.add('active');
        }
    }

    console.log('Deleted clip');
}

function adjustZoom(factor: number): void {
    state.zoom *= factor;
    state.zoom = Math.max(10, Math.min(state.zoom, 200)); // Clamp between 10 and 200
    renderTimeline();
}

// ==================== Timeline Interaction ====================

function setupTimelineInteraction(): void {
    const trackContent = document.getElementById('videoTrackContent');

    if (trackContent) {
        trackContent.addEventListener('click', handleTimelineClick);
    }
}

function handleTimelineClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.classList.contains('clip')) return;

    const currentTarget = e.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + currentTarget.scrollLeft;

    // Calculate time from position
    const timeSec = x / state.zoom;
    state.currentTime = timeSec * 1000000;

    // Clamp to valid range
    const totalDuration = getTotalDuration();
    state.currentTime = Math.max(0, Math.min(state.currentTime, totalDuration));

    // Update UI
    updatePlayhead();
    renderFrame(state.currentTime);

    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(state.currentTime / 1000000);
    }

    // Don't deselect sprite - user may want to keep selection while moving playhead
    // state.selectedSpriteId = null;
    // renderTimeline();
}

function updatePlayhead(): void {
    const playhead = document.getElementById('playhead');
    if (!playhead) return;

    const currentSec = state.currentTime / 1000000;
    playhead.style.left = (currentSec * state.zoom) + 'px';
}

// ==================== Filters ====================

function setupFilters(): void {
    // Filter buttons
    const filterBtns = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (filter) {
                applyFilterToSelectedSprite(filter);
            }
        });
    });

    // Speed control
    const speedSelect = document.getElementById('speedSelect') as HTMLSelectElement;
    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const speed = parseFloat(target.value);
            setSelectedSpriteSpeed(speed);
        });
    }

    // Opacity control
    const opacitySlider = document.getElementById('opacitySlider') as HTMLInputElement;
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const opacity = parseInt(target.value) / 100;
            setSelectedSpriteOpacity(opacity);

            const opacityValue = document.getElementById('opacityValue');
            if (opacityValue) {
                opacityValue.textContent = target.value + '%';
            }
        });
    }
}

function applyFilterToSelectedSprite(filterName: string): void {
    if (!state.selectedSpriteId) {
        alert('Please select a clip first');
        return;
    }

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    // Reset all filters
    sprite.filters = {
        grayscale: false,
        sepia: false,
        brightness: 1.0,
        contrast: 1.0,
        blur: 0
    };

    // Apply selected filter
    switch (filterName) {
        case 'grayscale':
            sprite.filters.grayscale = true;
            break;
        case 'sepia':
            sprite.filters.sepia = true;
            break;
        case 'brightness':
            sprite.filters.brightness = 1.5;
            break;
        case 'contrast':
            sprite.filters.contrast = 1.5;
            break;
        case 'blur':
            sprite.filters.blur = 5;
            break;
        case 'none':
        default:
            // Already reset
            break;
    }

    // Re-render current frame
    renderFrame(state.currentTime);

    // Update filter button states
    updateFilterUI();

    console.log('Applied filter:', filterName, 'to sprite:', sprite.id);
}

function setSelectedSpriteSpeed(speed: number): void {
    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    sprite.playbackRate = speed;
    sprite.sprite.time.playbackRate = speed;

    console.log('Set playback rate:', speed, 'for sprite:', sprite.id);

    // Re-render current frame to reflect speed change
    renderFrame(state.currentTime);
}

function setSelectedSpriteOpacity(opacity: number): void {
    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    sprite.opacity = opacity;
    sprite.sprite.opacity = opacity;

    // Re-render
    renderFrame(state.currentTime);
}

function updateFilterUI(): void {
    const filterBtns = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));

    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    // Update filter buttons
    const noneBtn = document.querySelector('[data-filter="none"]');
    const grayscaleBtn = document.querySelector('[data-filter="grayscale"]');
    const sepiaBtn = document.querySelector('[data-filter="sepia"]');
    const brightnessBtn = document.querySelector('[data-filter="brightness"]');
    const contrastBtn = document.querySelector('[data-filter="contrast"]');
    const blurBtn = document.querySelector('[data-filter="blur"]');

    if (sprite.filters.grayscale && grayscaleBtn) {
        grayscaleBtn.classList.add('active');
    } else if (sprite.filters.sepia && sepiaBtn) {
        sepiaBtn.classList.add('active');
    } else if (sprite.filters.brightness > 1 && brightnessBtn) {
        brightnessBtn.classList.add('active');
    } else if (sprite.filters.contrast > 1 && contrastBtn) {
        contrastBtn.classList.add('active');
    } else if (sprite.filters.blur > 0 && blurBtn) {
        blurBtn.classList.add('active');
    } else if (noneBtn) {
        noneBtn.classList.add('active');
    }

    // Update speed
    const speedSelect = document.getElementById('speedSelect') as HTMLSelectElement;
    if (speedSelect) {
        speedSelect.value = String(sprite.playbackRate);
    }

    // Update opacity
    const opacitySlider = document.getElementById('opacitySlider') as HTMLInputElement;
    const opacityValue = document.getElementById('opacityValue');
    if (opacitySlider) {
        opacitySlider.value = String(sprite.opacity * 100);
    }
    if (opacityValue) {
        opacityValue.textContent = Math.round(sprite.opacity * 100) + '%';
    }
}

// ==================== Export ====================

async function exportVideo(): Promise<void> {
    console.log('[EXPORT] exportVideo() called');
    console.log('[EXPORT] Number of sprites:', state.sprites.length);

    if (state.sprites.length === 0) {
        alert('No clips to export');
        return;
    }

    // Check WebCodecs support
    if (!window.VideoEncoder || !window.VideoDecoder) {
        alert('WebCodecs is not supported in this browser. Please use Chrome 94+ or Edge 94+');
        console.error('[EXPORT] WebCodecs not available');
        return;
    }
    console.log('[EXPORT] WebCodecs available:', {
        VideoEncoder: !!window.VideoEncoder,
        VideoDecoder: !!window.VideoDecoder
    });

    console.log('[EXPORT] Showing confirm dialog...');
    if (!confirm('Export video with current edits? This may take some time.')) {
        console.log('[EXPORT] User cancelled export');
        return;
    }
    console.log('[EXPORT] User confirmed export');

    const modal = document.getElementById('exportModal');
    if (!modal) {
        console.log('[EXPORT] ERROR: Export modal not found!');
        return;
    }

    console.log('[EXPORT] Showing export modal');
    modal.classList.remove('hidden');

    try {
        console.log('[EXPORT] Starting export process...');
        console.log('[EXPORT] Timeline sprites:', state.sprites.map(s => ({
            id: s.id,
            startTime: s.startTime,
            duration: s.duration,
            offset: s.sprite.time.offset
        })));

        // Create combinator
        const firstSprite = state.sprites[0];
        if (!firstSprite) throw new Error('No sprites to export');

        const material = state.materials.find(m => m.id === firstSprite.materialId);
        if (!material) throw new Error('Material not found');

        // Use VP8 + Opus codecs for cross-platform compatibility
        // (patched WebAV to use Opus instead of AAC for Linux/WSL2 support)
        const combinator = new Combinator({
            width: material.metadata.width,
            height: material.metadata.height,
            videoCodec: 'vp8',
            fps: 30,
            bitrate: 5e6 // 5 Mbps
            // audio: true by default, WebAV now uses Opus (patched in node_modules)
        });

        console.log('[EXPORT] Combinator created with:', {
            dimensions: `${material.metadata.width}x${material.metadata.height}`,
            codec: 'vp8',
            fps: 30,
            bitrate: '5 Mbps'
        });

        // Add all sprites in timeline order
        // For export, we need to create new OffscreenSprite instances configured for the Combinator
        let exportPosition = 0; // Track position in output video (microseconds)

        for (let i = 0; i < state.sprites.length; i++) {
            const spriteState = state.sprites[i];
            if (!spriteState) continue;

            const spriteMaterial = state.materials.find(m => m.id === spriteState.materialId);

            console.log(`Adding sprite ${i + 1}/${state.sprites.length}:`, {
                clip: spriteMaterial?.name,
                offset: spriteState.sprite.time.offset,
                duration: spriteState.duration,
                exportPosition: exportPosition,
                hasFilters: hasActiveFilters(spriteState.filters)
            });

            // Apply filters if needed
            let clipToUse = spriteState.clip;
            const hasFilters = hasActiveFilters(spriteState.filters);

            if (hasFilters) {
                console.log('[EXPORT] Cloning clip for filtered sprite:', spriteState.id);
                const cloneStart = performance.now();
                clipToUse = await spriteState.clip.clone();
                console.log('[EXPORT] Clone completed in', (performance.now() - cloneStart).toFixed(2), 'ms');
                await applyFiltersToClip(clipToUse, spriteState.filters);
                console.log('[EXPORT] Filters applied to cloned clip');
            }

            // Create a new OffscreenSprite for export
            console.log('[EXPORT] Creating OffscreenSprite for export');
            const exportSprite = new OffscreenSprite(clipToUse);

            // Configure time - offset is where to start in source, duration is how much to use
            exportSprite.time = {
                offset: spriteState.sprite.time.offset, // Trim offset in source clip
                duration: spriteState.duration // Duration to export
            };

            // Apply opacity
            exportSprite.opacity = spriteState.opacity;

            // Add sprite to combinator
            console.log('[EXPORT] Adding sprite to combinator...');
            const addSpriteStart = performance.now();
            await combinator.addSprite(exportSprite);
            console.log('[EXPORT] Sprite added in', (performance.now() - addSpriteStart).toFixed(2), 'ms');

            exportPosition += spriteState.duration;
            updateExportProgress((i / state.sprites.length) * 50); // First 50% for adding sprites
        }

        console.log('[EXPORT] All sprites added to combinator. Total duration:', exportPosition / 1000000, 'seconds');

        // Get output stream
        console.log('[EXPORT] Calling combinator.output() to generate stream...');
        const outputStart = performance.now();
        const stream = combinator.output();
        console.log('[EXPORT] Stream generated in', (performance.now() - outputStart).toFixed(2), 'ms');

        // Collect chunks
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        console.log('[EXPORT] Stream reader created, starting to read chunks...');

        let done = false;
        let chunkCount = 0;
        let lastLogTime = performance.now();
        const readStart = performance.now();

        while (!done) {
            const chunkReadStart = performance.now();
            const { value, done: readerDone } = await reader.read();
            const chunkReadTime = performance.now() - chunkReadStart;
            done = readerDone;

            if (value) {
                chunks.push(value);
                chunkCount++;

                // Update progress (50-99% for encoding)
                const progress = 50 + Math.min((chunkCount / 100) * 49, 49);
                updateExportProgress(progress);

                // Log every chunk or every 2 seconds
                const now = performance.now();
                if (chunkCount <= 10 || (now - lastLogTime) > 2000) {
                    console.log(`[EXPORT] Chunk ${chunkCount}: ${value.byteLength} bytes (read took ${chunkReadTime.toFixed(2)}ms)`);
                    lastLogTime = now;
                }
            } else if (readerDone) {
                console.log(`[EXPORT] Stream complete after ${chunkCount} chunks in ${(performance.now() - readStart).toFixed(2)}ms`);
            }
        }

        console.log(`Total chunks: ${chunkCount}, total size: ${chunks.reduce((sum, c) => sum + c.byteLength, 0)} bytes`);

        // Create blob and download
        const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `autocut-export-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        updateExportProgress(100);

        setTimeout(() => {
            modal.classList.add('hidden');
            alert('Export complete!');
        }, 1000);

        console.log('Export complete');

    } catch (error) {
        console.error('Export error:', error);
        modal.classList.add('hidden');
        alert('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    }
}

function updateExportProgress(percent: number): void {
    const progressBar = document.getElementById('exportProgressBar');
    const progressText = document.getElementById('exportProgressText');

    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    if (progressText) {
        progressText.textContent = Math.round(percent) + '%';
    }
}

// ==================== Utility Functions ====================

function getTotalDuration(): number {
    if (state.sprites.length === 0) return 0;

    const lastSprite = state.sprites[state.sprites.length - 1];
    if (!lastSprite) return 0;

    return lastSprite.startTime + lastSprite.duration;
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(microseconds: number): string {
    return formatTime(microseconds / 1000000);
}

function showLoading(show: boolean, text: string = 'Processing...'): void {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (!overlay || !loadingText) return;

    if (show) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function newProject(): void {
    if (state.sprites.length > 0) {
        if (!confirm('Start a new project? Current work will be lost.')) {
            return;
        }
    }

    // Reset state
    state.materials = [];
    state.sprites = [];
    state.selectedSpriteId = null;
    state.currentTime = 0;
    pause();

    // Clear UI
    const materialList = document.getElementById('materialList');
    const clipsContainer = document.getElementById('clipsContainer');
    const placeholder = document.getElementById('canvasPlaceholder');

    if (materialList) materialList.innerHTML = '';
    if (clipsContainer) clipsContainer.innerHTML = '';
    if (placeholder) placeholder.classList.add('active');

    // Clear canvas
    if (state.ctx && state.canvas) {
        state.ctx.fillStyle = '#000';
        state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    }

    console.log('New project started');
}

// Export for debugging
(window as any).autoCutDebug = { state };
