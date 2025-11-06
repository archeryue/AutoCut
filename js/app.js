/**
 * AutoCut v2.0 - WebAV-Powered Video Editor
 * Main Application
 */

import { MP4Clip, OffscreenSprite, Combinator } from 'https://cdn.jsdelivr.net/npm/@webav/av-cliper@1.1.6/+esm';

// ==================== Global State ====================

const state = {
    // Materials (uploaded videos)
    materials: [], // { id, name, file, clip, metadata }

    // Timeline sprites (clips on timeline)
    sprites: [], // { id, materialId, clip, sprite, startTime, duration, filters, playbackRate, opacity }

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
};

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== AutoCut v2.0 Initializing ===');
    console.log('WebCodecs support:', {
        VideoEncoder: !!window.VideoEncoder,
        VideoDecoder: !!window.VideoDecoder,
        AudioEncoder: !!window.AudioEncoder,
        AudioDecoder: !!window.AudioDecoder
    });

    // Check WebCodecs support
    if (!window.VideoEncoder || !window.VideoDecoder) {
        console.error('WebCodecs not supported!');
        alert('WebCodecs API is not supported in your browser. Please use Chrome 94+ or Edge 94+.');
        return;
    }

    console.log('Initializing canvas...');
    initializeCanvas();

    console.log('Setting up event listeners...');
    setupEventListeners();

    console.log('=== AutoCut initialized successfully ===');
    console.log('Debug: window.autoCutDebug available for inspection');
});

// ==================== Canvas Setup ====================

function initializeCanvas() {
    state.canvas = document.getElementById('previewCanvas');
    state.ctx = state.canvas.getContext('2d');

    // Set default canvas size
    state.canvas.width = 1920;
    state.canvas.height = 1080;
}

// ==================== Event Listeners ====================

function setupEventListeners() {
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
    document.getElementById('exportBtn').addEventListener('click', exportVideo);

    // New project
    document.getElementById('newProjectBtn').addEventListener('click', newProject);
}

// ==================== Tab System ====================

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

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

