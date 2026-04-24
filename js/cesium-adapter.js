const VWORLD_API_KEY = '72E5F03C-6058-35DB-941E-C9E787A7BA99';

// Cesium 뷰어 초기화
Cesium.Ion.defaultAccessToken = '';

function makeProvider(kind) {
  if (kind === 'google') {
    return new Cesium.UrlTemplateImageryProvider({
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      credit: '© Google', maximumLevel: 20,
    });
  }
  if (kind === 'vworldBase') {
    return new Cesium.UrlTemplateImageryProvider({
      url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Base/{z}/{y}/{x}.png`,
      credit: '© VWorld · 국토교통부', maximumLevel: 19,
    });
  }
  return new Cesium.UrlTemplateImageryProvider({
    url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Satellite/{z}/{y}/{x}.jpeg`,
    credit: '© VWorld · 국토교통부', maximumLevel: 19,
  });
}

const viewer = new Cesium.Viewer('cesiumContainer', {
  baseLayerPicker: false, geocoder: false, homeButton: false,
  sceneModePicker: false, navigationHelpButton: false,
  animation: false, timeline: false, fullscreenButton: false,
  infoBox: true, selectionIndicator: true,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
});
// 기본 레이어 전부 제거 후 VWorld 위성으로 명시 교체
viewer.imageryLayers.removeAll();
let baseLayer = viewer.imageryLayers.addImageryProvider(makeProvider('vworld'));
let hybridLayer = null;
let hybridVisible = false;
viewer.scene.globe.enableLighting = false;
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b1220');
const credit = viewer._cesiumWidget._creditContainer;
if (credit) credit.style.display = 'none';

function setBaseLayer(kind) {
  const provider = makeProvider(kind);
  const layers = viewer.imageryLayers;
  if (baseLayer) layers.remove(baseLayer, false);
  baseLayer = layers.addImageryProvider(provider, 0);
  ['vworld','vworldBase','google'].forEach(k => {
    const el = document.getElementById('lyr-' + (k === 'vworldBase' ? 'vworld2' : k));
    if (el) el.classList.toggle('active', k === kind);
  });
  applyHoloTone();
}

function toggleHybrid() {
  if (hybridVisible) {
    if (hybridLayer) { viewer.imageryLayers.remove(hybridLayer, false); hybridLayer = null; }
    hybridVisible = false;
  } else {
    hybridLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_API_KEY}/Hybrid/{z}/{y}/{x}.png`,
        maximumLevel: 19,
      })
    );
    hybridVisible = true;
  }
  const btn = document.getElementById('lyr-hybrid');
  if (btn) btn.classList.toggle('active', hybridVisible);
}

// 홀로그램 모드
let holoMode = true;
const TYPE_CFG_3D = {
  bench:    { icon:'🪑', color:'#D4A017' },
  restroom: { icon:'🚻', color:'#5DADE2' },
  exercise: { icon:'🏋️', color:'#EC7063' },
  light:    { icon:'💡', color:'#F5B041' },
  parking:  { icon:'🅿️', color:'#A569BD' },
  bin:      { icon:'🗑️', color:'#58D68D' },
  cctv:     { icon:'📹', color:'#22D3EE' },
};
function hpColor3D(hp) {
  if (hp > 80) return '#22c55e';
  if (hp > 50) return '#84cc16';
  if (hp > 30) return '#f59e0b';
  if (hp > 10) return '#f97316';
  return '#ef4444';
}
function beamColor3D(hp) {
  if (hp > 50) return '#22d3ee';
  if (hp > 30) return '#f59e0b';
  return '#ef4444';
}

// 엔티티 저장소 (ID -> 엔티티 배열)
const entityMap = new Map(); // facilityId -> [marker, beam, pad, label]
const boundaryEntities = [];

function applyHoloTone() {
  if (!baseLayer) return;
  if (holoMode) {
    baseLayer.brightness = 0.6;
    baseLayer.contrast = 1.3;
    baseLayer.saturation = 0.6;
  } else {
    baseLayer.brightness = 1.0;
    baseLayer.contrast = 1.0;
    baseLayer.saturation = 1.0;
  }
}

// HP 수치를 글로우가 있는 canvas 이미지로 생성
function buildHpGlowCanvas(hp, color) {
  const size = 120;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size * 0.6;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 바깥 글로우 (큰 blur)
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(`${hp}`, cx, cy);
  // 중간 글로우 강화 (중첩)
  ctx.shadowBlur = 10;
  ctx.fillText(`${hp}`, cx, cy);
  ctx.shadowBlur = 6;
  ctx.fillText(`${hp}`, cx, cy);
  // 중심 샤프 텍스트 (흰색 코어)
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${hp}`, cx, cy);
  return canvas.toDataURL();
}

// Emoji를 단색 네온으로 틴트 처리 (source-in 합성)
function drawTintedEmoji(ctx, emoji, cx, cy, fontSize, tintColor) {
  const s = Math.ceil(fontSize * 1.8);
  const temp = document.createElement('canvas');
  temp.width = s; temp.height = s;
  const tctx = temp.getContext('2d');
  tctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.fillText(emoji, s/2, s/2 + 1);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = tintColor;
  tctx.fillRect(0, 0, s, s);
  ctx.drawImage(temp, cx - s/2, cy - s/2);
}

