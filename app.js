(function () {
  'use strict';

  /* ============================================================
   * Color helpers — derive the mint band / paper / watermark tints
   * from a single user-picked brand color, matching the ratios of
   * the HALA reference palette.
   * ========================================================== */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    function toHex(v) {
      var x = Math.round(v * 255).toString(16);
      return x.length === 1 ? '0' + x : x;
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  function derivePalette(baseHex) {
    var rgb = hexToRgb(baseHex);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    var h = hsl.h, s = hsl.s, l = hsl.l;
    var mid = hslToHex(h, s * 0.72, l + 26);
    var mint = hslToHex(h, s * 0.81, l + 44.5);
    var paper = hslToHex(h, s * 0.56, Math.min(l + 66.5, 97));
    var watermark = hslToHex(h, s * 0.60, Math.min(l + 56.5, 92));
    return { deep: baseHex, mid: mid, mint: mint, paper: paper, watermark: watermark };
  }
  function applyPalette(hex) {
    var p = derivePalette(hex);
    var root = document.documentElement.style;
    root.setProperty('--brand-deep', p.deep);
    root.setProperty('--brand-mid', p.mid);
    root.setProperty('--brand-mint', p.mint);
    root.setProperty('--brand-paper', p.paper);
    root.setProperty('--brand-watermark', p.watermark);
  }

  /* ============================================================
   * State
   * ========================================================== */
  var state = {
    brand: 'HALA',
    color: '#2E6B63',
    logoDataUrl: null,
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
    brand: document.getElementById('f-brand'),
    logo: document.getElementById('f-logo'),
    logoClear: document.getElementById('f-logo-clear'),
    color: document.getElementById('f-color'),
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
    bandWatermark: document.getElementById('band-watermark'),
    lanyardSlot: document.getElementById('lanyard-slot'),
    logoImg: document.getElementById('logo-img'),
    wordmarkText: document.getElementById('wordmark-text'),
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
   * localStorage — brand identity only (no employee/personal data)
   * ========================================================== */
  var STORAGE_KEY = 'badge-creator:brand-settings-v1';
  function saveBrandSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        brand: state.brand,
        color: state.color,
        logoDataUrl: state.logoDataUrl
      }));
    } catch (e) { /* private browsing / storage disabled — ignore */ }
  }
  function loadBrandSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.brand) { state.brand = saved.brand; el.brand.value = saved.brand; }
      if (saved.color) { state.color = saved.color; el.color.value = saved.color; }
      if (saved.logoDataUrl) {
        state.logoDataUrl = saved.logoDataUrl;
        el.logoClear.hidden = false;
      }
    } catch (e) { /* corrupt data — ignore */ }
  }

  /* ============================================================
   * Watermark band text
   * ========================================================== */
  function updateBandWatermark() {
    var word = (state.brand || 'HALA').trim() || 'HALA';
    var unit = word + '          ';
    el.bandWatermark.textContent = unit.repeat(8);
  }

  /* ============================================================
   * QR code rendering
   * ========================================================== */
  function renderQr() {
    var text = (state.qrText || '').trim() || (state.empId || '').trim() || (state.brand || 'HALA');
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
    var deep = getComputedStyle(document.documentElement).getPropertyValue('--brand-deep').trim() || '#2E6B63';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = deep;

    // reserve a blank square in the center for the brand mark
    var holeSpan = Math.floor(count * 0.30);
    var holeStart = Math.floor((count - holeSpan) / 2);
    var holeEnd = holeStart + holeSpan;

    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        var inHole = row >= holeStart && row < holeEnd && col >= holeStart && col < holeEnd;
        if (qr.isDark(row, col) && !inHole) {
          ctx.fillRect(Math.round(col * cell), Math.round(row * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }

    // white rounded box + brand initials in the center
    var boxSize = holeSpan * cell;
    var boxX = holeStart * cell;
    var boxY = holeStart * cell;
    var radius = boxSize * 0.16;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, boxX, boxY, boxSize, boxSize, radius);
    ctx.fill();

    ctx.fillStyle = deep;
    var label = (state.brand || 'HALA').trim().slice(0, 6) || 'HALA';
    var fontSize = Math.max(10, Math.round(boxSize * 0.34));
    ctx.font = '700 ' + fontSize + 'px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + boxSize / 2, boxY + boxSize / 2 + fontSize * 0.04);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ============================================================
   * Render — push state into the DOM preview
   * ========================================================== */
  function render() {
    applyPalette(state.color);
    updateBandWatermark();

    // wordmark / logo
    if (state.logoDataUrl) {
      el.logoImg.src = state.logoDataUrl;
      el.logoImg.hidden = false;
      el.wordmarkText.hidden = true;
    } else {
      el.logoImg.hidden = true;
      el.logoImg.removeAttribute('src');
      el.wordmarkText.hidden = false;
      el.wordmarkText.textContent = (state.brand || 'HALA').trim() || 'HALA';
    }

    // name block
    var nameAr = state.nameAr.trim();
    var nameEn = state.nameEn.trim();
    if (nameAr || nameEn) {
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
      mmPerPx = 22 / rect.width; // frame is 22mm wide
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
    el.brand.addEventListener('input', function () {
      state.brand = el.brand.value;
      render();
      saveBrandSettings();
    });
    el.color.addEventListener('input', function () {
      state.color = el.color.value;
      render();
      saveBrandSettings();
    });
    el.logo.addEventListener('change', function () {
      var file = el.logo.files && el.logo.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        state.logoDataUrl = e.target.result;
        el.logoClear.hidden = false;
        render();
        saveBrandSettings();
      };
      reader.readAsDataURL(file);
    });
    el.logoClear.addEventListener('click', function () {
      state.logoDataUrl = null;
      el.logo.value = '';
      el.logoClear.hidden = true;
      render();
      saveBrandSettings();
    });

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
    loadBrandSettings();
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