function setupFileUpload() {
    const videoUpload = document.getElementById('videoUpload');
    const dropZone = document.getElementById('dropZone');

    console.log('Setting up file upload handlers...');
    console.log('videoUpload element:', videoUpload);
    console.log('dropZone element:', dropZone);

    // File input change
    videoUpload.addEventListener('change', handleFileSelect);
    console.log('File input change listener added');

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

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

async function handleFileSelect(e) {
    console.log('handleFileSelect triggered!', e);
    const files = Array.from(e.target.files);
    console.log('Files selected:', files.length, files);

    for (const file of files) {
        await loadVideoFile(file);
    }
}

async function handleDrop(e) {
    console.log('handleDrop triggered!', e);
    const dt = e.dataTransfer;
    const files = Array.from(dt.files).filter(f => f.type.startsWith('video/'));
    console.log('Files dropped:', files.length, files);

    for (const file of files) {
        await loadVideoFile(file);
    }
}

async function loadVideoFile(file) {
    console.log('loadVideoFile called with:', file);
    showLoading(true, 'Loading video...');

    try {
        console.log('Loading video:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Create blob URL and fetch it (WebAV preferred method)
        console.log('Creating blob URL...');
        const blobUrl = URL.createObjectURL(file);
        console.log('Blob URL:', blobUrl);

        console.log('Fetching video...');
        const response = await fetch(blobUrl);
        console.log('Fetch response:', response);

        // Create MP4Clip from fetch response
        console.log('Creating MP4Clip from fetch response...');
        const clip = new MP4Clip(response);
        console.log('MP4Clip created, waiting for ready...');
        await clip.ready;
        console.log('MP4Clip ready!');

        // Clean up blob URL after loading
        URL.revokeObjectURL(blobUrl);

        // Get metadata
        const meta = clip.meta;
        console.log('Video metadata:', meta);

        // Create material object
        const material = {
            id: generateId(),
            name: file.name,
            file: file,
            clip: clip,
            metadata: {
                duration: meta.duration, // microseconds
                width: meta.width,
                height: meta.height,
                size: file.size
            }
        };

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
        alert('Failed to load video: ' + error.message);
    }
}

function addMaterialToUI(material) {
    const materialList = document.getElementById('materialList');

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

async function addMaterialToTimeline(material) {
    try {
        // Calculate start position (end of last sprite)
        let startPosition = 0;
        if (state.sprites.length > 0) {
            const lastSprite = state.sprites[state.sprites.length - 1];
            startPosition = lastSprite.startTime + lastSprite.duration;
        }

        // Create sprite
        const sprite = new OffscreenSprite(material.clip);

        // Configure sprite
        const duration = material.metadata.duration;
        sprite.time = {
            offset: startPosition,
            duration: duration
        };

        // Default properties
        sprite.rect = {
            x: 0,
            y: 0,
            w: material.metadata.width,
            h: material.metadata.height
        };
        sprite.opacity = 1.0;

        // Create sprite state object
        const spriteState = {
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
            document.getElementById('canvasPlaceholder').classList.remove('active');
            await renderFrame(0);
        }

        console.log('Added sprite to timeline:', spriteState);

    } catch (error) {
        console.error('Error adding to timeline:', error);
        alert('Failed to add video to timeline: ' + error.message);
    }
}

// ==================== Timeline Rendering ====================

function renderTimeline() {
    const clipsContainer = document.getElementById('clipsContainer');
    const timeMarkers = document.getElementById('timeMarkers');

    // Clear existing
    clipsContainer.innerHTML = '';
    timeMarkers.innerHTML = '';

    if (state.sprites.length === 0) return;

    // Calculate total duration
    const totalDuration = getTotalDuration();
    const totalDurationSec = totalDuration / 1000000;

    // Update duration display
    document.getElementById('totalDuration').textContent = formatTime(totalDurationSec);

    // Render time markers
    renderTimeMarkers(totalDurationSec);

    // Render clips
    state.sprites.forEach(spriteState => {
        const clipEl = createClipElement(spriteState, totalDuration);
        clipsContainer.appendChild(clipEl);
    });

    // Update playhead
    updatePlayhead();
}

function renderTimeMarkers(totalDurationSec) {
    const timeMarkers = document.getElementById('timeMarkers');
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

function createClipElement(spriteState, totalDuration) {
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

function selectSprite(spriteId) {
    state.selectedSpriteId = spriteId;
    renderTimeline();

    // Update filter UI for selected sprite
    updateFilterUI();

    console.log('Selected sprite:', spriteId);
}

// ==================== Playback Controls ====================

function setupPlaybackControls() {
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('volumeSlider').addEventListener('input', handleVolumeChange);
}

function togglePlayPause() {
    if (state.isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    if (state.sprites.length === 0) return;

    state.isPlaying = true;
    state.lastFrameTime = performance.now();

    document.querySelector('#playPauseBtn .icon').textContent = '⏸';

    playbackLoop();
}

function pause() {
    state.isPlaying = false;

    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    document.querySelector('#playPauseBtn .icon').textContent = '▶';
}

function stop() {
    pause();
    state.currentTime = 0;
    updatePlayhead();
    renderFrame(0);
    document.getElementById('currentTime').textContent = '00:00';
}

function playbackLoop() {
    if (!state.isPlaying) return;

    const now = performance.now();
    const deltaMs = now - state.lastFrameTime;
    state.lastFrameTime = now;

    // Advance time (microseconds)
    state.currentTime += deltaMs * 1000;

    // Check if reached end
    const totalDuration = getTotalDuration();
    if (state.currentTime >= totalDuration) {
        state.currentTime = totalDuration;
        pause();
        return;
    }

    // Render frame
    renderFrame(state.currentTime);

    // Update UI
    updatePlayhead();
    const currentSec = state.currentTime / 1000000;
    document.getElementById('currentTime').textContent = formatTime(currentSec);

    // Continue loop
    state.animationFrameId = requestAnimationFrame(playbackLoop);
}

function handleVolumeChange(e) {
    const volume = parseInt(e.target.value) / 100;
    // Note: Volume control would need to be implemented in WebAV audio handling
    console.log('Volume:', volume);
}

// ==================== Frame Rendering ====================

async function renderFrame(time) {
    // Find active sprite at current time
    const activeSprite = state.sprites.find(s =>
        time >= s.startTime && time < (s.startTime + s.duration)
    );

    if (!activeSprite) {
        // Clear canvas
        state.ctx.fillStyle = '#000';
        state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        return;
    }

    try {
        // Calculate time within sprite
        const spriteTime = time - activeSprite.startTime;

        // Get frame from sprite
        const result = await activeSprite.sprite.offscreenRender(spriteTime);

        if (result.video) {
            // Clear canvas
            state.ctx.fillStyle = '#000';
            state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

            // Apply opacity
            state.ctx.globalAlpha = activeSprite.opacity;

            // Draw video frame
            state.ctx.drawImage(result.video, 0, 0, state.canvas.width, state.canvas.height);

            // Apply filters
            applyFilters(activeSprite.filters);

            // Close frame
            result.video.close();

            state.ctx.globalAlpha = 1.0;
        }
    } catch (error) {
        console.error('Error rendering frame:', error);
    }
}

function applyFilters(filters) {
    if (!filters) return;

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

// ==================== Timeline Tools ====================

function setupTimelineTools() {
    document.getElementById('splitBtn').addEventListener('click', splitClip);
    document.getElementById('deleteBtn').addEventListener('click', deleteClip);
    document.getElementById('zoomInBtn').addEventListener('click', () => adjustZoom(1.5));
    document.getElementById('zoomOutBtn').addEventListener('click', () => adjustZoom(0.67));
}

function splitClip() {
    if (!state.selectedSpriteId) {
        alert('Please select a clip first');
        return;
    }

    const spriteIndex = state.sprites.findIndex(s => s.id === state.selectedSpriteId);
    if (spriteIndex === -1) return;

    const sprite = state.sprites[spriteIndex];

    // Check if current time is within sprite
    if (state.currentTime <= sprite.startTime || state.currentTime >= (sprite.startTime + sprite.duration)) {
        alert('Move playhead within the selected clip to split');
        return;
    }

    // Calculate split point
    const splitPoint = state.currentTime - sprite.startTime;

    // Create two new sprites
    const sprite1 = {
        ...sprite,
        id: generateId(),
        duration: splitPoint
    };
    sprite1.sprite.time.duration = splitPoint;

    const sprite2 = {
        ...sprite,
        id: generateId(),
        startTime: sprite.startTime + splitPoint,
        duration: sprite.duration - splitPoint
    };
    sprite2.sprite = new OffscreenSprite(sprite.clip);
    sprite2.sprite.time = {
        offset: sprite2.startTime,
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

function deleteClip() {
    if (!state.selectedSpriteId) {
        alert('Please select a clip first');
        return;
    }

    if (!confirm('Delete selected clip?')) return;

    const spriteIndex = state.sprites.findIndex(s => s.id === state.selectedSpriteId);
    if (spriteIndex === -1) return;

    const deletedSprite = state.sprites[spriteIndex];
    const deletedDuration = deletedSprite.duration;

    // Remove sprite
    state.sprites.splice(spriteIndex, 1);

    // Shift subsequent sprites
    for (let i = spriteIndex; i < state.sprites.length; i++) {
        state.sprites[i].startTime -= deletedDuration;
        state.sprites[i].sprite.time.offset = state.sprites[i].startTime;
    }

    state.selectedSpriteId = null;

    renderTimeline();

    // Show placeholder if no sprites
    if (state.sprites.length === 0) {
        document.getElementById('canvasPlaceholder').classList.add('active');
    }

    console.log('Deleted clip');
}

function adjustZoom(factor) {
    state.zoom *= factor;
    state.zoom = Math.max(10, Math.min(state.zoom, 200)); // Clamp between 10 and 200
    renderTimeline();
}

// ==================== Timeline Interaction ====================

function setupTimelineInteraction() {
    const trackContent = document.getElementById('videoTrackContent');

    trackContent.addEventListener('click', handleTimelineClick);
}

function handleTimelineClick(e) {
    if (e.target.classList.contains('clip')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;

    // Calculate time from position
    const timeSec = x / state.zoom;
    state.currentTime = timeSec * 1000000;

    // Clamp to valid range
    const totalDuration = getTotalDuration();
    state.currentTime = Math.max(0, Math.min(state.currentTime, totalDuration));

    // Update UI
    updatePlayhead();
    renderFrame(state.currentTime);
    document.getElementById('currentTime').textContent = formatTime(state.currentTime / 1000000);

    // Deselect sprite
    state.selectedSpriteId = null;
    renderTimeline();
}

function updatePlayhead() {
    const playhead = document.getElementById('playhead');
    const currentSec = state.currentTime / 1000000;
    playhead.style.left = (currentSec * state.zoom) + 'px';
}

// ==================== Filters ====================

function setupFilters() {
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            applyFilterToSelectedSprite(filter);
        });
    });

    // Speed control
    document.getElementById('speedSelect').addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        setSelectedSpriteSpeed(speed);
    });

    // Opacity control
    document.getElementById('opacitySlider').addEventListener('input', (e) => {
        const opacity = parseInt(e.target.value) / 100;
        setSelectedSpriteOpacity(opacity);
        document.getElementById('opacityValue').textContent = e.target.value + '%';
    });
}

function applyFilterToSelectedSprite(filterName) {
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

function setSelectedSpriteSpeed(speed) {
    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    sprite.playbackRate = speed;
    sprite.sprite.time.playbackRate = speed;

    console.log('Set playback rate:', speed);
}

function setSelectedSpriteOpacity(opacity) {
    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    sprite.opacity = opacity;
    sprite.sprite.opacity = opacity;

    // Re-render
    renderFrame(state.currentTime);
}

function updateFilterUI() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));

    if (!state.selectedSpriteId) return;

    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    if (!sprite) return;

    // Update filter buttons
    if (sprite.filters.grayscale) {
        document.querySelector('[data-filter="grayscale"]').classList.add('active');
    } else if (sprite.filters.sepia) {
        document.querySelector('[data-filter="sepia"]').classList.add('active');
    } else if (sprite.filters.brightness > 1) {
        document.querySelector('[data-filter="brightness"]').classList.add('active');
    } else if (sprite.filters.contrast > 1) {
        document.querySelector('[data-filter="contrast"]').classList.add('active');
    } else if (sprite.filters.blur > 0) {
        document.querySelector('[data-filter="blur"]').classList.add('active');
    } else {
        document.querySelector('[data-filter="none"]').classList.add('active');
    }

    // Update speed
    document.getElementById('speedSelect').value = sprite.playbackRate;

    // Update opacity
    document.getElementById('opacitySlider').value = sprite.opacity * 100;
    document.getElementById('opacityValue').textContent = Math.round(sprite.opacity * 100) + '%';
}

// ==================== Export ====================

async function exportVideo() {
    if (state.sprites.length === 0) {
        alert('No clips to export');
        return;
    }

    if (!confirm('Export video with current edits? This may take some time.')) {
        return;
    }

    const modal = document.getElementById('exportModal');
    modal.classList.remove('hidden');

    try {
        console.log('Starting export...');

        // Create combinator
        const firstSprite = state.sprites[0];
        const material = state.materials.find(m => m.id === firstSprite.materialId);

        const combinator = new Combinator({
            width: material.metadata.width,
            height: material.metadata.height
        });

        // Add all sprites
        for (const spriteState of state.sprites) {
            await combinator.addSprite(spriteState.sprite);
        }

        // Get output stream
        console.log('Generating output stream...');
        const stream = combinator.output();

        // Collect chunks
        const chunks = [];
        const reader = stream.getReader();

        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
                chunks.push(value);

                // Update progress (rough estimate)
                const progress = (chunks.length * 100) / 1000; // Rough estimate
                updateExportProgress(Math.min(progress, 99));
            }
        }

        // Create blob and download
        const blob = new Blob(chunks, { type: 'video/mp4' });
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
        alert('Export failed: ' + error.message);
    }
}

function updateExportProgress(percent) {
    document.getElementById('exportProgressBar').style.width = percent + '%';
    document.getElementById('exportProgressText').textContent = Math.round(percent) + '%';
}

// ==================== Utility Functions ====================

function getTotalDuration() {
    if (state.sprites.length === 0) return 0;

    const lastSprite = state.sprites[state.sprites.length - 1];
    return lastSprite.startTime + lastSprite.duration;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(microseconds) {
    return formatTime(microseconds / 1000000);
}

function showLoading(show, text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (show) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function newProject() {
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
    document.getElementById('materialList').innerHTML = '';
    document.getElementById('clipsContainer').innerHTML = '';
    document.getElementById('canvasPlaceholder').classList.add('active');

    // Clear canvas
    state.ctx.fillStyle = '#000';
    state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

    console.log('New project started');
}

// Export for debugging
window.autoCutDebug = { state };
