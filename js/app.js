/**
 * AutoCut - Main Application
 */

// Global variables
let editor = null;
let currentVideo = null;
let isDragging = false;
let isResizing = false;
let dragStartX = 0;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEditor();
    setupEventListeners();
    setupDragAndDrop();
});

/**
 * Initialize video editor
 */
function initializeEditor() {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoCanvas = document.getElementById('videoCanvas');

    editor = new VideoEditor();
    editor.init(videoPlayer, videoCanvas);

    console.log('AutoCut Video Editor initialized');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // File upload
    document.getElementById('videoUpload').addEventListener('change', handleFileUpload);

    // Playback controls
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('stopBtn').addEventListener('click', stopPlayback);

    // Edit tools
    document.getElementById('splitBtn').addEventListener('click', splitCurrentClip);
    document.getElementById('deleteBtn').addEventListener('click', deleteSelectedClip);
    document.getElementById('trimBtn').addEventListener('click', enableTrimMode);

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            applyFilter(filter);
        });
    });

    // Speed control
    document.getElementById('speedSelect').addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        editor.setPlaybackRate(speed);
    });

    // Volume control
    document.getElementById('volumeSlider').addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        editor.setVolume(volume);
        document.getElementById('volumeValue').textContent = volume + '%';
    });

    // Opacity control
    document.getElementById('opacitySlider').addEventListener('input', (e) => {
        const opacity = parseInt(e.target.value) / 100;
        editor.setFilter('opacity', opacity);
        document.getElementById('opacityValue').textContent = e.target.value + '%';
    });

    // Timeline interaction
    document.getElementById('timelineTrack').addEventListener('click', handleTimelineClick);
    document.getElementById('timelineTrack').addEventListener('mousedown', handleTimelineMouseDown);
    document.addEventListener('mousemove', handleTimelineMouseMove);
    document.addEventListener('mouseup', handleTimelineMouseUp);

    // Video progress bar interaction
    const progressBar = document.querySelector('.video-progress-bar');
    progressBar.addEventListener('click', handleProgressBarClick);
    progressBar.addEventListener('mousedown', handleProgressBarMouseDown);

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportVideo);

    // New project
    document.getElementById('newProject').addEventListener('click', newProject);

    // Video time update
    document.getElementById('videoPlayer').addEventListener('timeupdate', updateTimeDisplay);
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, false);
}

/**
 * Handle file upload
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * Handle file (from upload or drag-drop)
 */
async function handleFile(file) {
    showLoading(true);

    try {
        const metadata = await editor.loadVideo(file);
        currentVideo = metadata;

        console.log('Video loaded, metadata:', metadata);

        // Hide drop zone, show canvas
        const dropZone = document.getElementById('dropZone');
        const canvas = document.getElementById('videoCanvas');
        const videoPlayer = document.getElementById('videoPlayer');

        dropZone.style.display = 'none';
        canvas.classList.add('active');

        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Canvas display:', window.getComputedStyle(canvas).display);

        // Update video info
        updateVideoInfo(metadata);

        // Render timeline
        renderTimeline();

        showLoading(false);
        console.log('Video setup complete');
    } catch (error) {
        showLoading(false);
        alert('Error loading video: ' + error.message);
        console.error('Error loading video:', error);
    }
}

/**
 * Update video information display
 */
function updateVideoInfo(metadata) {
    const videoInfo = document.getElementById('videoInfo');
    videoInfo.innerHTML = `
        <p><strong>Name:</strong> ${metadata.name}</p>
        <p><strong>Duration:</strong> ${formatTime(metadata.duration)}</p>
        <p><strong>Resolution:</strong> ${metadata.width}x${metadata.height}</p>
        <p><strong>Size:</strong> ${formatFileSize(metadata.size)}</p>
        <p><strong>Type:</strong> ${metadata.type}</p>
    `;
}

/**
 * Render timeline with clips
 */
function renderTimeline() {
    const clipsContainer = document.getElementById('clipsContainer');
    const timelineRuler = document.getElementById('timelineRuler');
    const totalDuration = editor.getTotalDuration();

    // Clear existing clips
    clipsContainer.innerHTML = '';
    timelineRuler.innerHTML = '';

    // Render clips
    editor.clips.forEach(clip => {
        const clipElement = createClipElement(clip, totalDuration);
        clipsContainer.appendChild(clipElement);
    });

    // Render time markers
    renderTimeMarkers(totalDuration);

    // Update duration display
    document.getElementById('duration').textContent = formatTime(totalDuration);
}

/**
 * Create clip element for timeline
 */