// 화장실: 남/녀 실루엣 커스텀 드로잉 (emoji보다 훨씬 명확함)
function drawRestroomIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 3;
  const s = size / 28;

  // === 남자 (왼쪽) ===
  // 머리
  ctx.beginPath();
  ctx.arc(cx - 7*s, cy - 7*s, 2*s, 0, Math.PI * 2);
  ctx.fill();
  // 몸통(사다리꼴)
  ctx.beginPath();
  ctx.moveTo(cx - 10*s, cy - 3.5*s);
  ctx.lineTo(cx - 4*s,  cy - 3.5*s);
  ctx.lineTo(cx - 5*s,  cy + 1.5*s);
  ctx.lineTo(cx - 9*s,  cy + 1.5*s);
  ctx.closePath();
  ctx.fill();
  // 다리 (두 개)
  ctx.fillRect(cx - 8.5*s, cy + 1.5*s, 1.6*s, 6.5*s);
  ctx.fillRect(cx - 6.1*s, cy + 1.5*s, 1.6*s, 6.5*s);

  // === 여자 (오른쪽) ===
  // 머리
  ctx.beginPath();
  ctx.arc(cx + 7*s, cy - 7*s, 2*s, 0, Math.PI * 2);
  ctx.fill();
  // 드레스 (삼각)
  ctx.beginPath();
  ctx.moveTo(cx + 4*s,  cy - 3.5*s);
  ctx.lineTo(cx + 10*s, cy - 3.5*s);
  ctx.lineTo(cx + 11.5*s, cy + 3.5*s);
  ctx.lineTo(cx + 2.5*s,  cy + 3.5*s);
  ctx.closePath();
  ctx.fill();
  // 다리
  ctx.fillRect(cx + 5.5*s, cy + 3.5*s, 1.6*s, 4.5*s);
  ctx.fillRect(cx + 7.9*s, cy + 3.5*s, 1.6*s, 4.5*s);

  // 가운데 구분선 (옅게)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = Math.max(1, s * 0.8);
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9.5*s);
  ctx.lineTo(cx, cy + 8*s);
  ctx.stroke();

  ctx.restore();
}

function drawParkingIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  const s = size / 28;

  // 외곽 둥근 사각형 테두리
  const bw = 22 * s, bh = 22 * s;
  const bx = cx - bw / 2, by = cy - bh / 2;
  const r = 3.5 * s;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.arcTo(bx + bw, by,         bx + bw, by + r,         r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.arcTo(bx + bw, by + bh,    bx + bw - r, by + bh,    r);
  ctx.lineTo(bx + r,  by + bh);
  ctx.arcTo(bx,       by + bh,   bx, by + bh - r,          r);
  ctx.lineTo(bx,      by + r);
  ctx.arcTo(bx,       by,        bx + r, by,               r);
  ctx.closePath();
  ctx.stroke();

  // 'P' 글자 — 줄기
  const px = cx - 3.5 * s;
  const ptop = cy - 8 * s;
  const pbot = cy + 8 * s;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, ptop);
  ctx.lineTo(px, pbot);
  ctx.stroke();

  // 'P' 글자 — 반원 (오른쪽 볼록)
  ctx.beginPath();
  ctx.moveTo(px, ptop);
  ctx.bezierCurveTo(
    px + 10 * s, ptop,
    px + 10 * s, cy,
    px,          cy
  );
  ctx.stroke();

  ctx.restore();
}

// 공통 아이콘 드로어 (타입별 분기)
function drawFacilityIcon(ctx, type, cx, cy, size, color) {
  if (type === 'restroom') {
    drawRestroomIcon(ctx, cx, cy, size, color);
    return;
  }
  if (type === 'parking') {
    drawParkingIcon(ctx, cx, cy, size, color);
    return;
  }
  const cfg = TYPE_CFG_3D[type] || { icon: '📍' };
  drawTintedEmoji(ctx, cfg.icon, cx, cy, size, color);
}

function buildHoloCanvas(f) {
  const cfg = TYPE_CFG_3D[f.type] || { icon:'📍', color:'#22d3ee' };
  const hp = f.hp || 0;
  const main = beamColor3D(hp);
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size/2, cy = size/2;

  // 외곽 글로우
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 46);
  glow.addColorStop(0, main + 'aa');
  glow.addColorStop(0.6, main + '33');
  glow.addColorStop(1, main + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // 팔각 외곽 링
  ctx.strokeStyle = main;
  ctx.lineWidth = 2;
  ctx.shadowColor = main;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const x = cx + Math.cos(a) * 40;
    const y = cy + Math.sin(a) * 40;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 내부 어두운 홀로그램 배경
  ctx.fillStyle = 'rgba(8, 20, 32, 0.85)';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const x = cx + Math.cos(a) * 36;
    const y = cy + Math.sin(a) * 36;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // 내부 스캔라인 효과
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    const x = cx + Math.cos(a) * 34;
    const y = cy + Math.sin(a) * 34;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = main + '22';
  ctx.lineWidth = 1;
  for (let y = cy - 32; y < cy + 32; y += 4) {
    ctx.beginPath();
    ctx.moveTo(cx - 36, y);
    ctx.lineTo(cx + 36, y);
    ctx.stroke();
  }
  ctx.restore();

  // 아이콘 (네온 틴트 또는 커스텀 드로잉)
  drawFacilityIcon(ctx, f.type, cx, cy - 2, 28, main);

  // 하단 HP 바
  ctx.fillStyle = main;
  ctx.fillRect(cx - 14, cy + 22, 28 * (hp/100), 2);
  ctx.strokeStyle = main + '55';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 14, cy + 22, 28, 2);

  // 모서리 브래킷 (사이버 액센트)
  const br = 38;
  const brLen = 6;
  ctx.strokeStyle = main;
  ctx.lineWidth = 2;
  ctx.shadowColor = main; ctx.shadowBlur = 6;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx, sy]) => {
    const x = cx + sx * br;
    const y = cy + sy * br;
    ctx.beginPath();
    ctx.moveTo(x - sx * brLen, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - sy * brLen);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  return canvas.toDataURL();
}

