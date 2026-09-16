(function () {
  const listingId = document.body.dataset.listingId;
  const returnUrl = document.body.dataset.returnUrl;
  const MAX_RECORD_SECONDS = 20;
  const MIN_RECORD_SECONDS = 2;

  const CONDITION_LABELS = {
    'like-new': 'Like New',
    'good': 'Good',
    'fair': 'Fair',
    'parts': 'For Parts / Not Working',
  };
  const STATUS_LABELS = {
    verified: 'Verified',
    needs_review: 'Needs review',
    mismatch: 'Mismatch found',
  };

  const el = (id) => document.getElementById(id);
  const cameraFrame = el('camera-frame');
  const cameraPlaceholder = el('camera-placeholder');
  const liveVideo = el('live-video');
  const playbackVideo = el('playback-video');
  const recPill = el('rec-pill');
  const recTimer = el('rec-timer');
  const cameraError = el('camera-error');
  const recorderControls = el('recorder-controls');
  const startBtn = el('start-btn');
  const recordPanel = el('record-panel');
  const analyzingPanel = el('analyzing-panel');
  const analyzingLabel = el('analyzing-label');
  const resultsPanel = el('results-panel');

  const rec = {
    stream: null,
    recorder: null,
    chunks: [],
    mimeType: '',
    blob: null,
    blobUrl: null,
    timerInterval: null,
    autoStopTimeout: null,
    startedAt: 0,
  };

  function showCameraError(message) {
    cameraError.textContent = message;
    cameraError.classList.add('show');
  }

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
  }

  function extensionFor(mimeType) {
    return mimeType.includes('mp4') ? '.mp4' : '.webm';
  }

  async function initCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraPlaceholder.textContent = "This browser doesn't support camera recording.";
      showCameraError('Try a recent version of Chrome, Safari, Edge, or Firefox.');
      return;
    }
    try {
      rec.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      liveVideo.srcObject = rec.stream;
      liveVideo.hidden = false;
      cameraPlaceholder.hidden = true;
      startBtn.disabled = false;
    } catch (err) {
      cameraPlaceholder.textContent = 'Camera access unavailable.';
      showCameraError(
        err && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings and reload this page.'
          : 'Could not access a camera on this device: ' + (err && err.message ? err.message : err)
      );
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function startRecording() {
    if (!rec.stream) return;
    rec.mimeType = pickMimeType();
    rec.chunks = [];
    try {
      rec.recorder = rec.mimeType
        ? new MediaRecorder(rec.stream, { mimeType: rec.mimeType })
        : new MediaRecorder(rec.stream);
    } catch (err) {
      showCameraError('Recording is not supported in this browser: ' + err.message);
      return;
    }

    rec.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) rec.chunks.push(e.data);
    };
    rec.recorder.onstop = onRecordingStopped;

    rec.recorder.start();
    rec.startedAt = Date.now();
    recPill.hidden = false;
    recTimer.textContent = formatTime(0);
    rec.timerInterval = setInterval(() => {
      const elapsed = (Date.now() - rec.startedAt) / 1000;
      recTimer.textContent = formatTime(elapsed);
    }, 250);
    rec.autoStopTimeout = setTimeout(stopRecording, MAX_RECORD_SECONDS * 1000);

    recorderControls.innerHTML = '';
    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'btn btn-danger';
    stopBtn.textContent = 'Stop recording';
    stopBtn.addEventListener('click', stopRecording);
    recorderControls.appendChild(stopBtn);
  }

  function stopRecording() {
    if (rec.recorder && rec.recorder.state !== 'inactive') rec.recorder.stop();
    clearInterval(rec.timerInterval);
    clearTimeout(rec.autoStopTimeout);
    recPill.hidden = true;
  }

  function onRecordingStopped() {
    const elapsedSeconds = (Date.now() - rec.startedAt) / 1000;
    const type = rec.mimeType ? rec.mimeType.split(';')[0] : 'video/webm';
    rec.blob = new Blob(rec.chunks, { type });

    if (rec.blobUrl) URL.revokeObjectURL(rec.blobUrl);
    rec.blobUrl = URL.createObjectURL(rec.blob);

    liveVideo.hidden = true;
    playbackVideo.src = rec.blobUrl;
    playbackVideo.hidden = false;

    if (elapsedSeconds < MIN_RECORD_SECONDS) {
      showCameraError('That scan was very short — a couple more seconds gives a better result. You can still submit it, or re-record.');
    } else {
      cameraError.classList.remove('show');
    }

    renderReviewControls();
  }

  function renderReviewControls() {
    recorderControls.innerHTML = '';

    const rerecordBtn = document.createElement('button');
    rerecordBtn.type = 'button';
    rerecordBtn.className = 'btn btn-ghost';
    rerecordBtn.textContent = 'Re-record';
    rerecordBtn.addEventListener('click', resetToLiveCamera);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Submit for verification';
    submitBtn.addEventListener('click', submitScan);

    recorderControls.appendChild(rerecordBtn);
    recorderControls.appendChild(submitBtn);
  }

  function resetToLiveCamera() {
    playbackVideo.hidden = true;
    playbackVideo.removeAttribute('src');
    liveVideo.hidden = false;
    cameraError.classList.remove('show');
    recorderControls.innerHTML = '';
    recorderControls.appendChild(startBtn);
  }

  async function submitScan() {
    if (!rec.blob) return;

    recordPanel.hidden = true;
    resultsPanel.hidden = true;
    analyzingLabel.textContent = 'Uploading your scan…';
    analyzingPanel.hidden = false;

    const formData = new FormData();
    formData.append('video', rec.blob, 'scan' + extensionFor(rec.mimeType || 'video/webm'));

    let response, data;
    const labelSwap = setTimeout(() => {
      analyzingLabel.textContent = 'Analyzing frames — this can take a few seconds…';
    }, 900);

    try {
      response = await fetch('/api/verify/' + encodeURIComponent(listingId), {
        method: 'POST',
        body: formData,
      });
      data = await response.json().catch(() => ({}));
    } catch (err) {
      clearTimeout(labelSwap);
      analyzingPanel.hidden = true;
      recordPanel.hidden = false;
      showCameraError('Upload failed: ' + err.message + '. Check your connection and try submitting again.');
      renderReviewControls();
      return;
    }
    clearTimeout(labelSwap);

    if (!response.ok) {
      analyzingPanel.hidden = true;
      recordPanel.hidden = false;
      showCameraError(data.error || ('Verification failed (' + response.status + '). Try again.'));
      renderReviewControls();
      return;
    }

    analyzingPanel.hidden = true;
    renderResults(data);
  }

  function renderResults(metadata) {
    resultsPanel.hidden = false;

    const statusEl = el('result-status');
    statusEl.dataset.status = metadata.status;
    el('result-status-text').textContent =
      (STATUS_LABELS[metadata.status] || metadata.status) + ' — ' + metadata.status_reason;

    const va = metadata.vision_analysis || {};
    el('det-name').textContent = va.product_name || '—';
    el('det-type').textContent = va.product_type || '—';
    el('det-condition').textContent = CONDITION_LABELS[va.condition] || va.condition || '—';
    el('det-confidence').textContent =
      typeof va.condition_confidence === 'number' ? Math.round(va.condition_confidence * 100) + '%' : '—';
    el('det-notes').textContent = va.condition_notes || '';

    const defects = va.detected_defects || [];
    const defectsWrap = el('defects-wrap');
    const defectsList = el('defects-list');
    defectsList.innerHTML = '';
    if (defects.length) {
      defects.forEach((d) => {
        const li = document.createElement('li');
        li.textContent = d;
        defectsList.appendChild(li);
      });
      defectsWrap.hidden = false;
    } else {
      defectsWrap.hidden = true;
    }

    const frameStrip = el('frame-strip');
    frameStrip.innerHTML = '';
    (metadata.frames_analyzed || []).forEach((f) => {
      const img = document.createElement('img');
      img.src = '/frames/' + encodeURIComponent(listingId) + '/' + encodeURIComponent(f.file);
      img.alt = 'Scanned frame at ' + f.timestamp_seconds + 's';
      frameStrip.appendChild(img);
    });

    el('mock-note').hidden = va.provider !== 'mock';

    const actions = el('result-actions');
    actions.innerHTML = '';

    const viewJsonBtn = document.createElement('a');
    viewJsonBtn.className = 'btn btn-ghost';
    viewJsonBtn.textContent = 'View raw verification JSON';
    viewJsonBtn.href = '/api/verification/' + encodeURIComponent(listingId);
    viewJsonBtn.target = '_blank';
    viewJsonBtn.rel = 'noopener';
    actions.appendChild(viewJsonBtn);

    if (metadata.status !== 'verified') {
      const retakeBtn = document.createElement('button');
      retakeBtn.type = 'button';
      retakeBtn.className = 'btn btn-primary';
      retakeBtn.textContent = 'Retake scan';
      retakeBtn.addEventListener('click', () => {
        resultsPanel.hidden = true;
        recordPanel.hidden = false;
        resetToLiveCamera();
      });
      actions.appendChild(retakeBtn);
    } else if (returnUrl) {
      const publishUrl = new URL(returnUrl);
      publishUrl.searchParams.set('verification', 'verified');
      publishUrl.searchParams.set('verified_listing', listingId);
      const publishBtn = document.createElement('a');
      publishBtn.className = 'btn btn-primary';
      publishBtn.textContent = 'Publish verified listing';
      publishBtn.href = publishUrl.href;
      actions.appendChild(publishBtn);
    }
  }

  startBtn.addEventListener('click', startRecording);
  initCamera();
})();