function createClipElement(clip, totalDuration) {
    const clipDiv = document.createElement('div');
    clipDiv.className = 'clip';
    clipDiv.dataset.clipId = clip.id;

    // Calculate position and width as percentage
    const leftPercent = (clip.startPosition / totalDuration) * 100;
    const widthPercent = (clip.duration / totalDuration) * 100;

    clipDiv.style.left = leftPercent + '%';
    clipDiv.style.width = widthPercent + '%';

    // Add clip label
    const label = document.createElement('span');
    label.textContent = `Clip ${clip.id} (${formatTime(clip.duration)})`;
    clipDiv.appendChild(label);

    // Add resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-resize-handle left';
    clipDiv.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-resize-handle right';
    clipDiv.appendChild(rightHandle);

    // Click to select
    clipDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        selectClip(clip);
    });

    // Check if this is the selected clip
    if (editor.selectedClip && editor.selectedClip.id === clip.id) {
        clipDiv.classList.add('selected');
    }

    return clipDiv;
}

/**
 * Render time markers on timeline ruler
 */
function renderTimeMarkers(duration) {
    const timelineRuler = document.getElementById('timelineRuler');
    const markerCount = 10;
    const interval = duration / markerCount;

    for (let i = 0; i <= markerCount; i++) {
        const time = i * interval;
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.style.left = (i / markerCount * 100) + '%';
        marker.textContent = formatTime(time);
        timelineRuler.appendChild(marker);
    }
}

/**
 * Select a clip
 */
function selectClip(clip) {
    editor.selectedClip = clip;
    renderTimeline();

    // Seek to clip start
    editor.seekTo(clip.startPosition);
}

/**
 * Handle timeline click
 */