function buildBasePad(main) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2);
  grad.addColorStop(0, main + 'ee');
  grad.addColorStop(0.4, main + '55');
  grad.addColorStop(1, main + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = main;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(size/2, size/2, 18, 0, Math.PI * 2);
  ctx.stroke();
  return canvas.toDataURL();
}

function buildLegacyCanvas(f) {
  const cfg = TYPE_CFG_3D[f.type] || { icon:'📍', color:'#94a3b8' };
  const hp = f.hp || 0;
  const hpC = hpColor3D(hp);
  const canvas = document.createElement('canvas');
  canvas.width = 72; canvas.height = 88;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(36, 36, 10, 36, 36, 34);
  grad.addColorStop(0, cfg.color + 'cc');
  grad.addColorStop(1, cfg.color + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 72, 72);
  ctx.beginPath();
  ctx.arc(36, 36, 22, 0, Math.PI * 2);
  ctx.fillStyle = cfg.color + 'd0';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.icon, 36, 40);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(12, 68, 48, 5);
  ctx.fillStyle = hpC;
  ctx.fillRect(12, 68, 48 * (hp / 100), 5);
  return canvas.toDataURL();
}

function clearAllEntities() {
  entityMap.forEach(arr => arr.forEach(e => viewer.entities.remove(e)));
  entityMap.clear();
  boundaryEntities.forEach(e => viewer.entities.remove(e));
  boundaryEntities.length = 0;
}

function render3DBoundary() {
  boundaryEntities.forEach(e => viewer.entities.remove(e));
  boundaryEntities.length = 0;
  const park = getCurrentPark();
  const polygons = park.boundary || [];
  const color = holoMode ? '#22d3ee' : '#3b82f6';
  const fill = holoMode ? 0.08 : 0.20;
  polygons.forEach((poly, idx) => {
    if (!poly || poly.length < 3) return;
    const flat = [];
    poly.forEach(pt => { flat.push(pt[1], pt[0]); });
    const p = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(flat),
        material: Cesium.Color.fromCssColorString(color).withAlpha(fill),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(color),
        outlineWidth: 3,
        height: 0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    boundaryEntities.push(p);
    if (holoMode) {
      const closed = flat.slice();
      closed.push(flat[0], flat[1]);
      boundaryEntities.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(closed),
          width: 5, clampToGround: true,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.35, taperPower: 1.0,
            color: Cesium.Color.fromCssColorString('#22d3ee'),
          }),
        },
      }));
    }
  });
}

function renderFacility3D(f) {
  // 기존 엔티티 제거
  if (entityMap.has(f.id)) {
    entityMap.get(f.id).forEach(e => viewer.entities.remove(e));
    entityMap.delete(f.id);
  }
  if (f.lat == null || f.lng == null) return;
  const entities = [];
  const cfg = TYPE_CFG_3D[f.type] || { icon:'📍', color:'#94a3b8' };
  const hp = f.hp || 0;

  function tag(e) { e.facilityId = f.id; return e; }

  if (holoMode) {
    const color = beamColor3D(hp);
    entities.push(tag(viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(f.lng, f.lat, 0.5),
      billboard: {
        image: buildBasePad(color),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scale: 0.6,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })));
    entities.push(tag(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([f.lng, f.lat, 0, f.lng, f.lat, 60]),
        width: 4,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.35, taperPower: 0.2,
          color: Cesium.Color.fromCssColorString(color),
        }),
        arcType: Cesium.ArcType.NONE,
      },
    })));
    const isSelected = holoSelectedFacilityId === f.id;
    entities.push(tag(viewer.entities.add({
      name: f.name,
      position: Cesium.Cartesian3.fromDegrees(f.lng, f.lat, 60),
      billboard: {
        image: buildHoloCanvas(f),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scale: 0.75,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        color: isSelected
          ? new Cesium.CallbackProperty(() => {
              const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(Date.now() * 0.005));
              return Cesium.Color.WHITE.withAlpha(alpha);
            }, false)
          : Cesium.Color.WHITE,
      },
    })));

    // HP 수치와 시설명은 상시 노출하지 않음 — 마우스 hover 시 툴팁으로 표시
  } else {
    entities.push(tag(viewer.entities.add({
      name: f.name,
      position: Cesium.Cartesian3.fromDegrees(f.lng, f.lat, 2),
      billboard: {
        image: buildLegacyCanvas(f),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scale: 0.7,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: f.name,
        font: 'bold 11px "Noto Sans KR", sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.fromCssColorString('#0c1322'),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0c1322').withAlpha(0.88),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        pixelOffset: new Cesium.Cartesian2(0, -66),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3500),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
    })));
  }

  entityMap.set(f.id, entities);
}

