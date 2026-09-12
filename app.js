(function () {
  'use strict';

  /* ============================================================
   * State
   * ========================================================== */
  var state = {
    nameAr: '',
    nameEn: '',
    deptAr: 'تقنية المعلومات',
    deptEn: 'Information Technology',
    empId: 'ID-784532',
    qrText: '',
    bleed: false,
    showSlot: true,
    photo: {
      dataUrl: null,
      naturalW: 0,
      naturalH: 0,
      offsetX: 0, // mm, translation from centered position
      offsetY: 0, // mm
      zoom: 1
    }
  };

  /* ============================================================
   * Element refs
   * ========================================================== */
  var el = {
    nameAr: document.getElementById('f-name-ar'),
    nameEn: document.getElementById('f-name-en'),
    deptAr: document.getElementById('f-dept-ar'),
    deptEn: document.getElementById('f-dept-en'),
    empId: document.getElementById('f-id'),
    qr: document.getElementById('f-qr'),
    bleed: document.getElementById('f-bleed'),
    slot: document.getElementById('f-slot'),

    photoDrop: document.getElementById('photo-drop'),
    photoFile: document.getElementById('f-photo'),
    photoControls: document.getElementById('photo-controls'),
    zoom: document.getElementById('f-zoom'),
    photoClear: document.getElementById('f-photo-clear'),

    exportRoot: document.getElementById('export-root'),
    card: document.getElementById('card'),
    lanyardSlot: document.getElementById('lanyard-slot'),
    photoFrame: document.getElementById('photo-frame'),
    photoImg: document.getElementById('photo-img'),
    photoPlaceholder: document.getElementById('photo-placeholder'),
    nameBlock: document.getElementById('name-block'),
    nameAr2: document.getElementById('name-ar'),
    nameEn2: document.getElementById('name-en'),
    deptAr2: document.getElementById('dept-ar'),
    deptEn2: document.getElementById('dept-en'),
    empId2: document.getElementById('emp-id'),
    qrCanvas: document.getElementById('qr-canvas'),

    btnPrint: document.getElementById('btn-print'),
    btnPdf: document.getElementById('btn-pdf'),
    btnPng: document.getElementById('btn-png'),
    status: document.getElementById('export-status')
  };

  /* ============================================================
   * QR code rendering — modules only. The center brand box and its
   * "HALA" label are real DOM/CSS (.qr-center / #qr-center-label) so
   * they stay crisp text at print resolution instead of canvas-drawn
   * pixels; this function just leaves a matching rectangular gap.
   * ========================================================== */
  function renderQr() {
    var text = (state.qrText || '').trim() || (state.empId || '').trim() || 'HALA';
    var canvas = el.qrCanvas;
    var ctx = canvas.getContext('2d');
    var size = canvas.width; // square, internal resolution
    ctx.clearRect(0, 0, size, size);

    var qr;
    try {
      qr = qrcode(0, 'H');
      qr.addData(text);
      qr.make();
    } catch (e) {
      // typeNumber 0 can fail to auto-size for very long strings; retry with a larger fixed type
      qr = qrcode(10, 'H');
      qr.addData(text);
      qr.make();
    }
    var count = qr.getModuleCount();
    var cell = size / count;
    var moduleColor = '#14302D'; // fixed per spec — never derived from brand color

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = moduleColor;

    // reserve a blank rectangle in the center for the brand mark:
    // 34% wide x 24% tall of the module field, centered — matches the
    // .qr-center overlay's left:33%/top:38%/width:34%/height:24%.
    var holeColSpan = Math.round(count * 0.34);
    var holeRowSpan = Math.round(count * 0.24);
    var holeColStart = Math.round((count - holeColSpan) / 2);
    var holeRowStart = Math.round((count - holeRowSpan) / 2);
    var holeColEnd = holeColStart + holeColSpan;
    var holeRowEnd = holeRowStart + holeRowSpan;

    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        var inHole = row >= holeRowStart && row < holeRowEnd && col >= holeColStart && col < holeColEnd;
        if (qr.isDark(row, col) && !inHole) {
          ctx.fillRect(Math.round(col * cell), Math.round(row * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
  }

  /* ============================================================
   * Render — push state into the DOM preview
   * ========================================================== */
  function render() {
    // name block — also switches the card between Layout A (no name)
    // and Layout B (name present); nothing above the photo moves.
    var nameAr = state.nameAr.trim();
    var nameEn = state.nameEn.trim();
    var hasName = !!(nameAr || nameEn);
    el.card.classList.toggle('layout-a', !hasName);
    el.card.classList.toggle('layout-b', hasName);
    if (hasName) {
      el.nameBlock.hidden = false;
      el.nameAr2.textContent = nameAr;
      el.nameAr2.hidden = !nameAr;
      el.nameEn2.textContent = nameEn;
      el.nameEn2.hidden = !nameEn;
    } else {
      el.nameBlock.hidden = true;
    }

    el.deptAr2.textContent = state.deptAr.trim();
    el.deptEn2.textContent = state.deptEn.trim();
    el.empId2.textContent = state.empId.trim();

    // bleed + crop marks
    el.exportRoot.classList.toggle('bleed-on', !!state.bleed);
    updatePageStyle();

    // lanyard slot guide
    el.lanyardSlot.classList.toggle('hidden-slot', !state.showSlot);

    // photo
    if (state.photo.dataUrl) {
      el.photoImg.src = state.photo.dataUrl;
      el.photoImg.hidden = false;
      el.photoPlaceholder.hidden = true;
      applyPhotoTransform();
    } else {
      el.photoImg.hidden = true;
      el.photoPlaceholder.hidden = false;
    }

    renderQr();
  }

  /* ============================================================
   * Dynamic @page rule (exact physical size, +bleed when enabled)
   * ========================================================== */
  var pageStyleEl = document.createElement('style');
  document.head.appendChild(pageStyleEl);
  function updatePageStyle() {
    var w = 53.98, h = 85.6;
    if (state.bleed) { w += 6; h += 6; }
    pageStyleEl.textContent = '@page { size: ' + w + 'mm ' + h + 'mm; margin: 0; }';
  }

  /* ============================================================
   * Photo: upload, drag-to-reposition, zoom
   * ========================================================== */
  function loadPhotoFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        state.photo.dataUrl = e.target.result;
        state.photo.naturalW = img.naturalWidth;
        state.photo.naturalH = img.naturalHeight;
        state.photo.offsetX = 0;
        state.photo.offsetY = 0;
        state.photo.zoom = 1;
        el.zoom.value = 1;
        el.photoControls.hidden = false;
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function applyPhotoTransform() {
    var p = state.photo;
    el.photoImg.style.transform =
      'translate(' + p.offsetX + 'mm, ' + p.offsetY + 'mm) scale(' + p.zoom + ')';
  }

  function setupPhotoDrag() {
    var dragging = false;
    var startX = 0, startY = 0;
    var startOffsetX = 0, startOffsetY = 0;
    var mmPerPx = 1;

    function pointerDown(clientX, clientY) {
      if (!state.photo.dataUrl) return;
      dragging = true;
      startX = clientX;
      startY = clientY;
      startOffsetX = state.photo.offsetX;
      startOffsetY = state.photo.offsetY;
      var rect = el.photoFrame.getBoundingClientRect();
      var frameMm = el.card.classList.contains('layout-b') ? 20 : 22.5;
      mmPerPx = frameMm / rect.width;
      el.photoFrame.classList.add('dragging');
    }
    function pointerMove(clientX, clientY) {
      if (!dragging) return;
      var dx = (clientX - startX) * mmPerPx;
      var dy = (clientY - startY) * mmPerPx;
      state.photo.offsetX = startOffsetX + dx;
      state.photo.offsetY = startOffsetY + dy;
      applyPhotoTransform();
    }
    function pointerUp() {
      dragging = false;
      el.photoFrame.classList.remove('dragging');
    }

    el.photoFrame.addEventListener('mousedown', function (e) {
      e.preventDefault();
      pointerDown(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', function (e) { pointerMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', pointerUp);

    el.photoFrame.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      pointerDown(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      pointerMove(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', pointerUp);
  }

  function setupPhotoDropZone() {
    ['dragenter', 'dragover'].forEach(function (evt) {
      el.photoDrop.addEventListener(evt, function (e) {
        e.preventDefault();
        el.photoDrop.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      el.photoDrop.addEventListener(evt, function (e) {
        e.preventDefault();
        el.photoDrop.classList.remove('dragover');
      });
    });
    el.photoDrop.addEventListener('drop', function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) loadPhotoFile(file);
    });
    // also allow dropping directly onto the live photo frame in the preview
    ['dragenter', 'dragover'].forEach(function (evt) {
      el.photoFrame.addEventListener(evt, function (e) { e.preventDefault(); });
    });
    el.photoFrame.addEventListener('drop', function (e) {
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) loadPhotoFile(file);
    });
  }

  /* ============================================================
   * Form wiring
   * ========================================================== */
  function bindForm() {
    el.nameAr.addEventListener('input', function () { state.nameAr = el.nameAr.value; render(); });
    el.nameEn.addEventListener('input', function () { state.nameEn = el.nameEn.value; render(); });
    el.deptAr.addEventListener('input', function () { state.deptAr = el.deptAr.value; render(); });
    el.deptEn.addEventListener('input', function () { state.deptEn = el.deptEn.value; render(); });
    el.empId.addEventListener('input', function () { state.empId = el.empId.value; render(); });
    el.qr.addEventListener('input', function () { state.qrText = el.qr.value; render(); });

    el.bleed.addEventListener('change', function () { state.bleed = el.bleed.checked; render(); });
    el.slot.addEventListener('change', function () { state.showSlot = el.slot.checked; render(); });

    el.photoFile.addEventListener('change', function () {
      var file = el.photoFile.files && el.photoFile.files[0];
      if (file) loadPhotoFile(file);
    });
    el.zoom.addEventListener('input', function () {
      state.photo.zoom = parseFloat(el.zoom.value);
      applyPhotoTransform();
    });
    el.photoClear.addEventListener('click', function () {
      state.photo = { dataUrl: null, naturalW: 0, naturalH: 0, offsetX: 0, offsetY: 0, zoom: 1 };
      el.photoFile.value = '';
      el.zoom.value = 1;
      el.photoControls.hidden = true;
      render();
    });
  }

  /* ============================================================
   * Export helpers
   * ========================================================== */
  function setStatus(msg, kind) {
    el.status.textContent = msg || '';
    el.status.classList.toggle('is-error', kind === 'error');
    el.status.classList.toggle('is-ok', kind === 'ok');
  }

  function safeFileBase() {
    var id = (state.empId || 'card').trim().replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '');
    return 'employee-card-' + (id || 'card');
  }

  function waitForFontsAndPaint() {
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    return fontsReady.then(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(resolve); });
      });
    });
  }

  function renderExportCanvas() {
    // the lanyard-slot guide (when the checkbox is on) marks where the
    // badge gets punched, so it belongs in the rasterized export too —
    // it is captured exactly as shown in the live preview.
    return waitForFontsAndPaint().then(function () {
      return html2canvas(el.exportRoot, {
        backgroundColor: '#ffffff',
        scale: 8, // >300dpi at card size
        useCORS: true,
        logging: false
      });
    });
  }

  function pageSizeMm() {
    var w = 53.98, h = 85.6;
    if (state.bleed) { w += 6; h += 6; }
    return { w: w, h: h };
  }

  function doPrint() {
    setStatus('جاري التحضير للطباعة…');
    waitForFontsAndPaint().then(function () {
      updatePageStyle();
      setStatus('');
      window.print();
    });
  }

  function doDownloadPdf() {
    setStatus('جارٍ إنشاء ملف PDF…');
    el.btnPdf.disabled = true;
    renderExportCanvas().then(function (canvas) {
      var size = pageSizeMm();
      var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
      var pdf = new jsPDFCtor({
        orientation: 'portrait',
        unit: 'mm',
        format: [size.w, size.h],
        compress: true
      });
      var imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, size.w, size.h, undefined, 'FAST');
      pdf.save(safeFileBase() + '.pdf');
      setStatus('تم تنزيل ملف PDF بنجاح.', 'ok');
    }).catch(function (err) {
      console.error(err);
      setStatus('تعذّر إنشاء ملف PDF.', 'error');
    }).finally(function () {
      el.btnPdf.disabled = false;
    });
  }

  function doDownloadPng() {
    setStatus('جارٍ إنشاء صورة PNG…');
    el.btnPng.disabled = true;
    renderExportCanvas().then(function (canvas) {
      canvas.toBlob(function (blob) {
        if (!blob) { setStatus('تعذّر إنشاء صورة PNG.', 'error'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = safeFileBase() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        setStatus('تم تنزيل صورة PNG بنجاح.', 'ok');
      }, 'image/png');
    }).catch(function (err) {
      console.error(err);
      setStatus('تعذّر إنشاء صورة PNG.', 'error');
    }).finally(function () {
      el.btnPng.disabled = false;
    });
  }

  /* ============================================================
   * Init
   * ========================================================== */
  function init() {
    bindForm();
    setupPhotoDrag();
    setupPhotoDropZone();

    el.btnPrint.addEventListener('click', doPrint);
    el.btnPdf.addEventListener('click', doDownloadPdf);
    el.btnPng.addEventListener('click', doDownloadPng);

    window.addEventListener('beforeprint', function () {
      updatePageStyle();
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