function handleTimelineClick(e) {
    if (isDragging || isResizing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const position = percent * editor.getTotalDuration();

    editor.seekTo(position);
    updatePlayhead();
}

/**
 * Handle timeline mouse down
 */
function handleTimelineMouseDown(e) {
    const target = e.target;

    if (target.classList.contains('clip')) {
        isDragging = true;
        dragStartX = e.clientX;
    }
}

/**
 * Handle timeline mouse move
 */
function handleTimelineMouseMove(e) {
    if (!isDragging) return;

    // Clip dragging logic would go here
    // For simplicity, we'll skip complex drag-reorder implementation
}

/**
 * Handle timeline mouse up
 */
function handleTimelineMouseUp(e) {
    isDragging = false;
    isResizing = false;
}

/**
 * Update playhead position
 */
function updatePlayhead() {
    const playhead = document.getElementById('playhead');
    const totalDuration = editor.getTotalDuration();

    if (totalDuration > 0) {
        const percent = (editor.currentTime / totalDuration) * 100;
        playhead.style.left = percent + '%';
    }
}

/**
 * Update time display
 */
function updateTimeDisplay() {
    const currentTime = editor.video.currentTime;
    const duration = editor.video.duration;

    document.getElementById('currentTime').textContent = formatTime(currentTime);
    updatePlayhead();
    updateProgressBar(currentTime, duration);
}

/**
 * Update progress bar
 */
function updateProgressBar(currentTime, duration) {
    if (!duration || duration === 0) return;

    const percent = (currentTime / duration) * 100;
    const progressFilled = document.getElementById('videoProgressFilled');
    const progressHandle = document.getElementById('videoProgressHandle');

    if (progressFilled) {
        progressFilled.style.width = percent + '%';
    }
    if (progressHandle) {
        progressHandle.style.left = percent + '%';
    }
}

/**
 * Handle progress bar click
 */
function handleProgressBarClick(e) {
    if (!editor.video || !editor.video.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * editor.video.duration;

    editor.video.currentTime = newTime;
}

/**
 * Handle progress bar mouse down for dragging
 */
let isProgressBarDragging = false;

function handleProgressBarMouseDown(e) {
    if (!editor.video || !editor.video.duration) return;

    isProgressBarDragging = true;
    handleProgressBarClick(e);

    document.addEventListener('mousemove', onProgressBarDrag);
    document.addEventListener('mouseup', onProgressBarDragEnd);
}

function onProgressBarDrag(e) {
    if (!isProgressBarDragging) return;

    const progressBar = document.querySelector('.video-progress-bar');
    const rect = progressBar.getBoundingClientRect();
    let x = e.clientX - rect.left;

    // Clamp to bounds
    x = Math.max(0, Math.min(x, rect.width));

    const percent = x / rect.width;
    const newTime = percent * editor.video.duration;

    editor.video.currentTime = newTime;
}

function onProgressBarDragEnd() {
    isProgressBarDragging = false;
    document.removeEventListener('mousemove', onProgressBarDrag);
    document.removeEventListener('mouseup', onProgressBarDragEnd);
}

/**
 * Toggle play/pause
 */
function togglePlayPause() {
    if (!editor.video) return;

    editor.togglePlayPause();

    const btn = document.getElementById('playPauseBtn');
    btn.textContent = editor.isPlaying ? '⏸' : '▶';
}

/**
 * Stop playback
 */
function stopPlayback() {
    if (!editor.video) return;

    editor.stop();

    const btn = document.getElementById('playPauseBtn');
    btn.textContent = '▶';
}

/**
 * Split current clip at current time
 */
function splitCurrentClip() {
    if (!editor.selectedClip) {
        alert('Please select a clip first');
        return;
    }

    const currentTime = editor.video.currentTime;
    const result = editor.splitClip(editor.selectedClip.id, currentTime);

    if (result) {
        renderTimeline();
        console.log('Clip split successfully');
    } else {
        alert('Cannot split clip at this position');
    }
}

/**
 * Delete selected clip
 */
function deleteSelectedClip() {
    if (!editor.selectedClip) {
        alert('Please select a clip first');
        return;
    }

    const confirmed = confirm('Are you sure you want to delete this clip?');
    if (confirmed) {
        editor.deleteClip(editor.selectedClip.id);
        renderTimeline();
        console.log('Clip deleted');
    }
}

/**
 * Enable trim mode
 */
function enableTrimMode() {
    alert('Trim mode: Use the resize handles on the clip edges to trim. This is a simplified version.');
}

/**
 * Apply filter
 */
function applyFilter(filterName) {
    editor.resetFilters();

    switch (filterName) {
        case 'grayscale':
            editor.setFilter('grayscale', true);
            break;
        case 'sepia':
            editor.setFilter('sepia', true);
            break;
        case 'brightness':
            editor.setFilter('brightness', 1.5);
            break;
        case 'contrast':
            editor.setFilter('contrast', 1.5);
            break;
        case 'none':
        default:
            // Already reset
            break;
    }

    console.log('Filter applied:', filterName);
}

/**
 * Export video
 */
async function exportVideo() {
    if (!editor.video || !editor.canvas) {
        alert('Please load a video first');
        return;
    }

    const format = document.getElementById('formatSelect').value;
    const quality = document.getElementById('qualitySelect').value;

    const confirmed = confirm('Export video with current edits?\n\nThis will play through your video and record the canvas output.\n\nNote: This may take some time depending on video length.');

    if (!confirmed) return;

    showLoading(true);

    try {
        // Determine video mime type and quality settings
        let mimeType = 'video/webm;codecs=vp9';
        let videoBitsPerSecond = 2500000; // 2.5 Mbps

        if (format === 'mp4') {
            // Try MP4, fallback to webm if not supported
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                mimeType = 'video/webm;codecs=h264';
            }
        }

        // Adjust quality
        if (quality === 'high') {
            videoBitsPerSecond = 5000000; // 5 Mbps
        } else if (quality === 'low') {
            videoBitsPerSecond = 1000000; // 1 Mbps
        }

        console.log('Starting export with:', { mimeType, videoBitsPerSecond });

        // Get canvas stream
        const canvasStream = editor.canvas.captureStream(30); // 30 fps

        // Add audio from video if available
        if (editor.video.mozCaptureStream) {
            const audioStream = editor.video.mozCaptureStream();
            const audioTracks = audioStream.getAudioTracks();
            audioTracks.forEach(track => canvasStream.addTrack(track));
        } else if (editor.video.captureStream) {
            const audioStream = editor.video.captureStream();
            const audioTracks = audioStream.getAudioTracks();
            audioTracks.forEach(track => canvasStream.addTrack(track));
        }

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: mimeType,
            videoBitsPerSecond: videoBitsPerSecond
        });

        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);

            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `autocut-export-${Date.now()}.${format === 'mp4' ? 'mp4' : 'webm'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

            showLoading(false);
            alert('Video exported successfully!');
            console.log('Export complete');
        };

        // Start recording
        mediaRecorder.start();

        // Play through the video
        const originalTime = editor.video.currentTime;
        editor.video.currentTime = 0;

        await editor.video.play();

        // Stop recording when video ends
        editor.video.onended = () => {
            mediaRecorder.stop();
            editor.video.currentTime = originalTime;
            editor.video.onended = null;
        };

    } catch (error) {
        showLoading(false);
        alert('Error exporting video: ' + error.message);
        console.error('Export error:', error);
    }
}

/**
 * New project
 */
function newProject() {
    const confirmed = confirm('Start a new project? Current work will be lost.');
    if (confirmed) {
        location.reload();
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Make functions available globally for debugging
window.appDebug = {
    editor,
    togglePlayPause,
    splitCurrentClip,
    deleteSelectedClip,
    applyFilter,
    exportVideo
};