function render3DAllMarkers(filter) {
  // 기존 마커 제거 (경계는 유지)
  entityMap.forEach(arr => arr.forEach(e => viewer.entities.remove(e)));
  entityMap.clear();
  const list = filter === 'all' ? FACILITIES
    : filter === 'alert' ? FACILITIES.filter(f => f.hp <= 30)
    : FACILITIES.filter(f => f.type === filter);
  list.forEach(f => renderFacility3D(f));
}

// ================= app.js 함수 훅킹 =================
const _origAddMarkers = window.addMarkers;
window.addMarkers = function(filter) {
  if (typeof _origAddMarkers === 'function') _origAddMarkers(filter);
  render3DAllMarkers(filter);
};

// ============== 선택 마커 깜빡임 ==============
let holoSelectedFacilityId = null;

function rerenderFacility(id) {
  const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === id);
  if (f) renderFacility3D(f);
}

// clearSelection 훅
const _origClearSelection = window.clearSelection;
window.clearSelection = function() {
  if (typeof _origClearSelection === 'function') _origClearSelection();
  const prev = holoSelectedFacilityId;
  holoSelectedFacilityId = null;
  if (prev) rerenderFacility(prev);
};

const _origSelectFacility = window.selectFacility;
window.selectFacility = function(id) {
  if (typeof _origSelectFacility === 'function') _origSelectFacility(id);
  const prev = holoSelectedFacilityId;
  holoSelectedFacilityId = id;
  if (prev && prev !== id) rerenderFacility(prev); // 이전 마커 원복
  rerenderFacility(id);                            // 새 마커 깜빡임 적용
  const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === id);
  if (f && f.lat != null && f.lng != null) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(f.lng, f.lat - 0.001, 180),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 1.4,
    });
  }
};

const _origSwitchPark = window.switchPark;
window.switchPark = function(pid) {
  if (typeof _origSwitchPark === 'function') _origSwitchPark(pid);
  const park = getCurrentPark();
  render3DBoundary();
  render3DAllMarkers(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
  // 카메라 이동
  const allPts = park.boundary && park.boundary.length ? park.boundary.reduce((a, p) => a.concat(p || []), []) : [];
  if (allPts.length >= 3) {
    const lats = allPts.map(p => p[0]);
    const lngs = allPts.map(p => p[1]);
    const rect = Cesium.Rectangle.fromDegrees(
      Math.min(...lngs), Math.min(...lats),
      Math.max(...lngs), Math.max(...lats)
    );
    viewer.camera.flyTo({ destination: rect, duration: 1.4 });
  } else if (park.center) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(park.center[1], park.center[0], 2000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
      duration: 1.4,
    });
  }
};

// ============== 클릭 + 롱프레스 드래그 + 액션 오버레이 ==============
// (app.js와의 전역 변수 충돌 회피를 위해 고유 prefix 사용)
const HOLO_PRESS_MS = 500;
let holoPressTimer = null;
let holoPressedId = null;
let holoDragMode = false;
let holoJustDragged = false;
let holoActionsEl = null;
let holoActionsForId = null;
let holoActionsPostRenderFn = null;

function entityScreenPos(facilityId, height) {
  const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === facilityId);
  if (!f) return null;
  const cart = Cesium.Cartesian3.fromDegrees(f.lng, f.lat, height || 60);
  return viewer.scene.cartesianToCanvasCoordinates(cart);
}

function showMarkerActions(facilityId) {
  hideMarkerActions();
  holoActionsForId = facilityId;
  holoActionsEl = document.createElement('div');
  holoActionsEl.className = 'marker-actions';
  holoActionsEl.style.position = 'fixed';
  holoActionsEl.style.zIndex = '1200';
  holoActionsEl.innerHTML = `
    <button class="ma-btn ma-edit" onclick="window.editFacility('${facilityId}'); hideMarkerActions();">✏️ 수정</button>
    <button class="ma-btn ma-delete" onclick="window.deleteFacility('${facilityId}'); hideMarkerActions();">🗑️ 삭제</button>
  `;
  document.body.appendChild(holoActionsEl);
  positionMarkerActions();
  holoActionsPostRenderFn = () => positionMarkerActions();
  viewer.scene.postRender.addEventListener(holoActionsPostRenderFn);
}

function positionMarkerActions() {
  if (!holoActionsEl || !holoActionsForId) return;
  const pos = entityScreenPos(holoActionsForId, holoMode ? 60 : 2);
  if (!pos) return;
  holoActionsEl.style.left = pos.x + 'px';
  holoActionsEl.style.top = (pos.y + 24) + 'px';
  holoActionsEl.style.transform = 'translateX(-50%)';
}

