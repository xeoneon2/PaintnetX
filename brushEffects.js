// --- НОВАЯ ЛОГИКА ДЛЯ ПЕРЬЕВОЙ КИСТИ ---

// Рисование предварительного просмотра перьевой кисти
function drawFeatherPenPreview() {
  if (featherPenPoints.length < 2) return;
  // Очищаем canvas предварительного просмотра
  shapePreviewCtx.clearRect(0, 0, shapePreviewCanvas.width, shapePreviewCanvas.height);
  // Создаем плавную линию с переменной толщиной
  drawSmoothLine(shapePreviewCtx, featherPenPoints, true);
  // Показываем предпросмотр
  shapePreviewCanvas.style.display = 'block';
}

// Рисование финальной линии перьевой кисти на основном холсте
function drawFeatherPenFinal() {
  if (featherPenPoints.length < 2) return;
  // Создаем плавную линию с переменной толщиной
  drawSmoothLine(ctx, featherPenPoints, false);
  // Очищаем массив точек
  featherPenPoints = [];
}

// Добавление хвостика
function addFadeOutTail() {
  if (featherPenPoints.length < 2) return;
  const lastPoint = featherPenPoints[featherPenPoints.length - 1];
  const prevPoint = featherPenPoints[featherPenPoints.length - 2];
  // Направление движения
  const dx = lastPoint.x - prevPoint.x;
  const dy = lastPoint.y - prevPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return;
  const dirX = dx / distance;
  const dirY = dy / distance;
  // Создаем 3 точки хвостика
  const tailLength = Math.min(20, distance * 0.5);
  const baseTime = lastPoint.timestamp;
  for (let i = 1; i <= 3; i++) {
    const t = i / 3;
    const fadeFactor = 1 - t;
    featherPenPoints.push({
      x: lastPoint.x + dirX * tailLength * t,
      y: lastPoint.y + dirY * tailLength * t,
      timestamp: baseTime + 20 * t,
      fade: fadeFactor
    });
  }
}

// Вычисление скорости
function calculateSpeed(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const timeDiff = Math.max(1, point2.timestamp - point1.timestamp);
  return distance / timeDiff;
}

// Вычисление толщины
function calculateThickness(speed) {
  // Чем быстрее движение, тем тоньше линия
  const baseSize = toolSettings.brush?.size || 10;
  return Math.max(1, baseSize - speed * 2);
}

// Рисование плавной линии с переменной толщиной
function drawSmoothLine(targetCtx, points, isPreview) {
  if (points.length < 2) return;
  // Создаем массив точек с толщиной
  const pointsWithThickness = points.map((point, i) => {
    let thickness;
    if (point.fade !== undefined) {
      // Это точка хвостика
      const baseSize = toolSettings.brush?.size || 10;
      thickness = baseSize * 0.2 * point.fade; // Уменьшаем толщину хвостика
    } else if (i === 0) {
      // Первая точка
      const speed = calculateSpeed(point, points[1]);
      thickness = calculateThickness(speed);
    } else {
      // Обычная точка - используем скорость к предыдущей точке
      const speed = calculateSpeed(points[i-1], point);
      thickness = calculateThickness(speed);
    }
    return { ...point, thickness };
  });
  // Рисуем линию как полигональную область
  drawThickLine(targetCtx, pointsWithThickness, isPreview);
}

// Рисование толстой линии
function drawThickLine(targetCtx, points, isPreview) {
  if (points.length < 2) return;
  const leftPoints = [];
  const rightPoints = [];
  // Вычисляем точки для левой и правой границы
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let normalX, normalY;
    if (i === 0) {
      // Первая точка
      const next = points[i + 1];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        normalX = -dy / length;
        normalY = dx / length;
      } else {
        normalX = 0;
        normalY = 1;
      }
    } else if (i === points.length - 1) {
      // Последняя точка
      const prev = points[i - 1];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        normalX = -dy / length;
        normalY = dx / length;
      } else {
        normalX = 0;
        normalY = 1;
      }
    } else {
      // Средняя точка - усредняем нормали
      const prev = points[i - 1];
      const next = points[i + 1];
      // Нормаль к предыдущему сегменту
      let dx1 = point.x - prev.x;
      let dy1 = point.y - prev.y;
      let len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      if (len1 > 0) {
        dx1 /= len1;
        dy1 /= len1;
      }
      // Нормаль к следующему сегменту
      let dx2 = next.x - point.x;
      let dy2 = next.y - point.y;
      let len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (len2 > 0) {
        dx2 /= len2;
        dy2 /= len2;
      }
      // Усредняем нормали
      let avgDx = (dx1 + dx2) / 2;
      let avgDy = (dy1 + dy2) / 2;
      let avgLen = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
      if (avgLen > 0) {
        normalX = -avgDy / avgLen;
        normalY = avgDx / avgLen;
      } else {
        normalX = 0;
        normalY = 1;
      }
    }
    const halfThickness = point.thickness / 2;
    leftPoints.push({
      x: point.x + normalX * halfThickness,
      y: point.y + normalY * halfThickness
    });
    rightPoints.push({
      x: point.x - normalX * halfThickness,
      y: point.y - normalY * halfThickness
    });
  }
  // Рисуем полигональную область
  targetCtx.beginPath();
  // Левая граница
  targetCtx.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 1; i < leftPoints.length; i++) {
    targetCtx.lineTo(leftPoints[i].x, leftPoints[i].y);
  }
  // Правая граница (в обратном порядке)
  for (let i = rightPoints.length - 1; i >= 0; i--) {
    targetCtx.lineTo(rightPoints[i].x, rightPoints[i].y);
  }
  // Замыкаем контур
  targetCtx.closePath();
  // Получаем настройки
  const settings = toolSettings.brush || {};
  const color = settings.color || '#000000';
  const opacity = settings.opacity !== undefined ? settings.opacity : 1.0;
  const blur = settings.blur !== undefined ? settings.blur : 0;
  // Заливка с учетом прозрачности и размытия
  targetCtx.save();
  targetCtx.fillStyle = hexToRgba(color, opacity);
  targetCtx.shadowColor = color;
  targetCtx.shadowBlur = blur;
  targetCtx.fill();
  targetCtx.restore();
}