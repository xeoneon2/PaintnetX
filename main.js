const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const pickerCursor = document.getElementById('pickerCursor');
const currentColorCircle = document.getElementById('currentColorCircle');
const currentFillColorCircle = document.getElementById('currentFillColorCircle');
const colorPaletteModal = document.getElementById('colorPaletteModal');
const extendedColorPicker = document.getElementById('extendedColorPicker');
const colorWheel = document.getElementById('colorWheel');
const colorWheelCtx = colorWheel.getContext('2d');
const selectedColorDisplay = document.getElementById('selectedColorDisplay');
const brushPanel = document.getElementById('brushPanel');
const eraserPanel = document.getElementById('eraserPanel');
const fillPanel = document.getElementById('fillPanel');
const shapePanel = document.getElementById('shapePanel');
const saturationSlider = document.getElementById('saturationSlider');
const brightnessSlider = document.getElementById('brightnessSlider');
const fillTolerance = document.getElementById('fillTolerance');
const toleranceDisplay = document.getElementById('toleranceDisplay');
const contiguousFill = document.getElementById('contiguousFill');
const selectionOverlay = document.getElementById('selectionOverlay');
const moveHandle = document.getElementById('moveHandle');
const movingPreview = document.getElementById('movingPreview');
const confirmPasteBtn = document.getElementById('confirmPasteBtn');
const shapePreviewCanvas = document.getElementById('shapePreviewCanvas');
const shapePreviewCtx = shapePreviewCanvas.getContext('2d');
const dotIntervalSetting = document.getElementById('dotIntervalSetting');
const resizeHandles = {
  nw: document.getElementById('resizeHandleNW'),
  ne: document.getElementById('resizeHandleNE'),
  sw: document.getElementById('resizeHandleSW'),
  se: document.getElementById('resizeHandleSE'),
  n: document.getElementById('resizeHandleN'),
  s: document.getElementById('resizeHandleS'),
  e: document.getElementById('resizeHandleE'),
  w: document.getElementById('resizeHandleW')
};
// Optimized variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'brush';
let previousTool = 'brush';
let strokeColor = '#000000';
let fillColor = '#ffffff';
let brushSize = 10;
let eraserSize = 10;
let brushType = 'solid';
let tempSelectedColor = '#000000';
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let isPickerActive = false;
let pickerX = 0;
let pickerY = 0;
let currentSaturation = 100;
let currentBrightness = 50;
let dotInterval = 10;
let lastDotX = 0;
let lastDotY = 0;
let fillToleranceValue = 1;
let isContiguousFill = true;
let isDrawingShape = false;
let shapeStart = { x: 0, y: 0 };
let shapeEnd = { x: 0, y: 0 };
let shapeType = 'rectangle';
let shapeBorderStyle = 'solid';
let shapeBorderWidth = 2;
let shapeFill = true;
let brushOpacity = 1.0;
let brushBlur = 0;
let canvasRect = { left: 0, top: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
const toolSettings = {
  brush: { color: '#000000', size: 10, type: 'solid', dotInterval: 10, opacity: 1.0, blur: 0 },
  eraser: { size: 10 },
  spray: { color: '#000000', size: 15 },
  fill: { color: '#000000', tolerance: 1, contiguous: true },
  shape: { strokeColor: '#000000', fillColor: '#ffffff', type: 'rectangle', borderStyle: 'solid', borderWidth: 2, fill: true }
  // scissors удален
};
const standardColors = [
  '#FFFFFF', '#FF0000', '#FFA500', '#FFFF00', '#008000', '#00FFFF', '#0000FF', '#800080',
  '#000000', '#808080', '#93E9BE', '#F5F5DC', '#E6E6FA', '#FFFACD', '#FFE4E1', '#F0FFF0'
];
// --- Переменные для перьевой кисти ---
let featherPenPoints = [];
let lastMoveTime = 0;
let lastMoveTimestamp = 0;
let lastPressure = 0;
// --- Новые переменные для рисования линий ---
let currentPathPoints = [];
let pathNeedsRedraw = false;
let animationFrameId = null;
let offscreenPathCanvas = document.createElement('canvas');
let offscreenPathCtx = offscreenPathCanvas.getContext('2d');
// --- ФУНКЦИИ ---
// Setup canvas dimensions
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.querySelector('.toolbar').offsetHeight;
  updateCanvasRect();
  shapePreviewCanvas.width = canvas.width;
  shapePreviewCanvas.height = canvas.height;
  updateOffscreenCanvasSize();
}
// Update canvas coordinates for proper synchronization
function updateCanvasRect() {
  const rect = canvas.getBoundingClientRect();
  canvasRect = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scaleX: canvas.width / rect.width,
    scaleY: canvas.height / rect.height
  };
  shapePreviewCanvas.style.left = rect.left + 'px';
  shapePreviewCanvas.style.top = rect.top + 'px';
  shapePreviewCanvas.style.width = rect.width + 'px';
  shapePreviewCanvas.style.height = rect.height + 'px';
}
// Обновление размера offscreen canvas
function updateOffscreenCanvasSize() {
  offscreenPathCanvas.width = canvas.width;
  offscreenPathCanvas.height = canvas.height;
}
// Create color palette
function createColorPalette() {
  const colorGrid = document.getElementById('colorGrid');
  colorGrid.innerHTML = '';
  standardColors.forEach(color => {
    const colorOption = document.createElement('div');
    colorOption.className = 'color-option';
    colorOption.style.backgroundColor = color;
    colorOption.addEventListener('click', () => {
      selectColor(color);
      colorPaletteModal.style.display = 'none';
    });
    colorGrid.appendChild(colorOption);
  });
  const customOption = document.createElement('div');
  customOption.className = 'color-option custom-color-option';
  customOption.innerHTML = '🎨';
  customOption.addEventListener('click', () => {
    colorPaletteModal.style.display = 'none';
    showExtendedColorPicker();
  });
  colorGrid.appendChild(customOption);
}
// Draw color wheel
function drawColorWheel() {
  const centerX = colorWheel.width / 2;
  const centerY = colorWheel.height / 2;
  const radius = Math.min(centerX, centerY) - 10;
  colorWheelCtx.clearRect(0, 0, colorWheel.width, colorWheel.height);
  for (let angle = 0; angle < 360; angle += 1) {
    const rad = (angle * Math.PI) / 180;
    for (let r = 0; r <= radius; r += 1) {
      const x = centerX + Math.cos(rad) * r;
      const y = centerY + Math.sin(rad) * r;
      const hue = angle;
      const saturation = (r / radius) * currentSaturation;
      const lightness = currentBrightness;
      const rgb = hslToRgb(hue, saturation, lightness);
      colorWheelCtx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      colorWheelCtx.fillRect(x, y, 2, 2);
    }
  }
}
// Convert HSL to RGB
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
// Select color from color wheel
function selectColorFromWheel(x, y) {
  try {
    const pixel = colorWheelCtx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    tempSelectedColor = hex;
    selectedColorDisplay.style.backgroundColor = hex;
  } catch (e) {
    console.log('Failed to get color from wheel');
  }
}
// Select color function
function selectColor(color) {
  if (document.getElementById('paletteTitle').textContent === 'Выберите цвет заливки') {
    fillColor = color;
    currentFillColorCircle.style.backgroundColor = color;
    if (toolSettings.shape) {
      toolSettings.shape.fillColor = color;
    }
  } else {
    strokeColor = color;
    currentColorCircle.style.backgroundColor = color;
    if (toolSettings[currentTool]) {
      toolSettings[currentTool].color = color;
    }
  }
}
// Update picker cursor position
function updatePickerCursor(x, y) {
  pickerX = x;
  pickerY = y;
  const viewportX = x / canvasRect.scaleX + canvasRect.left;
  const viewportY = y / canvasRect.scaleY + canvasRect.top;
  pickerCursor.style.left = viewportX + 'px';
  pickerCursor.style.top = viewportY + 'px';
  updatePickerLines(viewportX, viewportY);
  if (isPickerActive) {
    updatePickerColor(x, y);
  }
}
// Update connection lines between circles
function updatePickerLines(cursorX, cursorY) {
  const largeCircle = pickerCursor.querySelector('.picker-large');
  const mediumCircle = pickerCursor.querySelector('.picker-medium');
  const smallCircle = pickerCursor.querySelector('.picker-small');
  const line1 = pickerCursor.querySelector('.picker-line-large-medium');
  const line2 = pickerCursor.querySelector('.picker-line-medium-small');
  const largeX = 0;
  const largeY = 0;
  const mediumX = -30;
  const mediumY = -30;
  const smallX = -45;
  const smallY = -45;
  const dx1 = mediumX - largeX;
  const dy1 = mediumY - largeY;
  const length1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const angle1 = Math.atan2(dy1, dx1) * 180 / Math.PI;
  line1.style.width = length1 + 'px';
  line1.style.left = largeX + 'px';
  line1.style.top = largeY + 'px';
  line1.style.transform = `rotate(${angle1}deg)`;
  const dx2 = smallX - mediumX;
  const dy2 = smallY - mediumY;
  const length2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const angle2 = Math.atan2(dy2, dx2) * 180 / Math.PI;
  line2.style.width = length2 + 'px';
  line2.style.left = mediumX + 'px';
  line2.style.top = mediumY + 'px';
  line2.style.transform = `rotate(${angle2}deg)`;
}
// Update picker color - small circle samples color
function updatePickerColor(x, y) {
  try {
    const smallOffsetX = -45;
    const smallOffsetY = -45;
    const smallX = x + smallOffsetX * canvasRect.scaleX;
    const smallY = y + smallOffsetY * canvasRect.scaleY;
    const canvasX = Math.max(0, Math.min(Math.floor(smallX), canvas.width - 1));
    const canvasY = Math.max(0, Math.min(Math.floor(smallY), canvas.height - 1));
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    if (document.getElementById('paletteTitle').textContent === 'Выберите цвет заливки') {
      currentFillColorCircle.style.backgroundColor = hex;
      const mediumCircle = pickerCursor.querySelector('.picker-medium');
      if (mediumCircle) {
        mediumCircle.style.backgroundColor = hex;
      }
    } else {
      currentColorCircle.style.backgroundColor = hex;
      const mediumCircle = pickerCursor.querySelector('.picker-medium');
      if (mediumCircle) {
        mediumCircle.style.backgroundColor = hex;
      }
    }
  } catch (e) {
  }
}
// Convert RGB to HEX
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
// Start drawing function
function startDraw(e) {
  if (e.type === 'mousedown' && e.button !== 0) return;
  isDrawing = true;
  const { x, y } = getEventPos(e);
  lastX = x;
  lastY = y;
  lastDotX = x;
  lastDotY = y;
  if (currentTool === 'brush' && toolSettings.brush?.type === 'fountainPen') {
    lastMoveTimestamp = Date.now();
    lastPressure = e.pressure !== undefined ? e.pressure : 0.5;
    // Инициализация для перьевой кисти
    featherPenPoints = [{
      x: x,
      y: y,
      timestamp: Date.now()
    }];
  }
  // --- Логика инструмента "Ножницы" удалена ---
  if (currentTool === 'picker') {
    pickColorOnce(x, y);
  } else if (currentTool === 'fill') {
    const fillColorTool = toolSettings.fill?.color || strokeColor;
    floodFill(Math.floor(x), Math.floor(y), fillColorTool);
  } else if (currentTool === 'shape') {
    isDrawingShape = true;
    shapeStart = { x, y };
    shapeEnd = { x, y };
    shapePreviewCanvas.style.display = 'none';
    shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
  } else if (currentTool === 'brush') {
    const brushType = toolSettings.brush?.type || 'solid';
    if (['solid', 'pencil', 'dotted', 'star'].includes(brushType)) {
      updateOffscreenCanvasSize();
      offscreenPathCtx.clearRect(0, 0, offscreenPathCanvas.width, offscreenPathCanvas.height);
      currentPathPoints = [{ x: x, y: y, pressure: lastPressure }];
      pathNeedsRedraw = true;
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(animationLoop);
      }
      shapePreviewCanvas.style.display = 'none';
      shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
    }
  }
}
// Drawing function
function draw(e) {
  if (!isDrawing) return;
  const { x, y } = getEventPos(e);
  if (currentTool === 'brush' && toolSettings.brush?.type === 'fountainPen') {
    lastMoveTime = Date.now();
    lastPressure = e.pressure !== undefined ? e.pressure : lastPressure;
    // Добавляем точку для перьевой кисти
    featherPenPoints.push({
      x: x,
      y: y,
      timestamp: Date.now()
    });
    drawFeatherPenPreview();
    return;
  }
  if (currentTool === 'picker') {
    updatePickerCursor(x, y);
    return;
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (currentTool) {
    case 'brush':
      const brushType = toolSettings.brush?.type || 'solid';
      if (brushType === 'fountainPen' || brushType === 'spray') {
        drawBrush(x, y);
        lastX = x;
        lastY = y;
      } else if (['solid', 'pencil', 'dotted', 'star'].includes(brushType)) {
        currentPathPoints.push({ x: x, y: y, pressure: lastPressure });
        pathNeedsRedraw = true;
        return;
      }
      break;
    case 'eraser':
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = eraserSize;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastX = x;
      lastY = y;
      break;
    // case 'scissors' удален
    case 'shape':
      if (isDrawingShape) {
        shapeEnd = { x, y };
        drawShapePreview();
      }
      break;
  }
}
// Brush drawing function with distance intervals and special tips
function drawBrush(x, y) {
  const settings = toolSettings.brush || {};
  const baseSize = settings.size || 10;
  const color = settings.color || '#000000';
  const type = settings.type || 'solid';
  const interval = settings.dotInterval || 10;
  const opacity = settings.opacity !== undefined ? settings.opacity : 1.0;
  const blur = settings.blur !== undefined ? settings.blur : 0;
  let effectiveSize = baseSize;
  let effectiveOpacity = opacity;
  let effectiveBlur = blur;
  if (type === 'fountainPen') {
    const now = Date.now();
    const timeDelta = now - lastMoveTimestamp;
    const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
    let speed = 0;
    if (timeDelta > 0) {
      speed = distance / timeDelta;
    }
    const minSize = Math.max(1, baseSize * 0.3);
    const maxSize = baseSize * 2;
    const speedFactor = 10;
    const timeFactor = 0.3;
    effectiveSize = Math.max(minSize, baseSize - (speed * speedFactor));
    if (timeDelta > 50) {
         const timeIncrease = Math.min(maxSize - baseSize, timeDelta * timeFactor / 100);
         effectiveSize = Math.min(maxSize, effectiveSize + timeIncrease);
    }
    lastMoveTimestamp = now;
  }
  const rgbaColor = hexToRgba(color, effectiveOpacity);
  ctx.save();
  ctx.globalAlpha = effectiveOpacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = effectiveBlur;
  ctx.strokeStyle = rgbaColor;
  ctx.lineWidth = effectiveSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (type) {
    case 'solid':
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      break;
    case 'dotted':
      const dotDistance = Math.sqrt(Math.pow(x - lastDotX, 2) + Math.pow(y - lastDotY, 2));
      if (dotDistance >= interval) {
        const dots = Math.max(1, Math.floor(dotDistance / interval));
        for (let i = 0; i <= dots; i++) {
          const dotX = lastDotX + (x - lastX) * (i / dots);
          const dotY = lastDotY + (y - lastY) * (i / dots);
          ctx.beginPath();
          ctx.arc(dotX, dotY, effectiveSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        lastDotX = x;
        lastDotY = y;
      }
      break;
    case 'spray':
      const density = effectiveSize * 2;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sprayDistance = Math.random() * effectiveSize;
        const sprayX = x + Math.cos(angle) * sprayDistance;
        const sprayY = y + Math.sin(angle) * sprayDistance;
        ctx.fillStyle = rgbaColor;
        ctx.fillRect(sprayX, sprayY, 2, 2);
      }
      break;
    case 'pencil':
      ctx.strokeStyle = rgbaColor;
      ctx.lineWidth = Math.max(1, effectiveSize / 3);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      break;
    case 'star':
      const starDistance = Math.sqrt(Math.pow(x - lastDotX, 2) + Math.pow(y - lastDotY, 2));
      if (starDistance >= interval * 1.5) {
        const stars = Math.max(1, Math.floor(starDistance / (interval * 1.5)));
        for (let i = 0; i <= stars; i++) {
          const starX = lastDotX + (x - lastX) * (i / stars);
          const starY = lastDotY + (y - lastY) * (i / stars);
          drawStar(starX, starY, 5, effectiveSize / 2, effectiveSize / 4);
        }
        lastDotX = x;
        lastDotY = y;
      }
      break;
    case 'fountainPen':
      ctx.lineWidth = effectiveSize;
      ctx.globalAlpha = effectiveOpacity * 0.7;
      ctx.shadowBlur = effectiveBlur * 2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      break;
  }
  ctx.restore();
}
// Функция для рисования всего пути целиком на заданном контексте
function redrawCurrentPathOnCtx(targetCtx) {
  if (currentPathPoints.length < 2) return;
  const settings = toolSettings.brush || {};
  const baseSize = settings.size || 10;
  const color = settings.color || '#000000';
  const type = settings.type || 'solid';
  const interval = settings.dotInterval || 10;
  const opacity = settings.opacity !== undefined ? settings.opacity : 1.0;
  const blur = settings.blur !== undefined ? settings.blur : 0;
  let effectiveSize = baseSize;
  let effectiveOpacity = opacity;
  let effectiveBlur = blur;
  const rgbaColor = hexToRgba(color, effectiveOpacity);
  targetCtx.save();
  targetCtx.lineJoin = 'round';
  targetCtx.lineCap = 'round';
  targetCtx.globalAlpha = effectiveOpacity;
  targetCtx.shadowColor = color;
  targetCtx.shadowBlur = effectiveBlur;
  targetCtx.strokeStyle = rgbaColor;
  targetCtx.fillStyle = rgbaColor;
  switch (type) {
    case 'solid':
    case 'pencil':
      targetCtx.lineWidth = effectiveSize;
      if (type === 'pencil') {
        targetCtx.lineWidth = Math.max(1, effectiveSize / 3);
      }
      targetCtx.beginPath();
      targetCtx.moveTo(currentPathPoints[0].x, currentPathPoints[0].y);
      for (let i = 1; i < currentPathPoints.length; i++) {
        targetCtx.lineTo(currentPathPoints[i].x, currentPathPoints[i].y);
      }
      targetCtx.stroke();
      break;
    case 'dotted':
      let lastDotPoint = currentPathPoints[0];
      targetCtx.beginPath();
      for (let i = 1; i < currentPathPoints.length; i++) {
        const currentPoint = currentPathPoints[i];
        const segmentDistance = Math.sqrt(Math.pow(currentPoint.x - lastDotPoint.x, 2) + Math.pow(currentPoint.y - lastDotPoint.y, 2));
        if (segmentDistance >= interval) {
          targetCtx.moveTo(lastDotPoint.x, lastDotPoint.y);
          targetCtx.arc(lastDotPoint.x, lastDotPoint.y, effectiveSize / 2, 0, Math.PI * 2);
          const dx = currentPoint.x - lastDotPoint.x;
          const dy = currentPoint.y - lastDotPoint.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          const steps = Math.floor(segmentDistance / interval);
          if (steps > 0) {
            lastDotPoint = {
              x: lastDotPoint.x + nx * interval * steps,
              y: lastDotPoint.y + ny * interval * steps
            };
          } else {
            lastDotPoint = currentPoint;
          }
        }
      }
      targetCtx.fill();
      break;
    case 'star':
      let lastStarPoint = currentPathPoints[0];
      for (let i = 1; i < currentPathPoints.length; i++) {
        const currentPoint = currentPathPoints[i];
        const starDistance = Math.sqrt(Math.pow(currentPoint.x - lastStarPoint.x, 2) + Math.pow(currentPoint.y - lastStarPoint.y, 2));
        if (starDistance >= interval * 1.5) {
          drawStar(lastStarPoint.x, lastStarPoint.y, 5, effectiveSize / 2, effectiveSize / 4, targetCtx);
          const dx = currentPoint.x - lastStarPoint.x;
          const dy = currentPoint.y - lastStarPoint.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          const steps = Math.floor(starDistance / (interval * 1.5));
          if (steps > 0) {
            lastStarPoint = {
              x: lastStarPoint.x + nx * (interval * 1.5) * steps,
              y: lastStarPoint.y + ny * (interval * 1.5) * steps
            };
          } else {
            lastStarPoint = currentPoint;
          }
        }
      }
      break;
  }
  targetCtx.restore();
}
// Вспомогательная функция: HEX → RGBA
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// Вспомогательная функция: рисование звезды (для кисти "звезда")
function drawStar(cx, cy, spikes, outer, inner, targetCtx = ctx) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outer;
    y = cy + Math.sin(rot) * outer;
    targetCtx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    targetCtx.lineTo(x, y);
    rot += step;
  }
  targetCtx.lineTo(cx, cy - outer);
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.restore();
}
// Draw selection overlay (visual feedback only, no drawing on canvas)
function drawSelectionOverlay() {
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);
  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  if (width > 0 && height > 0) {
    selectionOverlay.style.left = (x / canvasRect.scaleX + canvasRect.left) + 'px';
    selectionOverlay.style.top = (y / canvasRect.scaleY + canvasRect.top) + 'px';
    selectionOverlay.style.width = (width / canvasRect.scaleX) + 'px';
    selectionOverlay.style.height = (height / canvasRect.scaleY) + 'px';
    selectionOverlay.style.display = 'block';
    selectionOverlay.style.border = '2px dashed #0000ff';
    selectionOverlay.style.background = 'rgba(0, 0, 255, 0.1)';
  }
}
// Draw shape preview (visual feedback only, no drawing on canvas)
function drawShapePreview() {
  const width = Math.abs(shapeEnd.x - shapeStart.x);
  const height = Math.abs(shapeEnd.y - shapeStart.y);
  const x = Math.min(shapeStart.x, shapeEnd.x);
  const y = Math.min(shapeStart.y, shapeEnd.y);
  if (width > 0 && height > 0) {
    shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
    shapePreviewCtx.strokeStyle = strokeColor;
    shapePreviewCtx.fillStyle = fillColor;
    shapePreviewCtx.lineWidth = shapeBorderWidth;
    shapePreviewCtx.setLineDash(shapeBorderStyle === 'dashed' ? [5, 5] : []);
    shapePreviewCtx.lineJoin = 'round';
    shapePreviewCtx.lineCap = 'round';
    let drawX = x, drawY = y, drawWidth = width, drawHeight = height;
    if (shapeType === 'square' || shapeType === 'circle') {
      const size = Math.min(width, height);
      drawX = shapeStart.x < shapeEnd.x ? shapeStart.x : shapeStart.x - size;
      drawY = shapeStart.y < shapeEnd.y ? shapeStart.y : shapeStart.y - size;
      drawWidth = size;
      drawHeight = size;
    }
    shapePreviewCtx.beginPath();
    if (shapeType === 'rectangle' || shapeType === 'square') {
      if (shapeFill) {
        shapePreviewCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
      }
      shapePreviewCtx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    } else if (shapeType === 'oval' || shapeType === 'circle') {
      const centerX = drawX + drawWidth / 2;
      const centerY = drawY + drawHeight / 2;
      const radiusX = drawWidth / 2;
      const radiusY = drawHeight / 2;
      shapePreviewCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      if (shapeFill) {
        shapePreviewCtx.fill();
      }
      shapePreviewCtx.stroke();
    } else if (shapeType === 'line') {
      shapePreviewCtx.beginPath();
      shapePreviewCtx.moveTo(shapeStart.x, shapeStart.y);
      shapePreviewCtx.lineTo(shapeEnd.x, shapeEnd.y);
      shapePreviewCtx.stroke();
    }
    shapePreviewCtx.setLineDash([]);
    shapePreviewCanvas.style.display = 'block';
  } else {
    shapePreviewCanvas.style.display = 'none';
  }
}
// Stop drawing function
function stopDraw(e) {
  if (e.type === 'mouseup' && e.button !== 0) return;
  isDrawing = false;
  switch (currentTool) {
    // case 'scissors' удален
    case 'fill':
      break;
    case 'picker':
      if (isPickerActive) {
        setTimeout(returnToPreviousTool, 100);
      }
      break;
    case 'shape':
      if (isDrawingShape) {
        isDrawingShape = false;
        const width = Math.abs(shapeEnd.x - shapeStart.x);
        const height = Math.abs(shapeEnd.y - shapeStart.y);
        if (width > 5 && height > 5) {
          drawFinalShape();
        }
        shapePreviewCanvas.style.display = 'none';
        shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
      }
      break;
    case 'brush':
      const brushType = toolSettings.brush?.type || 'solid';
      if (brushType === 'fountainPen') {
        // Завершаем рисование перьевой кисти
        if (featherPenPoints.length > 0) {
          addFadeOutTail();
          drawFeatherPenFinal();
        }
        shapePreviewCanvas.style.display = 'none';
        shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
      } else if (['solid', 'pencil', 'dotted', 'star'].includes(brushType)) {
        if (currentPathPoints.length > 0) {
            offscreenPathCtx.clearRect(0, 0, offscreenPathCanvas.width, offscreenPathCanvas.height);
            redrawCurrentPathOnCtx(offscreenPathCtx);
            const settings = toolSettings.brush || {};
            const opacity = settings.opacity !== undefined ? settings.opacity : 1.0;
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.drawImage(offscreenPathCanvas, 0, 0);
            ctx.restore();
        }
        currentPathPoints = [];
        pathNeedsRedraw = false;
        shapePreviewCanvas.style.display = 'none';
        shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
      }
      break;
  }
}
// Draw final shape on canvas
function drawFinalShape() {
  const width = Math.abs(shapeEnd.x - shapeStart.x);
  const height = Math.abs(shapeEnd.y - shapeStart.y);
  let x = Math.min(shapeStart.x, shapeEnd.x);
  let y = Math.min(shapeStart.y, shapeEnd.y);
  let finalWidth = width;
  let finalHeight = height;
  if (shapeType === 'square' || shapeType === 'circle') {
    const size = Math.min(width, height);
    x = shapeStart.x < shapeEnd.x ? shapeStart.x : shapeStart.x - size;
    y = shapeStart.y < shapeEnd.y ? shapeStart.y : shapeStart.y - size;
    finalWidth = size;
    finalHeight = size;
  }
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = shapeBorderWidth;
  ctx.setLineDash(shapeBorderStyle === 'dashed' ? [5, 5] : []);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (shapeType === 'rectangle' || shapeType === 'square') {
    if (shapeFill) {
      ctx.fillRect(x, y, finalWidth, finalHeight);
    }
    ctx.strokeRect(x, y, finalWidth, finalHeight);
  } else if (shapeType === 'oval' || shapeType === 'circle') {
    const centerX = x + finalWidth / 2;
    const centerY = y + finalHeight / 2;
    const radiusX = finalWidth / 2;
    const radiusY = finalHeight / 2;
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    if (shapeFill) {
      ctx.fill();
    }
    ctx.stroke();
  } else if (shapeType === 'line') {
    ctx.beginPath();
    ctx.moveTo(shapeStart.x, shapeStart.y);
    ctx.lineTo(shapeEnd.x, shapeEnd.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
// Return to previous tool
function returnToPreviousTool() {
  isPickerActive = false;
  pickerCursor.style.display = 'none';
  canvas.style.cursor = 'crosshair';
  currentTool = previousTool;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active-tool'));
  document.querySelector(`[data-tool="${previousTool}"]`)?.classList.add('active-tool');
  if (previousTool === 'brush') {
    brushPanel.classList.add('open');
    document.getElementById('brushOpacity').value = Math.round((toolSettings.brush.opacity || 1.0) * 100);
    document.getElementById('opacityDisplay').textContent = `${Math.round((toolSettings.brush.opacity || 1.0) * 100)}%`;
    document.getElementById('brushBlur').value = toolSettings.brush.blur || 0;
    document.getElementById('blurDisplay').textContent = `${toolSettings.brush.blur || 0}px`;
  } else {
    brushPanel.classList.remove('open');
  }
}
// Get event position
function getEventPos(e) {
  let clientX, clientY;
  if (e.touches?.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e.clientX !== undefined && e.clientY !== undefined) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    return { x: lastX, y: lastY };
  }
  const x = (clientX - canvasRect.left) * canvasRect.scaleX;
  const y = (clientY - canvasRect.top) * canvasRect.scaleY;
  return { x, y };
}
// Pick color once - small circle samples color
function pickColorOnce(x, y) {
  try {
    const smallOffsetX = -45;
    const smallOffsetY = -45;
    const smallX = x + smallOffsetX * canvasRect.scaleX;
    const smallY = y + smallOffsetY * canvasRect.scaleY;
    const canvasX = Math.max(0, Math.min(Math.floor(smallX), canvas.width - 1));
    const canvasY = Math.max(0, Math.min(Math.floor(smallY), canvas.height - 1));
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    if (document.getElementById('paletteTitle').textContent === 'Выберите цвет заливки') {
      fillColor = hex;
      currentFillColorCircle.style.backgroundColor = hex;
      if (toolSettings.shape) {
        toolSettings.shape.fillColor = hex;
      }
    } else {
      strokeColor = hex;
      currentColorCircle.style.backgroundColor = hex;
      if (toolSettings[previousTool]) {
        toolSettings[previousTool].color = hex;
      }
      if (['brush', 'spray', 'fill'].includes(currentTool)) {
        toolSettings[currentTool] = toolSettings[currentTool] || {};
        toolSettings[currentTool].color = hex;
      }
    }
  } catch (e) {
    console.log('Failed to get color');
  }
}
// Flood fill function with tolerance
function floodFill(x, y, fillColorTool) {
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixel(imageData, x, y);
    const fillRGB = hexToRgb(fillColorTool);
    const tolerance = fillToleranceValue;
    if (colorsMatch(targetColor, fillRGB) && tolerance === 0) return;
    const visited = new Array(imageData.width * imageData.height).fill(false);
    const stack = [[x, y]];
    const width = canvas.width;
    const height = canvas.height;
    const targetHSL = rgbToHsl(targetColor[0], targetColor[1], targetColor[2]);
    while (stack.length && stack.length < 1000000) {
      const [cx, cy] = stack.pop();
      const index = cy * width + cx;
      if (visited[index]) continue;
      visited[index] = true;
      const currentColor = getPixel(imageData, cx, cy);
      let shouldFill = false;
      if (tolerance === 0) {
        shouldFill = colorsMatch(currentColor, targetColor);
      } else {
        if (isContiguousFill) {
          shouldFill = isColorSimilar(currentColor, targetColor, tolerance);
        } else {
          const currentHSL = rgbToHsl(currentColor[0], currentColor[1], currentColor[2]);
          const hueDiff = Math.min(
            Math.abs(currentHSL.h - targetHSL.h),
            360 - Math.abs(currentHSL.h - targetHSL.h)
          );
          const saturationDiff = Math.abs(currentHSL.s - targetHSL.s) * 100;
          const lightnessDiff = Math.abs(currentHSL.l - targetHSL.l) * 100;
          const totalDiff = (hueDiff / 3.6 + saturationDiff + lightnessDiff) / 3;
          shouldFill = totalDiff <= tolerance;
        }
      }
      if (!shouldFill) continue;
      setPixel(imageData, cx, cy, fillRGB);
      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < height - 1) stack.push([cx, cy + 1]);
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.log('Fill failed', e);
  }
}
// Check if colors are similar within tolerance
function isColorSimilar(color1, color2, tolerance) {
  const diff = Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2)
  );
  return diff <= (tolerance / 100) * 441;
}
// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: h * 360,
    s: s,
    l: l
  };
}
// Helper functions
function getPixel(imageData, x, y) {
  const offset = (y * imageData.width + x) * 4;
  return [
    imageData.data[offset],
    imageData.data[offset + 1],
    imageData.data[offset + 2],
    imageData.data[offset + 3]
  ];
}
function setPixel(imageData, x, y, color) {
  const offset = (y * imageData.width + x) * 4;
  imageData.data[offset] = color.r;
  imageData.data[offset + 1] = color.g;
  imageData.data[offset + 2] = color.b;
  imageData.data[offset + 3] = 255;
}
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}
function colorsMatch(a, b) {
  return a[0] === b.r && a[1] === b.g && a[2] === b.b;
}
// Show extended color picker
function showExtendedColorPicker() {
  extendedColorPicker.style.display = 'block';
  drawColorWheel();
}
// Цикл анимации для плавной перерисовки предварительного просмотра пути
function animationLoop() {
  if (pathNeedsRedraw && currentTool === 'brush') {
    const brushType = toolSettings.brush?.type || 'solid';
    // Перерисовываем только если активна кисть с новой логикой
    if (['solid', 'pencil', 'dotted', 'star'].includes(brushType)) {
      // Очищаем offscreen canvas
      offscreenPathCtx.clearRect(0, 0, offscreenPathCanvas.width, offscreenPathCanvas.height);
      // Рисуем текущий путь на offscreen canvas
      redrawCurrentPathOnCtx(offscreenPathCtx); // Эта функция уже применяет opacity/blur к линиям на offscreenPathCanvas
      // --- ИЗМЕНЕНИЯ НАЧАЛО ---
      // Очищаем canvas предварительного просмотра
      shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
      // Получаем настройки прозрачности
      const settings = toolSettings.brush || {};
      const opacity = settings.opacity !== undefined ? settings.opacity : 1.0;
      // Сохраняем состояние контекста shapePreviewCtx
      shapePreviewCtx.save();
      // Устанавливаем globalAlpha для предварительного просмотра
      shapePreviewCtx.globalAlpha = opacity;
      // Копируем offscreen canvas на shapePreviewCanvas с учетом прозрачности
      shapePreviewCtx.drawImage(offscreenPathCanvas, 0, 0);
      // Восстанавливаем состояние контекста shapePreviewCtx
      shapePreviewCtx.restore();
      // --- ИЗМЕНЕНИЯ КОНЕЦ ---
      // Показываем предпросмотр
      shapePreviewCanvas.style.display = 'block';
    }
    pathNeedsRedraw = false;
  }
  animationFrameId = requestAnimationFrame(animationLoop);
}
// Setup event listeners
function setupEventListeners() {
  // --- Обработчики для инструмента "Ножницы" удалены ---
  document.getElementById('brushOpacity').addEventListener('input', (e) => {
    brushOpacity = parseInt(e.target.value) / 100;
    toolSettings.brush.opacity = brushOpacity;
    document.getElementById('opacityDisplay').textContent = `${Math.round(brushOpacity * 100)}%`;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('brushBlur').addEventListener('input', (e) => {
    brushBlur = parseInt(e.target.value);
    toolSettings.brush.blur = brushBlur;
    document.getElementById('blurDisplay').textContent = `${brushBlur}px`;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentTool !== 'picker') {
        previousTool = currentTool;
      }
      currentTool = btn.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active-tool'));
      btn.classList.add('active-tool');
      brushPanel.classList.remove('open');
      eraserPanel.classList.remove('open');
      fillPanel.classList.remove('open');
      shapePanel.classList.remove('open');
      if (currentTool === 'brush') {
        brushPanel.classList.add('open');
        document.getElementById('brushOpacity').value = Math.round((toolSettings.brush.opacity || 1.0) * 100);
        document.getElementById('opacityDisplay').textContent = `${Math.round((toolSettings.brush.opacity || 1.0) * 100)}%`;
        document.getElementById('brushBlur').value = toolSettings.brush.blur || 0;
        document.getElementById('blurDisplay').textContent = `${toolSettings.brush.blur || 0}px`;
        const brushTypeValue = document.getElementById('brushType').value;
        if (brushTypeValue === 'dotted' || brushTypeValue === 'star') {
          dotIntervalSetting.style.display = 'block';
        } else {
          dotIntervalSetting.style.display = 'none';
        }
      } else if (currentTool === 'eraser') {
        eraserPanel.classList.add('open');
      } else if (currentTool === 'fill') {
        fillPanel.classList.add('open');
      } else if (currentTool === 'shape') {
        shapePanel.classList.add('open');
      }
      if (toolSettings[currentTool]?.color) {
        strokeColor = toolSettings[currentTool].color;
        currentColorCircle.style.backgroundColor = strokeColor;
      }
      if (currentTool === 'brush' && toolSettings.brush) {
        brushSize = toolSettings.brush.size || 10;
        brushType = toolSettings.brush.type || 'solid';
        dotInterval = toolSettings.brush.dotInterval || 10;
        document.getElementById('brushSize').value = brushSize;
        document.getElementById('brushSizeDisplay').textContent = brushSize;
        document.getElementById('brushType').value = brushType;
        document.getElementById('dotInterval').value = dotInterval;
        document.getElementById('dotIntervalDisplay').textContent = dotInterval;
        if (brushType === 'dotted' || brushType === 'star') {
          dotIntervalSetting.style.display = 'block';
        } else {
          dotIntervalSetting.style.display = 'none';
        }
      }
      if (currentTool === 'eraser' && toolSettings.eraser) {
        eraserSize = toolSettings.eraser.size || 10;
        document.getElementById('eraserSize').value = eraserSize;
        document.getElementById('eraserSizeDisplay').textContent = eraserSize;
      }
      if (currentTool === 'fill' && toolSettings.fill) {
        fillToleranceValue = toolSettings.fill.tolerance || 1;
        isContiguousFill = toolSettings.fill.contiguous !== false;
        document.getElementById('fillTolerance').value = fillToleranceValue;
        document.getElementById('toleranceDisplay').textContent = fillToleranceValue;
        document.getElementById('contiguousFill').checked = isContiguousFill;
      }
      if (currentTool === 'shape' && toolSettings.shape) {
        strokeColor = toolSettings.shape.strokeColor || '#000000';
        fillColor = toolSettings.shape.fillColor || '#ffffff';
        shapeType = toolSettings.shape.type || 'rectangle';
        shapeBorderStyle = toolSettings.shape.borderStyle || 'solid';
        shapeBorderWidth = toolSettings.shape.borderWidth || 2;
        shapeFill = toolSettings.shape.fill !== false;
        currentColorCircle.style.backgroundColor = strokeColor;
        currentFillColorCircle.style.backgroundColor = fillColor;
        document.getElementById('shapeType').value = shapeType;
        document.getElementById('shapeBorderStyle').value = shapeBorderStyle;
        document.getElementById('shapeBorderWidth').value = shapeBorderWidth;
        document.getElementById('shapeBorderWidthDisplay').textContent = shapeBorderWidth;
        document.getElementById('shapeFill').checked = shapeFill;
      }
      if (currentTool === 'picker') {
        isPickerActive = true;
        pickerCursor.style.display = 'block';
        canvas.style.cursor = 'none';
      } else if (currentTool !== 'move') {
        isPickerActive = false;
        pickerCursor.style.display = 'none';
        canvas.style.cursor = 'crosshair';
      }
    });
  });
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseout', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);
  // Обработчики для moveResizeSelection и stopMoveResizeSelection удалены
  let pickerMoveTimer;
  canvas.addEventListener('mousemove', (e) => {
    if (currentTool === 'picker') {
      clearTimeout(pickerMoveTimer);
      pickerMoveTimer = setTimeout(() => {
        const { x, y } = getEventPos(e);
        updatePickerCursor(x, y);
      }, 16);
    }
  });
  canvas.addEventListener('touchmove', (e) => {
    if (currentTool === 'picker' && e.touches?.length > 0) {
      clearTimeout(pickerMoveTimer);
      pickerMoveTimer = setTimeout(() => {
        const { x, y } = getEventPos(e);
        updatePickerCursor(x, y);
      }, 16);
    }
  });
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateCanvasRect();
  });
  window.addEventListener('scroll', updateCanvasRect);
  // Scissors menu events удалены
  colorWheel.addEventListener('click', (e) => {
    const rect = colorWheel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    selectColorFromWheel(x, y);
  });
  colorWheel.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches?.length > 0) {
      const rect = colorWheel.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      selectColorFromWheel(x, y);
    }
  });
  saturationSlider.addEventListener('input', (e) => {
    currentSaturation = parseInt(e.target.value);
    drawColorWheel();
  });
  brightnessSlider.addEventListener('input', (e) => {
    currentBrightness = parseInt(e.target.value);
    drawColorWheel();
  });
  document.getElementById('selectExtendedColor').addEventListener('click', () => {
    selectColor(tempSelectedColor);
    extendedColorPicker.style.display = 'none';
    colorPaletteModal.style.display = 'block';
  });
  document.getElementById('closeExtendedPicker').addEventListener('click', () => {
    extendedColorPicker.style.display = 'none';
    colorPaletteModal.style.display = 'block';
  });
  fillTolerance.addEventListener('input', (e) => {
    fillToleranceValue = parseInt(e.target.value);
    toolSettings.fill = toolSettings.fill || {};
    toolSettings.fill.tolerance = fillToleranceValue;
    toleranceDisplay.textContent = fillToleranceValue;
  });
  contiguousFill.addEventListener('change', (e) => {
    isContiguousFill = e.target.checked;
    toolSettings.fill = toolSettings.fill || {};
    toolSettings.fill.contiguous = isContiguousFill;
  });
  document.getElementById('colorPickerBtn').addEventListener('click', () => {
    document.getElementById('paletteTitle').textContent = 'Выберите цвет';
    colorPaletteModal.style.display = 'block';
  });
  document.getElementById('fillColorPickerBtn').addEventListener('click', () => {
    document.getElementById('paletteTitle').textContent = 'Выберите цвет заливки';
    colorPaletteModal.style.display = 'block';
  });
  document.getElementById('paletteClose').addEventListener('click', () => {
    colorPaletteModal.style.display = 'none';
  });
  document.getElementById('saveBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'painting.png';
    link.href = canvas.toDataURL();
    link.click();
  });
  document.getElementById('loadBtn').addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = URL.createObjectURL(file);
    }
  });
  window.addEventListener('click', (e) => {
    if (e.target === colorPaletteModal) {
      colorPaletteModal.style.display = 'none';
    }
    if (e.target === extendedColorPicker) {
      extendedColorPicker.style.display = 'none';
      colorPaletteModal.style.display = 'block';
    }
  });
  document.getElementById('brushSize').addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    toolSettings.brush = toolSettings.brush || {};
    toolSettings.brush.size = brushSize;
    document.getElementById('brushSizeDisplay').textContent = brushSize;
  });
  document.getElementById('brushType').addEventListener('change', (e) => {
    brushType = e.target.value;
    toolSettings.brush = toolSettings.brush || {};
    toolSettings.brush.type = brushType;
    if (brushType === 'dotted' || brushType === 'star') {
      dotIntervalSetting.style.display = 'block';
    } else {
      dotIntervalSetting.style.display = 'none';
    }
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('dotInterval').addEventListener('input', (e) => {
    dotInterval = parseInt(e.target.value);
    toolSettings.brush = toolSettings.brush || {};
    toolSettings.brush.dotInterval = dotInterval;
    document.getElementById('dotIntervalDisplay').textContent = dotInterval;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('eraserSize').addEventListener('input', (e) => {
    eraserSize = parseInt(e.target.value);
    toolSettings.eraser = toolSettings.eraser || {};
    toolSettings.eraser.size = eraserSize;
    document.getElementById('eraserSizeDisplay').textContent = eraserSize;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('shapeType').addEventListener('change', (e) => {
    shapeType = e.target.value;
    toolSettings.shape = toolSettings.shape || {};
    toolSettings.shape.type = shapeType;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('shapeBorderStyle').addEventListener('change', (e) => {
    shapeBorderStyle = e.target.value;
    toolSettings.shape = toolSettings.shape || {};
    toolSettings.shape.borderStyle = shapeBorderStyle;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('shapeBorderWidth').addEventListener('input', (e) => {
    shapeBorderWidth = parseInt(e.target.value);
    toolSettings.shape = toolSettings.shape || {};
    toolSettings.shape.borderWidth = shapeBorderWidth;
    document.getElementById('shapeBorderWidthDisplay').textContent = shapeBorderWidth;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('shapeFill').addEventListener('change', (e) => {
    shapeFill = e.target.checked;
    toolSettings.shape = toolSettings.shape || {};
    toolSettings.shape.fill = shapeFill;
    if (currentTool === 'shape' && isDrawingShape) {
      drawShapePreview();
    }
  });
  document.getElementById('closeBrushPanel').addEventListener('click', () => {
    brushPanel.classList.remove('open');
  });
  document.getElementById('closeEraserPanel').addEventListener('click', () => {
    eraserPanel.classList.remove('open');
  });
  document.getElementById('closeFillPanel').addEventListener('click', () => {
    fillPanel.classList.remove('open');
  });
  document.getElementById('closeShapePanel').addEventListener('click', () => {
    shapePanel.classList.remove('open');
  });
  // Отдельный обработчик клика для ПК, чтобы показывать меню ножниц по клику на выделении удален
}
// Redraw canvas
function redrawCanvas() { /* ... */ }
// Исправлено: Функция активации инструмента по умолчанию
function activateDefaultTool() {
  // Активируем кнопку кисти по умолчанию
  const brushButton = document.querySelector('[data-tool="brush"]');
  if (brushButton) {
    brushButton.classList.add('active-tool');
  }
  currentTool = 'brush';
  brushPanel.classList.add('open');
}
// Initialize
resizeCanvas();
updateCanvasRect();
createColorPalette();
drawColorWheel();
setupEventListeners();
activateDefaultTool();