function hideMarkerActions() {
  if (holoActionsPostRenderFn) {
    try { viewer.scene.postRender.removeEventListener(holoActionsPostRenderFn); } catch(e){}
    holoActionsPostRenderFn = null;
  }
  if (holoActionsEl) { holoActionsEl.remove(); holoActionsEl = null; }
  holoActionsForId = null;
}

// 빈 공간 클릭 시 액션 오버레이 숨김
document.addEventListener('click', (e) => {
  if (!holoActionsEl) return;
  if (holoActionsEl.contains(e.target)) return;
  // 지도 캔버스를 클릭했고 타겟이 다른 시설 마커면 계속, 아니면 숨김
  // 단순히 "다른 곳" 클릭이면 닫기로 처리 (시설 선택은 LEFT_CLICK으로 따로 처리됨)
});

const handler = viewer.screenSpaceEventHandler;

handler.setInputAction((event) => {
  const picked = viewer.scene.pick(event.position);
  if (picked && picked.id && picked.id.facilityId) {
    holoPressedId = picked.id.facilityId;
    if (holoPressTimer) clearTimeout(holoPressTimer);
    holoPressTimer = setTimeout(() => {
      holoPressTimer = null;
      if (!holoPressedId) return;
      // 롱프레스 → 드래그 모드 진입
      holoDragMode = true;
      viewer.scene.screenSpaceCameraController.enableInputs = false;
      document.body.style.cursor = 'grabbing';
      if (typeof showToast === 'function') {
        showToast('✋', `<strong>드래그 모드</strong> · 드래그해서 이동, 놓으면 저장`, 'info', 4000);
      }
      showMarkerActions(holoPressedId);
      if (navigator.vibrate) navigator.vibrate(30);
    }, HOLO_PRESS_MS);
  } else {
    holoPressedId = null;
    hideMarkerActions();
  }
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);

// 시설 hover 툴팁
let hoverTooltipEl = null;
let hoverLastId = null;
function ensureHoverTooltip() {
  if (hoverTooltipEl) return hoverTooltipEl;
  hoverTooltipEl = document.createElement('div');
  hoverTooltipEl.className = 'fac-hover-tooltip';
  hoverTooltipEl.style.display = 'none';
  document.body.appendChild(hoverTooltipEl);
  return hoverTooltipEl;
}
function showHoverTooltip(f, sx, sy) {
  const el = ensureHoverTooltip();
  const cfg = TYPE_CFG_3D[f.type] || { icon:'📍', color:'#94a3b8' };
  const typeLabel = {bench:'벤치',restroom:'화장실',exercise:'운동기구',light:'가로등',parking:'주차장',bin:'쓰레기통',cctv:'CCTV'}[f.type] || f.type;
  const hp = f.hp || 0;
  const hpC = hpColor3D(hp);
  const beamC = beamColor3D(hp);
  const pending = (typeof INSPECTIONS !== 'undefined' ? INSPECTIONS : []).filter(i => i.facilityId === f.id && i.status === 'pending').length;
  const repairs = (typeof REPAIRS !== 'undefined' ? REPAIRS : []).filter(r => r.facilityId === f.id && r.status !== 'done').length;
  const assignee = f.assigneeId && typeof getStaffById === 'function' ? getStaffById(f.assigneeId) : null;
  el.style.borderColor = beamC;
  el.innerHTML = `
    <div class="ft-head">
      <div class="ft-icon-wrap" style="border-color:${cfg.color}60;background:${cfg.color}22;">${cfg.icon}</div>
      <div class="ft-info">
        <div class="ft-name">${f.name}</div>
        <div class="ft-meta">${cfg.icon} ${typeLabel} · ${f.id} · ${f.zone || '-'}</div>
      </div>
      <div class="ft-hp mono" style="color:${hpC};text-shadow:0 0 8px ${hpC}88;">${hp}</div>
    </div>
    <div class="ft-hp-bar"><div style="width:${hp}%;background:linear-gradient(90deg,${hpC}cc,${hpC});box-shadow:0 0 6px ${hpC}88;"></div></div>
    <div class="ft-chips">
      ${pending ? `<span class="ft-chip ft-chip-warn">📋 점검 ${pending}</span>` : ''}
      ${repairs ? `<span class="ft-chip ft-chip-alert">🔧 수리 ${repairs}</span>` : ''}
      ${assignee ? `<span class="ft-chip ft-chip-info">${assignee.avatar} ${assignee.name}</span>` : ''}
      ${!pending && !repairs && !assignee ? `<span class="ft-chip ft-chip-ok">✓ 이상 없음</span>` : ''}
    </div>
    <div class="ft-foot">마지막 점검 · ${f.lastCheck || '-'}</div>
  `;
  el.style.display = 'block';
  // 포지셔닝
  const rect = el.getBoundingClientRect();
  let x = sx + 18;
  let y = sy - rect.height / 2;
  if (x + rect.width > window.innerWidth - 8) x = sx - rect.width - 18;
  if (y < 8) y = 8;
  if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}
function hideHoverTooltip() {
  if (hoverTooltipEl) hoverTooltipEl.style.display = 'none';
  hoverLastId = null;
}

handler.setInputAction((event) => {
  // 드래그 중이면 위치 이동 처리
  if (holoDragMode && holoPressedId) {
    const cart = viewer.camera.pickEllipsoid(event.endPosition, viewer.scene.globe.ellipsoid);
    if (!cart) return;
    const c = Cesium.Cartographic.fromCartesian(cart);
    const lng = Cesium.Math.toDegrees(c.longitude);
    const lat = Cesium.Math.toDegrees(c.latitude);
    const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === holoPressedId);
    if (!f) return;
    f.lat = lat;
    f.lng = lng;
    renderFacility3D(f);
    positionMarkerActions();
    return;
  }
  // 평소: hover 툴팁 갱신
  const picked = viewer.scene.pick(event.endPosition);
  if (picked && picked.id && picked.id.facilityId) {
    const fid = picked.id.facilityId;
    const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === fid);
    if (!f) { hideHoverTooltip(); return; }
    hoverLastId = fid;
    document.body.style.cursor = 'pointer';
    showHoverTooltip(f, event.endPosition.x, event.endPosition.y);
  } else {
    if (hoverLastId) hideHoverTooltip();
    if (!holoDragMode) document.body.style.cursor = '';
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

handler.setInputAction(() => {
  if (holoPressTimer) { clearTimeout(holoPressTimer); holoPressTimer = null; }
  if (holoDragMode) {
    const fid = holoPressedId;
    holoDragMode = false;
    viewer.scene.screenSpaceCameraController.enableInputs = true;
    document.body.style.cursor = '';
    holoJustDragged = true;
    setTimeout(() => { holoJustDragged = false; }, 120);
    if (typeof saveFacilities === 'function') saveFacilities();
    if (fid && typeof showToast === 'function') {
      const f = (typeof FACILITIES !== 'undefined' ? FACILITIES : []).find(x => x.id === fid);
      if (f) showToast('📍', `<strong>${f.name}</strong> 위치 이동 저장됨`, 'ok', 2500);
    }
  }
  holoPressedId = null;
}, Cesium.ScreenSpaceEventType.LEFT_UP);

// 공원 경계 그리기 프리뷰 (Cesium 시각화)
let drawPreviewLine = null;
let drawPreviewPoints = [];

function renderDrawingPreview() {
  // 기존 엔티티 정리
  if (drawPreviewLine) { viewer.entities.remove(drawPreviewLine); drawPreviewLine = null; }
  drawPreviewPoints.forEach(e => viewer.entities.remove(e));
  drawPreviewPoints = [];

  // ── 점 선택 삭제 모드 ──────────────────────────────────────────
  if (typeof vertexDeleteMode !== 'undefined' && vertexDeleteMode) {
    const boundary = typeof vertexDeleteBoundary !== 'undefined' ? vertexDeleteBoundary : [];
    boundary.forEach((poly, polyIdx) => {
      if (!poly || poly.length === 0) return;
      // 폴리곤 외곽선
      if (poly.length >= 2) {
        const flat = [];
        [...poly, poly[0]].forEach(p => flat.push(p[1], p[0]));
        drawPreviewPoints.push(viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(flat),
            width: 2.5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#f59e0b'),
              dashLength: 10,
            }),
            clampToGround: true,
          },
        }));
      }
      // 삭제 가능한 점들
      poly.forEach((pt, ptIdx) => {
        const e = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pt[1], pt[0]),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString('#ef4444'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `${ptIdx + 1}`,
            font: 'bold 10px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(12, -12),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          _vdPolyIdx: polyIdx,
          _vdPtIdx: ptIdx,
        });
        drawPreviewPoints.push(e);
      });
    });
    return;
  }

  // ── 공원 경계 그리기 / 이어 나가기 ────────────────────────────
  const drawing = (typeof parkDrawingMode !== 'undefined' && parkDrawingMode);
  if (!drawing) return;
  const pts = (typeof parkDrawingPoints !== 'undefined') ? parkDrawingPoints : [];
  if (pts.length === 0) return;

  const isExtend = typeof editingMode !== 'undefined' && editingMode === 'extend';
  const insertionIdx = typeof extendInsertionIdx !== 'undefined' ? extendInsertionIdx : -1;

  // 점 표시
  pts.forEach((pt, idx) => {
    const isInsertion = isExtend && idx === insertionIdx;
    const dotColor = isInsertion ? '#22c55e' : (isExtend ? '#60a5fa' : '#ef4444');
    const dotSize  = isInsertion ? 14 : 10;
    const e = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(pt[1], pt[0]),
      point: {
        pixelSize: dotSize,
        color: Cesium.Color.fromCssColorString(dotColor),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: isInsertion ? 3 : 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: isInsertion ? `▶ ${idx + 1}` : `${idx + 1}`,
        font: isInsertion ? 'bold 11px monospace' : 'bold 10px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(13, -11),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      _extendPointIdx: isExtend ? idx : undefined,
    });
    drawPreviewPoints.push(e);
  });

  // 선 표시 (2점 이상)
  if (pts.length >= 2) {
    const flat = [];
    pts.forEach(pt => flat.push(pt[1], pt[0]));
    const lineColor = isExtend ? '#60a5fa' : '#ef4444';
    drawPreviewLine = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(flat),
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(lineColor),
          dashLength: 12,
        }),
        clampToGround: true,
      },
    });
  }
}

// exitParkCreation 훅: 종료 시 프리뷰도 정리
const _origExitParkCreation = window.exitParkCreation;
window.exitParkCreation = function() {
  if (typeof _origExitParkCreation === 'function') _origExitParkCreation();
  renderDrawingPreview();
};
const _origFinishParkCreation = window.finishParkCreation;
window.finishParkCreation = function() {
  if (typeof _origFinishParkCreation === 'function') _origFinishParkCreation();
  renderDrawingPreview();
};

// renderParkOutline 훅: Leaflet 경계 갱신 시 Cesium도 함께 갱신
const _origRenderParkOutline = window.renderParkOutline;
window.renderParkOutline = function() {
  if (typeof _origRenderParkOutline === 'function') _origRenderParkOutline();
  render3DBoundary();
};

// ── vertexDelete 실시간 boundary 업데이트 헬퍼 ──────────────
let _vdOriginalBoundary = null; // 취소 시 원복용 백업
let _vdFinishing = false;       // finishVertexDelete 구분 플래그

function _vdApplyLiveBoundary() {
  const vdParkId = typeof vertexDeleteParkId !== 'undefined' ? vertexDeleteParkId : null;
  if (!vdParkId) return;
  const park = (typeof PARKS !== 'undefined' ? PARKS : []).find(p => p.id === vdParkId);
  if (!park) return;
  const vdBoundary = typeof vertexDeleteBoundary !== 'undefined' ? vertexDeleteBoundary : [];
  park.boundary = vdBoundary.map(p => p.slice());
  if (park.id === (typeof currentParkId !== 'undefined' ? currentParkId : null)) {
    PARK_BOUNDARY = park.boundary;
  }
  render3DBoundary();
}

function _vdRestoreOriginalBoundary(savedParkId) {
  if (!_vdOriginalBoundary || !savedParkId) return;
  const park = (typeof PARKS !== 'undefined' ? PARKS : []).find(p => p.id === savedParkId);
  if (!park) return;
  park.boundary = _vdOriginalBoundary;
  if (park.id === (typeof currentParkId !== 'undefined' ? currentParkId : null)) {
    PARK_BOUNDARY = park.boundary;
  }
  render3DBoundary();
}

// startVertexDelete 훅: 시작 전 백업 + Cesium 렌더
const _origStartVertexDelete = window.startVertexDelete;
if (typeof _origStartVertexDelete === 'function') {
  window.startVertexDelete = function(parkId) {
    const park = (typeof PARKS !== 'undefined' ? PARKS : []).find(p => p.id === parkId);
    _vdOriginalBoundary = park ? park.boundary.map(p => p.map(pt => [pt[0], pt[1]])) : null;
    _vdFinishing = false;
    _origStartVertexDelete(parkId);
    setTimeout(renderDrawingPreview, 50);
  };
}

// finishVertexDelete 훅: 완료 플래그 세팅 후 원본 호출 (저장 완료 후 갱신)
const _origFinishVertexDelete = window.finishVertexDelete;
if (typeof _origFinishVertexDelete === 'function') {
  window.finishVertexDelete = function() {
    _vdFinishing = true;
    _origFinishVertexDelete();
    _vdOriginalBoundary = null;
    renderDrawingPreview();
    render3DBoundary();
  };
}

// exitVertexDelete 훅: 취소면 원복, 완료면 이미 처리됨
const _origExitVertexDelete = window.exitVertexDelete;
if (typeof _origExitVertexDelete === 'function') {
  window.exitVertexDelete = function() {
    const savedParkId = typeof vertexDeleteParkId !== 'undefined' ? vertexDeleteParkId : null;
    const isCancelling = !_vdFinishing;
    _vdFinishing = false;
    _origExitVertexDelete();
    if (isCancelling) {
      _vdRestoreOriginalBoundary(savedParkId);
      _vdOriginalBoundary = null;
    }
    renderDrawingPreview();
  };
}

// renderVertexDeletion 훅: Leaflet 재렌더 시 Cesium 동기화 (보조)
const _origRenderVertexDeletion = window.renderVertexDeletion;
if (typeof _origRenderVertexDeletion === 'function') {
  window.renderVertexDeletion = function() {
    _origRenderVertexDeletion();
    renderDrawingPreview();
  };
}

// startExtendPolygon 훅: 이어 나가기 시작 시 Cesium 렌더
const _origStartExtendPolygon = window.startExtendPolygon;
if (typeof _origStartExtendPolygon === 'function') {
  window.startExtendPolygon = function(parkId, polyIdx) {
    _origStartExtendPolygon(parkId, polyIdx);
    setTimeout(renderDrawingPreview, 50);
  };
}

// renderExtendState 훅: 삽입점 변경 시 Cesium 동기화
const _origRenderExtendState = window.renderExtendState;
if (typeof _origRenderExtendState === 'function') {
  window.renderExtendState = function() {
    _origRenderExtendState();
    renderDrawingPreview();
  };
}

// 짧은 클릭 → 그리기/삭제 모드 우선, 아니면 selectFacility
handler.setInputAction((click) => {
  if (holoJustDragged) return;

  const picked = viewer.scene.pick(click.position);

  // ── 점 선택 삭제 모드 ──────────────────────────────────────────
  if (typeof vertexDeleteMode !== 'undefined' && vertexDeleteMode) {
    if (picked && picked.id && picked.id._vdPolyIdx != null) {
      const polyIdx = picked.id._vdPolyIdx;
      const ptIdx   = picked.id._vdPtIdx;
      const boundary = typeof vertexDeleteBoundary !== 'undefined' ? vertexDeleteBoundary : [];
      const poly = boundary[polyIdx];
      if (!poly) return;
      if (poly.length <= 3) {
        if (boundary.length > 1) {
          if (confirm(`이 영역(${polyIdx + 1}번)을 전체 삭제할까요?`)) {
            boundary.splice(polyIdx, 1);
            if (typeof updateVertexCount === 'function') updateVertexCount();
            _vdApplyLiveBoundary();
            renderDrawingPreview();
          }
        } else {
          if (typeof showToast === 'function') showToast('⚠️', '각 영역은 최소 3점이 필요합니다', 'warn', 2500);
        }
      } else {
        poly.splice(ptIdx, 1);
        if (typeof updateVertexCount === 'function') updateVertexCount();
        _vdApplyLiveBoundary();
        renderDrawingPreview();
      }
    }
    return;
  }

  // ── 경계 그리기 모드 ──────────────────────────────────────────
  if (typeof parkDrawingMode !== 'undefined' && parkDrawingMode) {
    // extend 모드: 점 클릭이면 삽입점 변경
    if (typeof editingMode !== 'undefined' && editingMode === 'extend') {
      if (picked && picked.id && picked.id._extendPointIdx != null) {
        extendInsertionIdx = picked.id._extendPointIdx;
        renderDrawingPreview();
        return;
      }
    }
    // 지도 클릭 → 점 추가
    const cart = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (!cart) return;
    const c = Cesium.Cartographic.fromCartesian(cart);
    const latlng = {
      lat: Cesium.Math.toDegrees(c.latitude),
      lng: Cesium.Math.toDegrees(c.longitude),
    };
    if (typeof handleParkDrawingClick === 'function') {
      handleParkDrawingClick(latlng);
      renderDrawingPreview();
    }
    return;
  }

  // ── 시설물 배치 모드 ──────────────────────────────────────────
  if (typeof addMode !== 'undefined' && addMode) {
    const cart = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (!cart) return;
    const c = Cesium.Cartographic.fromCartesian(cart);
    const lat = Cesium.Math.toDegrees(c.latitude);
    const lng = Cesium.Math.toDegrees(c.longitude);
    // app.js의 시설 추가 로직 재사용
    const cfg = (typeof TYPE_CFG !== 'undefined') ? TYPE_CFG[addMode] : null;
    if (!cfg) return;
    const today = new Date().toISOString().slice(0, 10);
    const prefix = (typeof ID_PREFIX !== 'undefined') ? ID_PREFIX[addMode] : addMode.slice(0,2).toUpperCase();
    const seq = String((typeof FACILITIES !== 'undefined' ? FACILITIES : []).filter(f => f.type === addMode).length + 1).padStart(3, '0');
    const newFacility = {
      id: `${prefix}${seq}-${String(Date.now()).slice(-3)}`,
      name: `신규 ${cfg.label}`,
      type: addMode,
      zone: '기타',
      hp: 100,
      maxHp: 100,
      installed: today,
      lastCheck: today,
      lat,
      lng,
    };
    if (typeof FACILITIES !== 'undefined') FACILITIES.push(newFacility);
    if (typeof saveFacilities === 'function') saveFacilities();
    if (typeof exitAddMode === 'function') exitAddMode();
    if (typeof refreshAll === 'function') refreshAll();
    return;
  }

  // ── 시설물 선택 ───────────────────────────────────────────────
  if (picked && picked.id && picked.id.facilityId) {
    if (holoActionsEl && holoActionsForId !== picked.id.facilityId) hideMarkerActions();
    window.selectFacility(picked.id.facilityId);
  } else {
    hideMarkerActions();
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 더블클릭 → 그리기 완성
handler.setInputAction(() => {
  if (typeof parkDrawingMode !== 'undefined' && parkDrawingMode) {
    if (typeof finishParkCreation === 'function') finishParkCreation();
  }
}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

// ================= 카메라 프리셋 =================
function flyOverview() {
  const park = getCurrentPark();
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(park.center[1], park.center[0] - 0.006, 1500),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
    duration: 1.4,
  });
}
function flyTop() {
  const park = getCurrentPark();
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(park.center[1], park.center[0], 2000),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-89), roll: 0 },
    duration: 1.2,
  });
}
function flyTilted() {
  const park = getCurrentPark();
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(park.center[1], park.center[0] - 0.008, 1200),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
    duration: 1.6,
  });
}

function toggleHolo() {
  holoMode = !holoMode;
  render3DBoundary();
  render3DAllMarkers(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
  applyHoloTone();
  const btn = document.getElementById('lyr-holo');
  if (btn) btn.classList.toggle('active', holoMode);
}

// 초기 렌더: app.js 초기화 직후 한 번 더
setTimeout(() => {
  render3DBoundary();
  render3DAllMarkers('all');
  applyHoloTone();
  flyOverview();
}, 300);
