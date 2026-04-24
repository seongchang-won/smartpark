// ===== PARK SYSTEM =====
const TAEHWA_BOUNDARY = [
  [35.5520, 129.2905], [35.5522, 129.2945], [35.5515, 129.2985],
  [35.5500, 129.3028], [35.5480, 129.3048], [35.5455, 129.3042],
  [35.5440, 129.3015], [35.5432, 129.2975], [35.5438, 129.2935],
  [35.5455, 129.2905], [35.5482, 129.2892], [35.5505, 129.2895],
];
const TAEHWA_ZONES = [
  { id: 'parking',   name: '주차장',   lat: 35.5511, lng: 129.2920, capacity: 200, polygon: [[35.5518,129.2910],[35.5520,129.2932],[35.5508,129.2932],[35.5503,129.2920],[35.5508,129.2908]] },
  { id: 'bamboo',    name: '대나무숲', lat: 35.5493, lng: 129.2935, capacity: 300, polygon: [[35.5505,129.2925],[35.5505,129.2948],[35.5485,129.2952],[35.5480,129.2942],[35.5482,129.2925],[35.5493,129.2918]] },
  { id: 'wetland',   name: '생태습지', lat: 35.5503, lng: 129.2958, capacity: 250, polygon: [[35.5513,129.2950],[35.5513,129.2972],[35.5498,129.2975],[35.5493,129.2965],[35.5498,129.2950]] },
  { id: 'tenri',     name: '십리대밭', lat: 35.5480, lng: 129.3000, capacity: 400, polygon: [[35.5495,129.2980],[35.5500,129.3018],[35.5475,129.3028],[35.5462,129.3010],[35.5468,129.2985],[35.5480,129.2978]] },
  { id: 'health',    name: '건강마당', lat: 35.5473, lng: 129.2983, capacity: 150, polygon: [[35.5480,129.2975],[35.5480,129.2995],[35.5467,129.2998],[35.5463,129.2988],[35.5470,129.2975]] },
  { id: 'waterside', name: '수변광장', lat: 35.5460, lng: 129.2958, capacity: 500, polygon: [[35.5470,129.2938],[35.5472,129.2975],[35.5455,129.2978],[35.5445,129.2965],[35.5448,129.2940],[35.5460,129.2935]] },
];
const DEFAULT_PARK = {
  id: 'taehwa-nat',
  name: '태화강국가정원',
  center: [35.5478, 129.2962],
  zoom: 16,
  // 다중 폴리곤 지원: boundary는 폴리곤 배열
  boundary: [TAEHWA_BOUNDARY],
  zones: TAEHWA_ZONES,
};

// 기존 단일 폴리곤 형식 -> 다중 폴리곤 형식으로 정규화
function normalizePark(park) {
  if (!park.boundary) { park.boundary = []; return; }
  if (park.boundary.length === 0) return;
  // boundary[0]이 [lat,lng] (숫자)면 단일 폴리곤이므로 래핑
  if (typeof park.boundary[0][0] === 'number') {
    park.boundary = [park.boundary];
  }
}

const PARKS_LIST_KEY = 'parks-list';
const CURRENT_PARK_KEY = 'current-park-id';
const MIGRATION_FLAG_KEY = 'parks-migrated-v1';

function clonePark(p) { return JSON.parse(JSON.stringify(p)); }

function loadParks() {
  try {
    const raw = localStorage.getItem(PARKS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [clonePark(DEFAULT_PARK)];
}

function saveParks() {
  try { localStorage.setItem(PARKS_LIST_KEY, JSON.stringify(PARKS)); } catch (e) {}
}

// 기존 v3 데이터 → 태화강 공원으로 마이그레이션
function migrateOldStorage() {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;
  const pid = DEFAULT_PARK.id;
  const migrations = [
    ['taehwagang-facilities-v3',  `park-${pid}-facilities`],
    ['taehwagang-inspections-v2', `park-${pid}-inspections`],
    ['taehwagang-repairs-v2',     `park-${pid}-repairs`],
    ['taehwagang-zones-v2',       `park-${pid}-zones`],
  ];
  migrations.forEach(([from, to]) => {
    const val = localStorage.getItem(from);
    if (val && !localStorage.getItem(to)) localStorage.setItem(to, val);
  });
  localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}
migrateOldStorage();

let PARKS = loadParks();
PARKS.forEach(normalizePark);
if (!PARKS.find(p => p.id === DEFAULT_PARK.id)) {
  PARKS.unshift(clonePark(DEFAULT_PARK));
  saveParks();
}

let currentParkId = localStorage.getItem(CURRENT_PARK_KEY) || DEFAULT_PARK.id;
if (!PARKS.find(p => p.id === currentParkId)) currentParkId = PARKS[0].id;

function getCurrentPark() { return PARKS.find(p => p.id === currentParkId) || PARKS[0]; }

// ===== 담당자(STAFF) =====
const STAFF_KEY = 'staff-list';
const DEFAULT_STAFF = [
  { id: 's1', name: '김현장', avatar: '👷', role: '현장반장',  phone: '010-1234-5678', dept: '시설관리과' },
  { id: 's2', name: '박정비', avatar: '🔧', role: '시설정비',  phone: '010-2345-6789', dept: '시설관리과' },
  { id: 's3', name: '이전기', avatar: '⚡', role: '전기담당',  phone: '010-3456-7890', dept: '시설관리과' },
  { id: 's4', name: '최청소', avatar: '🧹', role: '환경미화',  phone: '010-4567-8901', dept: '환경관리과' },
  { id: 's5', name: '정안전', avatar: '🛡️', role: '안전관리',  phone: '010-5678-9012', dept: '안전관리과' },
];

function loadStaff() {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_STAFF.map(s => ({ ...s }));
}
function saveStaff() {
  try { localStorage.setItem(STAFF_KEY, JSON.stringify(STAFF)); } catch (e) {}
}
const STAFF = loadStaff();
function getStaffById(id) { return STAFF.find(s => s.id === id); }

function keyFacilities()  { return `park-${currentParkId}-facilities`;  }
function keyInspections() { return `park-${currentParkId}-inspections`; }
function keyRepairs()     { return `park-${currentParkId}-repairs`;     }
function keyZones()       { return `park-${currentParkId}-zones`;       }

// ===== DATA =====

function loadFacilities() {
  try {
    const raw = localStorage.getItem(keyFacilities());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(f => { if (!Array.isArray(f.events)) f.events = []; });
        return parsed;
      }
    }
  } catch (e) {}
  // 기본 공원만 샘플 시설 시드, 신규 공원은 빈 배열
  if (currentParkId === DEFAULT_PARK.id) {
    return DEFAULT_FACILITIES.map(f => ({ ...f, events: [] }));
  }
  return [];
}

function saveFacilities() {
  try { localStorage.setItem(keyFacilities(), JSON.stringify(FACILITIES)); } catch (e) {}
}

function resetFacilities() {
  try { localStorage.removeItem(keyFacilities()); } catch (e) {}
  location.reload();
}

const DEFAULT_FACILITIES = [
  { id:"B001", name:"대나무숲 벤치 A", type:"bench", zone:"대나무숲", hp:92, maxHp:100, installed:"2023-03-15", lastCheck:"2026-04-18", lat:35.5492, lng:129.2928, temp:24, humidity:62 },
  { id:"B002", name:"생태습지 벤치 B", type:"bench", zone:"생태습지", hp:67, maxHp:100, installed:"2022-06-01", lastCheck:"2026-04-15", lat:35.5503, lng:129.2955, temp:23, humidity:68 },
  { id:"B003", name:"십리대밭 벤치 C", type:"bench", zone:"십리대밭", hp:31, maxHp:100, installed:"2021-04-10", lastCheck:"2026-04-10", lat:35.5478, lng:129.3005, temp:25, humidity:58 },
  { id:"B004", name:"수변광장 벤치 D", type:"bench", zone:"수변광장", hp:8, maxHp:100, installed:"2020-09-20", lastCheck:"2026-04-05", lat:35.5460, lng:129.2945, temp:22, humidity:71 },
  { id:"T001", name:"대나무숲 화장실", type:"restroom", zone:"대나무숲", hp:85, maxHp:100, installed:"2023-01-10", lastCheck:"2026-04-19", lat:35.5488, lng:129.2935, temp:21, humidity:55 },
  { id:"T002", name:"십리대밭 화장실", type:"restroom", zone:"십리대밭", hp:45, maxHp:100, installed:"2021-08-15", lastCheck:"2026-04-12", lat:35.5475, lng:129.2995, temp:22, humidity:60 },
  { id:"T003", name:"수변광장 화장실", type:"restroom", zone:"수변광장", hp:73, maxHp:100, installed:"2022-03-01", lastCheck:"2026-04-17", lat:35.5462, lng:129.2960, temp:23, humidity:58 },
  { id:"E001", name:"건강마당 철봉", type:"exercise", zone:"건강마당", hp:58, maxHp:100, installed:"2022-01-20", lastCheck:"2026-04-14", lat:35.5470, lng:129.2978, temp:25, humidity:55 },
  { id:"E002", name:"건강마당 런닝머신", type:"exercise", zone:"건강마당", hp:12, maxHp:100, installed:"2020-11-05", lastCheck:"2026-04-08", lat:35.5468, lng:129.2982, temp:25, humidity:55 },
  { id:"E003", name:"생태습지 스트레칭존", type:"exercise", zone:"생태습지", hp:88, maxHp:100, installed:"2023-05-01", lastCheck:"2026-04-19", lat:35.5498, lng:129.2950, temp:24, humidity:65 },
  { id:"L001", name:"대나무숲 스마트가로등", type:"light", zone:"대나무숲", hp:95, maxHp:100, installed:"2024-01-15", lastCheck:"2026-04-20", lat:35.5495, lng:129.2932, temp:null, humidity:null },
  { id:"L002", name:"십리대밭 스마트가로등", type:"light", zone:"십리대밭", hp:42, maxHp:100, installed:"2022-07-01", lastCheck:"2026-04-11", lat:35.5480, lng:129.3010, temp:null, humidity:null },
  { id:"L003", name:"수변광장 스마트가로등", type:"light", zone:"수변광장", hp:76, maxHp:100, installed:"2023-02-20", lastCheck:"2026-04-16", lat:35.5458, lng:129.2952, temp:null, humidity:null },
  { id:"P001", name:"주차장 A구역", type:"parking", zone:"주차장", hp:100, maxHp:100, installed:"2023-06-01", lastCheck:"2026-04-20", lat:35.5510, lng:129.2920, spots:45, occupied:32 },
  { id:"W001", name:"대나무숲 스마트쓰레기통", type:"bin", zone:"대나무숲", hp:70, maxHp:100, installed:"2023-09-01", lastCheck:"2026-04-18", lat:35.5490, lng:129.2940, fillLevel:72 },
  { id:"W002", name:"수변광장 스마트쓰레기통", type:"bin", zone:"수변광장", hp:25, maxHp:100, installed:"2021-12-01", lastCheck:"2026-04-09", lat:35.5455, lng:129.2958, fillLevel:91 },
  { id:"C001", name:"대나무숲 CCTV-01", type:"cctv", zone:"대나무숲", hp:98, maxHp:100, installed:"2024-02-01", lastCheck:"2026-04-20", lat:35.5498, lng:129.2938, resolution:"4K UHD", model:"Axis P3727-PLE", fov:180, preset:"park-day" },
  { id:"C002", name:"십리대밭 CCTV-02", type:"cctv", zone:"십리대밭", hp:92, maxHp:100, installed:"2024-02-01", lastCheck:"2026-04-19", lat:35.5482, lng:129.3000, resolution:"1080p FHD", model:"Hanwha PNM-9320VQP", fov:360, preset:"forest" },
  { id:"C003", name:"수변광장 CCTV-03", type:"cctv", zone:"수변광장", hp:85, maxHp:100, installed:"2023-09-15", lastCheck:"2026-04-18", lat:35.5463, lng:129.2956, resolution:"4K UHD", model:"Axis P3727-PLE", fov:120, preset:"plaza" },
  { id:"C004", name:"주차장 CCTV-04", type:"cctv", zone:"주차장", hp:78, maxHp:100, installed:"2023-03-01", lastCheck:"2026-04-12", lat:35.5512, lng:129.2925, resolution:"1080p FHD", model:"Hanwha QNV-8011R", fov:90, preset:"parking-night" },
];

let FACILITIES = loadFacilities();

const TYPE_CFG = {
  bench:    { icon:"🪑", label:"벤치",         color:"#8B6914", markerColor:"#D4A017" },
  restroom: { icon:"🚻", label:"화장실",       color:"#4A90D9", markerColor:"#5DADE2" },
  exercise: { icon:"🏋️", label:"운동기구",     color:"#D94A7A", markerColor:"#EC7063" },
  light:    { icon:"💡", label:"스마트가로등",  color:"#F5A623", markerColor:"#F5B041" },
  parking:  { icon:"🅿️", label:"주차장",       color:"#7B68EE", markerColor:"#A569BD" },
  bin:      { icon:"🗑️", label:"스마트쓰레기통", color:"#2ECC71", markerColor:"#58D68D" },
  cctv:     { icon:"📹", label:"CCTV",          color:"#06B6D4", markerColor:"#22D3EE" },
};

function hpColor(hp) {
  if (hp > 80) return "#22c55e";
  if (hp > 50) return "#84cc16";
  if (hp > 30) return "#f59e0b";
  if (hp > 10) return "#f97316";
  return "#ef4444";
}
function hpGrade(hp) {
  if (hp > 80) return "양호";
  if (hp > 50) return "주의";
  if (hp > 30) return "경고";
  if (hp > 10) return "위험";
  return "교체필요";
}
function hpSeverity(hp) {
  if (hp > 50) return "caution";
  if (hp > 30) return "warning";
  if (hp > 10) return "danger";
  return "critical";
}
function daysUntilReplace(hp) {
  if (hp <= 10) return "즉시 교체";
  return `약 ${Math.round((hp / 100) * 365)}일 후`;
}

// ===== EVENTS =====
function ensureEvents(f) {
  if (!Array.isArray(f.events)) f.events = [];
}

function applyHpDelta(f, delta) {
  f.hp = Math.max(0, Math.min(f.maxHp || 100, f.hp + delta));
}

function pushEvent(f, src, kind, hpDelta, note) {
  ensureEvents(f);
  f.events.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    src, kind, hpDelta,
    note: note || '',
    ts: Date.now(),
  });
  if (f.events.length > 30) f.events.length = 30;
  if (hpDelta !== 0) applyHpDelta(f, hpDelta);
}

function formatRelTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ===== MAP INIT =====
const map = L.map('map', {
  center: getCurrentPark().center,
  zoom: getCurrentPark().zoom || 16,
  zoomControl: false,
  attributionControl: false,
  zoomDelta: 1,
  zoomSnap: 1,
  wheelDebounceTime: 120,
  wheelPxPerZoomLevel: 120,
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

// 공원 그리기 모드에서 더블클릭으로 폴리곤 완성
map.on('dblclick', (e) => {
  if (parkDrawingMode) {
    L.DomEvent.stopPropagation(e);
    finishParkCreation();
  }
});

// Custom wheel zoom: 1 step per wheel event regardless of deltaY magnitude
map.scrollWheelZoom.disable();
let wheelLocked = false;
map.getContainer().addEventListener('wheel', (e) => {
  e.preventDefault();
  if (activeMarker || wheelLocked) return;
  if (e.deltaY === 0) return;
  wheelLocked = true;
  setTimeout(() => { wheelLocked = false; }, 180);
  if (e.deltaY < 0) map.zoomIn(1);
  else map.zoomOut(1);
}, { passive: false });

// Tile layer (managed by theme)
const THEME_KEY = 'taehwagang-theme';
let tileLayer = null;

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';

  const tileUrl = isLight
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  applyTheme(isLight ? 'dark' : 'light');
}

function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; }
  catch (e) { return 'light'; }
}

applyTheme(loadTheme());

// Attribution
L.control.attribution({ position: 'bottomright', prefix: false })
  .addAttribution('© <a href="https://carto.com/">CARTO</a> | © <a href="https://www.openstreetmap.org/">OSM</a>')
  .addTo(map);

// ===== MARKERS =====
let markers = {};
let selectedId = null;
let currentFilter = 'all';
let addMode = null;
let activeMarker = null;
let actionsOverlay = null;
const LONG_PRESS_MS = 500;

// ===== TOAST =====
function injectToastStack() {
  if (document.getElementById('toastStack')) return;
  const el = document.createElement('div');
  el.id = 'toastStack';
  el.className = 'toast-stack';
  document.body.appendChild(el);
}

function showToast(icon, msg, level = 'info', duration = 3800) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const t = document.createElement('div');
  t.className = `toast level-${level}`;
  t.innerHTML = `<span class="t-icon">${icon}</span><span class="t-body">${msg}</span>`;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade');
    setTimeout(() => t.remove(), 340);
  }, duration);
}

function freezeMap() {
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();
  if (map.tapHold) map.tapHold.disable();
}
function unfreezeMap() {
  map.dragging.enable();
  map.touchZoom.enable();
  map.doubleClickZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
  if (map.tapHold) map.tapHold.enable();
}

function showActions(facilityId) {
  hideActions();
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  const overlay = document.createElement('div');
  overlay.className = 'marker-actions';
  overlay.innerHTML = `
    <button class="ma-btn ma-edit" onclick="editFacility('${f.id}')">✏️ 수정</button>
    <button class="ma-btn ma-delete" onclick="deleteFacility('${f.id}')">🗑️ 삭제</button>
  `;
  L.DomEvent.disableClickPropagation(overlay);
  map.getContainer().appendChild(overlay);
  actionsOverlay = { el: overlay, id: f.id };
  updateActionsPosition();
  map.on('move zoom', updateActionsPosition);
}

function hideActions() {
  if (!actionsOverlay) return;
  actionsOverlay.el.remove();
  actionsOverlay = null;
  map.off('move zoom', updateActionsPosition);
}

function updateActionsPosition() {
  if (!actionsOverlay) return;
  const f = FACILITIES.find(x => x.id === actionsOverlay.id);
  if (!f) { hideActions(); return; }
  const pt = map.latLngToContainerPoint([f.lat, f.lng]);
  actionsOverlay.el.style.left = pt.x + 'px';
  actionsOverlay.el.style.top = (pt.y + 34) + 'px';
}

function exitDragMode() {
  if (activeMarker) {
    try {
      activeMarker.dragging.disable();
      const el = activeMarker.getElement();
      if (el) el.classList.remove('marker-dragging');
    } catch (e) {}
    activeMarker = null;
  }
  unfreezeMap();
  hideActions();
}

function editFacility(id) {
  const f = FACILITIES.find(x => x.id === id);
  if (!f) return;
  const newName = prompt('시설물 이름', f.name);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) return;
  f.name = trimmed;
  saveFacilities();
  exitDragMode();
  refreshAll();
  if (selectedId === id) selectFacility(id);
}

function deleteFacility(id) {
  const f = FACILITIES.find(x => x.id === id);
  if (!f) return;
  if (!confirm(`'${f.name}'을(를) 삭제할까요?`)) return;
  const idx = FACILITIES.findIndex(x => x.id === id);
  if (idx >= 0) FACILITIES.splice(idx, 1);
  saveFacilities();
  exitDragMode();
  if (selectedId === id) clearSelection();
  refreshAll();
}

// ===== QR REPORT MODAL =====
const REPORT_ISSUES = [
  { id: 'damage', label: '파손',    icon: '🔨' },
  { id: 'dirty',  label: '오염',    icon: '🧹' },
  { id: 'broken', label: '고장',    icon: '⚠️' },
  { id: 'safety', label: '안전위험', icon: '🚨' },
];
const REPORT_SEV = [
  { id: 1, label: '경미', cls: 'sev-1', delta: -5  },
  { id: 2, label: '보통', cls: 'sev-2', delta: -15 },
  { id: 3, label: '심각', cls: 'sev-3', delta: -30 },
];
let reportState = { id: null, issue: null, sev: null };

function injectReportModal() {
  if (document.getElementById('reportModal')) return;
  const el = document.createElement('div');
  el.id = 'reportModal';
  el.className = 'report-modal hidden';
  el.innerHTML = `
    <div class="report-card">
      <div class="report-head">
        <div class="report-qr">📲</div>
        <div>
          <div class="t" id="reportTitle">시설 상태 제보</div>
          <div class="s" id="reportSubtitle">현재 상태를 알려주세요</div>
        </div>
      </div>
      <div class="report-section">
        <label>문제 유형</label>
        <div class="chip-group" id="issueChips"></div>
      </div>
      <div class="report-section">
        <label>심각도</label>
        <div class="chip-group" id="sevChips"></div>
      </div>
      <div class="report-section">
        <label>추가 메모 (선택)</label>
        <textarea class="report-note" id="reportNote" rows="2" placeholder="상세 내용을 입력하세요..."></textarea>
      </div>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="closeReportModal()" style="flex:1;padding:9px 0;">취소</button>
        <button class="action-btn submit" id="reportSubmit" onclick="submitReport()" style="flex:2;padding:9px 0;" disabled>제보 제출</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeReportModal(); });
}

function openReportModal(id) {
  const f = FACILITIES.find(x => x.id === id);
  if (!f) return;
  reportState = { id, issue: null, sev: null };
  const cfg = TYPE_CFG[f.type];
  document.getElementById('reportModal').classList.remove('hidden');
  document.getElementById('reportTitle').textContent = `${cfg.icon} ${f.name}`;
  document.getElementById('reportSubtitle').textContent = `${f.id} · ${f.zone} 상태 제보`;
  document.getElementById('reportNote').value = '';
  document.getElementById('issueChips').innerHTML = REPORT_ISSUES.map(iss =>
    `<button class="chip" data-issue="${iss.id}" onclick="pickIssue('${iss.id}')">${iss.icon} ${iss.label}</button>`
  ).join('');
  document.getElementById('sevChips').innerHTML = REPORT_SEV.map(s =>
    `<button class="chip ${s.cls}" data-sev="${s.id}" onclick="pickSev(${s.id})">${s.label} (HP ${s.delta})</button>`
  ).join('');
  updateSubmitBtn();
}

function pickIssue(id) {
  reportState.issue = id;
  document.querySelectorAll('#issueChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.issue === id)
  );
  updateSubmitBtn();
}

function pickSev(id) {
  reportState.sev = id;
  document.querySelectorAll('#sevChips .chip').forEach(c =>
    c.classList.toggle('active', +c.dataset.sev === id)
  );
  updateSubmitBtn();
}

function updateSubmitBtn() {
  const btn = document.getElementById('reportSubmit');
  if (btn) btn.disabled = !(reportState.issue && reportState.sev);
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
}

function submitReport() {
  const f = FACILITIES.find(x => x.id === reportState.id);
  if (!f || !reportState.issue || !reportState.sev) return;
  const iss = REPORT_ISSUES.find(x => x.id === reportState.issue);
  const sev = REPORT_SEV.find(x => x.id === reportState.sev);
  const note = (document.getElementById('reportNote').value || '').trim();
  pushEvent(f, 'report', `${iss.icon} ${iss.label}`, sev.delta, note);
  f.lastCheck = new Date().toISOString().slice(0, 10);
  saveFacilities();
  addInspection(f.id, `${iss.icon} ${iss.label}`, sev.id, note);
  closeReportModal();
  const toastIcon = sev.id === 3 ? '🚨' : sev.id === 2 ? '⚠️' : 'ℹ️';
  const toastLevel = sev.id === 3 ? 'alert' : sev.id === 2 ? 'warn' : 'ok';
  showToast(toastIcon, `<strong>${f.name}</strong> 제보 접수 · 점검 요청 등록`, toastLevel);
  refreshAll();
  if (selectedId === f.id) selectFacility(f.id);
}

function createMarkerIcon(facility) {
  const hp = facility.hp;
  const color = hpColor(hp);
  const cfg = TYPE_CFG[facility.type];
  const size = 36;
  const pulse = hp <= 30;

  const html = `
    <div style="position:relative; width:${size}px; height:${size+12}px;">
      ${pulse ? `<div style="position:absolute; top:0; left:0; width:${size}px; height:${size}px;
        border-radius:50%; border:2px solid ${color}60; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
      <div class="drag-ring" style="position:absolute; top:-6px; left:-6px;
        width:${size+12}px; height:${size+12}px; border-radius:50%;
        border:3px solid #ef4444; pointer-events:none; display:none;"></div>
      <div style="width:${size}px; height:${size}px; border-radius:50%;
        background: ${color}25; border: 2px solid ${color};
        display:flex; align-items:center; justify-content:center;
        font-size:16px; box-shadow: 0 0 ${pulse?12:6}px ${color}${pulse?'80':'40'};
        transition: all 0.3s;">
        ${cfg.icon}
      </div>
      <div style="width:${size-6}px; height:4px; background:#1e293b; border-radius:2px;
        margin:3px auto 0; overflow:hidden;">
        <div style="width:${hp}%; height:100%; background:${color}; border-radius:2px;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: '',
    iconSize: [size, size + 12],
    iconAnchor: [size/2, size/2],
  });
}

function addMarkers(filter) {
  exitDragMode();
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  // 혼잡도 모드에서는 시설 마커 모두 숨김
  if (densityVisible) return;

  const list = filter === 'all' ? FACILITIES
    : filter === 'alert' ? FACILITIES.filter(f => f.hp <= 30)
    : FACILITIES.filter(f => f.type === filter);

  list.forEach(f => {
    const marker = L.marker([f.lat, f.lng], { icon: createMarkerIcon(f), draggable: true }).addTo(map);
    marker.dragging.disable();

    let pressTimer = null;
    let didDrag = false;
    let longPressActivated = false;

    const cancelPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };

    marker.on('mousedown', () => {
      longPressActivated = false;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        longPressActivated = true;
        if (activeMarker && activeMarker !== marker) exitDragMode();
        activeMarker = marker;
        marker.dragging.enable();
        marker.closePopup();
        freezeMap();
        const el = marker.getElement();
        if (el) el.classList.add('marker-dragging');
        if (navigator.vibrate) navigator.vibrate(30);
        showActions(f.id);
      }, LONG_PRESS_MS);
    });
    marker.on('mouseup', cancelPress);

    marker.on('dragstart', () => {
      didDrag = true;
      longPressActivated = false;
      hideActions();
    });
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      f.lat = ll.lat;
      f.lng = ll.lng;
      saveFacilities();
      setTimeout(() => { didDrag = false; }, 50);
      exitDragMode();
    });

    marker.on('click', () => {
      if (didDrag) return;
      if (longPressActivated) {
        longPressActivated = false;
        return;
      }
      if (activeMarker && activeMarker !== marker) exitDragMode();
      selectFacility(f.id);
    });

    // Popup on hover
    const cfg = TYPE_CFG[f.type];
    const color = hpColor(f.hp);
    marker.bindPopup(`
      <div style="min-width:160px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:16px;">${cfg.icon}</span>
          <strong style="font-size:12px;">${f.name}</strong>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">${f.id} · ${f.zone}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
          <span style="color:#94a3b8;" class="mono">HP ${f.hp}/${f.maxHp}</span>
          <span style="color:${color};font-weight:700;">${hpGrade(f.hp)}</span>
        </div>
        <div class="popup-hp-bar">
          <div class="popup-hp-fill" style="width:${f.hp}%;background:${color};"></div>
        </div>
      </div>
    `, { className: 'custom-popup', closeButton: false });

    marker.on('mouseover', function() {
      if (!marker.dragging.enabled()) this.openPopup();
    });
    marker.on('mouseout', function() {
      this.closePopup();
      cancelPress();
    });

    markers[f.id] = marker;
  });
}

// ===== CCTV VIEWER =====
function buildCctvViewer(f) {
  const preset = f.preset || 'park-day';
  const sceneClass = `scene-${preset}`;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `
    <div class="cctv-viewer" data-cctv="${f.id}">
      <div class="cctv-scene ${sceneClass}">
        <div class="cctv-sky"></div>
        <div class="cctv-trees"></div>
        <div class="cctv-path"></div>
        <div class="cctv-bench"></div>
        <div class="cctv-people">
          <div class="person p1"></div>
          <div class="person p2"></div>
          <div class="person p3"></div>
          <div class="person p4"></div>
        </div>
        <div class="cctv-scanline"></div>
        <div class="cctv-noise"></div>
      </div>
      <div class="cctv-overlay">
        <div class="cctv-top">
          <div class="cctv-rec">
            <span class="rec-dot"></span><span class="rec-label">REC</span>
          </div>
          <span class="cctv-id mono">${f.id}</span>
          <span class="cctv-res mono">${f.resolution || ''}</span>
        </div>
        <div class="cctv-crosshair"></div>
        <div class="cctv-bottom">
          <span class="cctv-name">${f.name}</span>
          <span class="cctv-time mono" id="cctvTimestamp">${dateStr} ${timeStr}</span>
        </div>
      </div>
      <div class="cctv-controls">
        <button class="cc-btn" onclick="showToast('📹','스냅샷 저장됨','ok',2500)" title="스냅샷">📸</button>
        <button class="cc-btn" onclick="showToast('🎙️','양방향 안내방송 활성화','info',2500)" title="안내방송">🎙️</button>
        <button class="cc-btn" onclick="showToast('🔍','PTZ 제어 모드','info',2500)" title="PTZ">🎯</button>
        <button class="cc-btn" onclick="showToast('📼','녹화 영상 1시간 저장','info',2500)" title="녹화 보기">📼</button>
      </div>
    </div>
  `;
}

// ===== SELECT FACILITY =====
function selectFacility(id) {
  selectedId = id;
  const f = FACILITIES.find(x => x.id === id);
  if (!f) return;

  const cfg = TYPE_CFG[f.type];
  const color = hpColor(f.hp);
  const grade = hpGrade(f.hp);

  // Fly to
  map.flyTo([f.lat, f.lng], 17, { duration: 0.8 });

  // Update detail panel (push-in-left when returning from history)
  let html = `<div class="detail-panel push-in-left">`;
  html += `<div class="detail-header">
    <div class="detail-icon-wrap">
      <div class="detail-icon" style="background:${cfg.color}20;border:1px solid ${cfg.color}40;">${cfg.icon}</div>
      <div>
        <div class="detail-name">${f.name}</div>
        <div class="detail-id">${f.id} · ${f.zone}</div>
      </div>
    </div>
    <button class="close-btn" onclick="clearSelection()">×</button>
  </div>`;

  // CCTV 뷰어 (CCTV 타입에만)
  if (f.type === 'cctv') {
    html += buildCctvViewer(f);
  }

  // HP Bar
  html += `<div class="hp-container">
    <div class="hp-label-row">
      <span class="hp-text mono">HP ${f.hp}/${f.maxHp}</span>
      <span class="hp-grade" style="color:${color};background:${color}18;border:1px solid ${color}40;">${grade}</span>
    </div>
    <div class="hp-bar-bg">
      <div class="hp-bar-fill" style="width:${f.hp}%;background:linear-gradient(90deg,${color}cc,${color});${f.hp<=30?`box-shadow:0 0 8px ${color}80`:''}"></div>
      <div class="grid-line" style="left:20%"></div>
      <div class="grid-line" style="left:40%"></div>
      <div class="grid-line" style="left:60%"></div>
      <div class="grid-line" style="left:80%"></div>
    </div>
  </div>`;

  // Info grid
  html += `<div class="info-grid">
    <div class="info-card"><div class="lbl">설치일</div><div class="val mono">${f.installed}</div></div>
    <div class="info-card"><div class="lbl">마지막 점검</div><div class="val mono">${f.lastCheck}</div></div>
    <div class="info-card ${f.hp<=30?'alert':''}"><div class="lbl">예상 교체 시기</div><div class="val mono">${daysUntilReplace(f.hp)}</div></div>
    <div class="info-card"><div class="lbl">구역</div><div class="val">${f.zone}</div></div>`;
  if (f.temp != null) html += `<div class="info-card"><div class="lbl">온도</div><div class="val mono">${f.temp}°C</div></div>`;
  if (f.humidity != null) html += `<div class="info-card"><div class="lbl">습도</div><div class="val mono">${f.humidity}%</div></div>`;
  if (f.spots) html += `<div class="info-card"><div class="lbl">주차현황</div><div class="val mono">${f.occupied}/${f.spots}</div></div>`;
  if (f.fillLevel) html += `<div class="info-card ${f.fillLevel>80?'alert':''}"><div class="lbl">적재량</div><div class="val mono">${f.fillLevel}%</div></div>`;
  if (f.resolution) html += `<div class="info-card"><div class="lbl">해상도</div><div class="val mono">${f.resolution}</div></div>`;
  if (f.fov) html += `<div class="info-card"><div class="lbl">화각(FOV)</div><div class="val mono">${f.fov}°</div></div>`;
  if (f.model) html += `<div class="info-card" style="grid-column:span 2;"><div class="lbl">카메라 모델</div><div class="val mono" style="font-size:11px;">${f.model}</div></div>`;
  html += `</div>`;

  // Alert
  if (f.hp <= 30) {
    const cls = f.hp <= 10 ? 'critical' : 'warning';
    const icon = f.hp <= 10 ? '🚨' : '⚠️';
    const msg = f.hp <= 10
      ? '즉시 교체가 필요합니다. 안전 점검 요청을 권고합니다.'
      : '내구도가 낮습니다. 정기 점검 일정을 앞당기세요.';
    html += `<div class="alert-banner ${cls}"><span style="font-size:14px;">${icon}</span> ${msg}</div>`;
  }

  // 담당자
  const assignee = f.assigneeId ? getStaffById(f.assigneeId) : null;
  html += `<div class="assignee-row">
    <div class="ar-label">👤 담당자</div>
    <div class="ar-body">
      ${assignee ? `
        <span class="ar-avatar">${assignee.avatar}</span>
        <div class="ar-info">
          <div class="ar-name">${assignee.name}</div>
          <div class="ar-role">${assignee.role} · ${assignee.phone}</div>
        </div>
      ` : '<span class="ar-empty">미배정</span>'}
      <button class="ar-change" onclick="openAssigneePicker('${f.id}')">${assignee?'변경':'배정'}</button>
    </div>
  </div>`;

  // Actions
  const myPending = INSPECTIONS.filter(i => i.facilityId === f.id && i.status === 'pending').length;
  const myRepairs = REPAIRS.filter(r => r.facilityId === f.id && r.status !== 'done').length;
  const pendingBadge = myPending > 0 ? ` <span class="btn-cnt">${myPending}</span>` : '';
  const repairBadge  = myRepairs > 0 ? ` <span class="btn-cnt">${myRepairs}</span>` : '';
  html += `<div class="action-row">
    <button class="action-btn primary" onclick="openInspectPanel('${f.id}')">📋 점검 리스트${pendingBadge}</button>
    <button class="action-btn default" onclick="showHistory('${f.id}')">📊 이력 보기</button>
    <button class="action-btn repair" onclick="openRepairModal('${f.id}')">🔧 수리 요청${repairBadge}</button>
  </div>`;

  // Event log
  ensureEvents(f);
  if (f.events.length > 0) {
    const rows = f.events.slice(0, 6).map(ev => {
      const icon = ev.src === 'report' ? '📱' : '📡';
      const dc = ev.hpDelta < 0 ? 'down' : ev.hpDelta > 0 ? 'up' : 'flat';
      const dt = ev.hpDelta !== 0 ? (ev.hpDelta > 0 ? '+' : '') + ev.hpDelta : '—';
      return `<div class="event-row">
        <span class="ev-src">${icon}</span>
        <span class="ev-msg" title="${ev.note}">${ev.kind}${ev.note ? ' · ' + ev.note : ''}</span>
        <span class="ev-delta ${dc}">${dt}</span>
        <span class="ev-time">${formatRelTime(ev.ts)}</span>
      </div>`;
    }).join('');
    html += `<div class="event-log">
      <div class="event-log-title">
        <span>최근 이벤트</span><span class="count">${f.events.length}건</span>
      </div>
      <div class="event-list">${rows}</div>
    </div>`;
  } else {
    html += `<div class="event-log"><div class="event-empty">이벤트 기록 없음</div></div>`;
  }

  html += `</div>`;
  document.getElementById('detailPanel').innerHTML = html;
  openSidebarIfMobile();
}

function clearSelection() {
  selectedId = null;
  document.getElementById('detailPanel').innerHTML = `
    <div class="select-prompt">
      <div class="icon">📍</div>
      <p>지도에서 시설물을 선택하면<br>상세 정보를 확인할 수 있습니다</p>
    </div>`;
}

// ===== FILTERS =====
function renderFilters() {
  const filters = [
    { key:'all', label:'전체', icon:'📡' },
    { key:'alert', label:`경고 ${FACILITIES.filter(f=>f.hp<=30).length}`, icon:'🚨' },
    { key:'bench', label:'벤치', icon:'🪑' },
    { key:'restroom', label:'화장실', icon:'🚻' },
    { key:'exercise', label:'운동기구', icon:'🏋️' },
    { key:'light', label:'가로등', icon:'💡' },
    { key:'bin', label:'쓰레기통', icon:'🗑️' },
    { key:'cctv', label:'CCTV', icon:'📹' },
  ];

  const bar = document.getElementById('filterBar');
  bar.innerHTML = filters.map(f =>
    `<button class="filter-btn ${currentFilter===f.key?'active':''}"
      onclick="setFilter('${f.key}')">
      <span>${f.icon}</span> ${f.label}
    </button>`
  ).join('')
    + `<button class="filter-btn add-btn" onclick="toggleAddMenu()">
        <span>➕</span> 추가
      </button>`
    + `<button class="filter-btn list-btn ${listMode?'active':''}" onclick="toggleListMode()">
        <span>📋</span> 목록
      </button>`
    + `<div class="fb-break"></div>`
    + `<button class="filter-btn density-btn ${densityVisible?'active':''}" onclick="toggleDensity()">
        <span>🔥</span> 혼잡도
      </button>`
    + `<button class="filter-btn btn-3d" onclick="open3DView()">
        <span>🛰️</span> 3D 지도
      </button>`;
}

function open3DView() {
  window.location.href = '3d.html';
}

function setFilter(key) {
  currentFilter = key;
  addMarkers(key);
  renderFilters();
}

// ===== ADD MODE =====
const ID_PREFIX = { bench:'B', restroom:'T', exercise:'E', light:'L', parking:'P', bin:'W', cctv:'C' };

function renderAddMenu() {
  const menu = document.getElementById('addMenu');
  menu.innerHTML = Object.keys(TYPE_CFG).map(t => {
    const cfg = TYPE_CFG[t];
    return `<button class="add-menu-item" onclick="enterAddMode('${t}')">
      <span class="icon">${cfg.icon}</span><span>${cfg.label} 추가</span>
    </button>`;
  }).join('');
}

function toggleAddMenu() {
  document.getElementById('addMenu').classList.toggle('hidden');
}

function enterAddMode(type) {
  addMode = type;
  document.getElementById('addMenu').classList.add('hidden');
  const cfg = TYPE_CFG[type];
  const indicator = document.getElementById('addIndicator');
  indicator.innerHTML = `<span>${cfg.icon}</span>
    지도를 클릭해 <strong>${cfg.label}</strong>를 배치하세요
    <button onclick="exitAddMode()">취소</button>`;
  indicator.classList.remove('hidden');
  map.getContainer().style.cursor = 'crosshair';
}

function exitAddMode() {
  addMode = null;
  document.getElementById('addIndicator').classList.add('hidden');
  map.getContainer().style.cursor = '';
}

map.on('click', (e) => {
  if (parkDrawingMode) {
    handleParkDrawingClick(e.latlng);
    return;
  }
  if (activeMarker) {
    exitDragMode();
    return;
  }
  if (!addMode) return;
  const cfg = TYPE_CFG[addMode];
  const today = new Date().toISOString().slice(0, 10);
  const prefix = ID_PREFIX[addMode];
  const seq = String(FACILITIES.filter(f => f.type === addMode).length + 1).padStart(3, '0');
  const newFacility = {
    id: `${prefix}${seq}-${String(Date.now()).slice(-3)}`,
    name: `신규 ${cfg.label}`,
    type: addMode,
    zone: '기타',
    hp: 100,
    maxHp: 100,
    installed: today,
    lastCheck: today,
    lat: e.latlng.lat,
    lng: e.latlng.lng,
  };
  FACILITIES.push(newFacility);
  saveFacilities();
  exitAddMode();
  refreshAll();
});

function refreshAll() {
  addMarkers(currentFilter);
  renderFilters();
  renderStats();
  renderAlerts();
  renderOverallGauge();
  if (densityVisible) renderDensityLayer();
}

// ===== SENSOR SIMULATOR =====
const SENSOR_INTERVAL_MS = 9000;

function simulateSensors() {
  let anyChange = false;

  FACILITIES.forEach(f => {
    const r = Math.random();

    if (f.type === 'light') {
      if (r < 0.04) {
        const dmg = -(Math.floor(Math.random() * 5) + 3);
        pushEvent(f, 'sensor', '⚡ 전력 이상', dmg, '');
        anyChange = true;
      } else if (r < 0.09) {
        pushEvent(f, 'sensor', '🔆 조도 센서 오류', -2, '');
        anyChange = true;
      } else if (r < 0.22) {
        pushEvent(f, 'sensor', '🔄 정기 마모', -1, '');
        anyChange = true;
      }

    } else if (f.type === 'bin') {
      if (f.fillLevel == null) f.fillLevel = 0;
      const fill = Math.floor(Math.random() * 9) + 2;
      f.fillLevel = Math.min(100, f.fillLevel + fill);
      if (f.fillLevel >= 100) {
        pushEvent(f, 'sensor', '🗑️ 과적 발생', -3, `적재량 100%`);
      } else if (r < 0.06) {
        const prev = f.fillLevel;
        f.fillLevel = Math.floor(Math.random() * 10) + 5;
        pushEvent(f, 'sensor', '♻️ 수거 완료', 1, `${prev}% → ${f.fillLevel}%`);
      } else {
        pushEvent(f, 'sensor', `📊 적재량`, 0, `${f.fillLevel}%`);
      }
      anyChange = true;

    } else if (f.type === 'parking') {
      if (f.occupied == null) f.occupied = 0;
      if (f.spots == null) f.spots = 45;
      const delta = Math.floor(Math.random() * 7) - 3;
      f.occupied = Math.max(0, Math.min(f.spots, f.occupied + delta));
      if (r < 0.03) {
        pushEvent(f, 'sensor', '🔧 센서 오류', -2, '');
      } else {
        pushEvent(f, 'sensor', `🚗 점유 변동`, 0, `${f.occupied}/${f.spots}`);
      }
      anyChange = true;
    }
  });

  if (anyChange) {
    saveFacilities();
    refreshAll();
    if (selectedId) selectFacility(selectedId);
  }
}

// ===== STATS =====
function renderStats() {
  const total = FACILITIES.length;
  const good = FACILITIES.filter(f => f.hp > 80).length;
  const critical = FACILITIES.filter(f => f.hp <= 30).length;

  document.getElementById('statsOverlay').innerHTML = `
    <div class="stat-chip">
      <span style="font-size:14px;">📡</span>
      <div><div class="num mono" style="color:#3b82f6;">${total}</div><div class="lbl">전체</div></div>
    </div>
    <div class="stat-chip">
      <span style="font-size:14px;">💚</span>
      <div><div class="num mono" style="color:#22c55e;">${good}</div><div class="lbl">양호</div></div>
    </div>
    <div class="stat-chip">
      <span style="font-size:14px;">🚨</span>
      <div><div class="num mono" style="color:#ef4444;">${critical}</div><div class="lbl">위험</div></div>
    </div>
  `;
}

// ===== ALERT LIST =====
function renderAlerts() {
  const alerts = FACILITIES.filter(f => f.hp <= 50).sort((a,b) => a.hp - b.hp);
  document.getElementById('alertCount').textContent = alerts.length;

  document.getElementById('alertList').innerHTML = alerts.map(f => {
    const cfg = TYPE_CFG[f.type];
    const color = hpColor(f.hp);
    return `
      <div class="alert-item" data-severity="${hpSeverity(f.hp)}"
        onclick="selectFacility('${f.id}')">
        <span class="icon">${cfg.icon}</span>
        <div class="info">
          <div class="name">${f.name}</div>
          <div class="zone">${f.zone}</div>
        </div>
        <div>
          <div class="hp-val mono" style="color:${color}">${f.hp}%</div>
          <div class="hp-grade-sm">${hpGrade(f.hp)}</div>
        </div>
      </div>`;
  }).join('');
}

// ===== OVERALL GAUGE =====
function renderOverallGauge() {
  const avg = Math.round(FACILITIES.reduce((s,f) => s + f.hp, 0) / FACILITIES.length);
  const color = hpColor(avg);
  document.getElementById('overallGauge').innerHTML = `
    <div class="label">공원 전체 평균 내구도</div>
    <div class="big-num mono" style="color:${color};text-shadow:0 0 20px ${color}30;">
      ${avg}<small>%</small>
    </div>
    <div style="margin-top:8px;padding:0 20px;">
      <div class="hp-bar-bg" style="height:12px;">
        <div class="hp-bar-fill" style="width:${avg}%;background:linear-gradient(90deg,${color}cc,${color});"></div>
        <div class="grid-line" style="left:20%"></div>
        <div class="grid-line" style="left:40%"></div>
        <div class="grid-line" style="left:60%"></div>
        <div class="grid-line" style="left:80%"></div>
      </div>
    </div>
  `;
}

// ===== CROWD DENSITY =====
// 구역 데이터는 현재 공원(getCurrentPark().zones)에서 가져옴
let ZONES = getCurrentPark().zones || [];

function loadZoneData() {
  try {
    const raw = localStorage.getItem(keyZones());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === ZONES.length) return parsed;
    }
  } catch (e) {}
  // 태화강만 시드값, 그 외 공원은 0
  if (currentParkId === DEFAULT_PARK.id) {
    const seed = { bamboo: 220, wetland: 80, tenri: 380, waterside: 140, health: 130, parking: 60 };
    return ZONES.map(z => ({ id: z.id, people: seed[z.id] ?? 100 }));
  }
  return ZONES.map(z => ({ id: z.id, people: 0 }));
}

function saveZoneData() {
  try { localStorage.setItem(keyZones(), JSON.stringify(ZONE_DATA)); } catch (e) {}
}

let ZONE_DATA = loadZoneData();
saveZoneData();

function zoneDensity(z) {
  const d = ZONE_DATA.find(x => x.id === z.id);
  const people = d ? d.people : 0;
  const ratio = people / z.capacity;
  if (ratio > 0.90) return { level: 'critical', label: '혼잡', color: '#ef4444', people, ratio };
  if (ratio > 0.70) return { level: 'high',     label: '많음', color: '#f97316', people, ratio };
  if (ratio > 0.45) return { level: 'medium',   label: '보통', color: '#eab308', people, ratio };
  if (ratio > 0.20) return { level: 'low',      label: '여유', color: '#22c55e', people, ratio };
  return                      { level: 'sparse', label: '한산', color: '#3b82f6', people, ratio };
}

// 현재 공원의 경계
let PARK_BOUNDARY = getCurrentPark().boundary || [];

// 경계 내부 판정 (point-in-polygon, ray casting)
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

let densityLayer = null;
let heatmapLayer = null;
let parkBoundaryLayer = null;
let densityVisible = false;

// 공원 경계 내부에서 존 중심 가중 분포로 히트맵 포인트 생성
function generateHeatmapPoints() {
  const points = [];

  // 각 존 주변으로 집중된 포인트 분포
  ZONES.forEach(z => {
    const d = zoneDensity(z);
    const numPoints = Math.max(18, Math.floor(d.people / 3));
    const intensity = Math.min(1, 0.2 + d.ratio * 1.0);

    // 존 중심 강한 피크
    for (let k = 0; k < 5; k++) {
      points.push([z.lat, z.lng, intensity]);
    }

    // 주변 산포 (존 폴리곤 bbox 기반)
    const lats = z.polygon.map(p => p[0]);
    const lngs = z.polygon.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = (maxLat - minLat) * 1.1;
    const spanLng = (maxLng - minLng) * 1.1;

    let tries = 0, placed = 0;
    while (placed < numPoints && tries < numPoints * 4) {
      tries++;
      const gx = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const gy = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const lat = z.lat + gx * spanLat * 0.5;
      const lng = z.lng + gy * spanLng * 0.5;
      if (!pointInAnyPolygon(lat, lng, PARK_BOUNDARY)) continue;
      const w = intensity * (0.35 + Math.random() * 0.65);
      points.push([lat, lng, w]);
      placed++;
    }
  });

  // 공원 전반 배경 저강도 노이즈
  for (let i = 0; i < 80; i++) {
    const lat = 35.5430 + Math.random() * 0.0095;
    const lng = 129.2895 + Math.random() * 0.0160;
    if (!pointInAnyPolygon(lat, lng, PARK_BOUNDARY)) continue;
    points.push([lat, lng, 0.08 + Math.random() * 0.08]);
  }

  return points;
}

function renderDensityLayer() {
  // 초기화
  if (heatmapLayer)     { map.removeLayer(heatmapLayer);     heatmapLayer = null; }
  if (parkBoundaryLayer){ map.removeLayer(parkBoundaryLayer); parkBoundaryLayer = null; }
  if (densityLayer)     { map.removeLayer(densityLayer);     densityLayer = null; }

  if (!densityVisible) return;

  // 히트맵 레이어
  const points = generateHeatmapPoints();
  if (typeof L.heatLayer === 'function') {
    heatmapLayer = L.heatLayer(points, {
      radius: 28,
      blur: 24,
      minOpacity: 0.25,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.0:  'rgba(34,197,94,0)',
        0.25: 'rgba(132,204,22,0.55)',
        0.45: 'rgba(234,179,8,0.7)',
        0.65: 'rgba(249,115,22,0.82)',
        0.85: 'rgba(239,68,68,0.88)',
        1.0:  'rgba(127,29,29,0.95)',
      },
    }).addTo(map);
  }

  // 존 레이블 (히트맵 위에 떠있게)
  densityLayer = L.layerGroup();
  ZONES.forEach(z => {
    const d = zoneDensity(z);
    const labelIcon = L.divIcon({
      className: '',
      html: `<div class="zone-label level-${d.level}" style="background:${d.color}e6;border-color:${d.color};">
        <div class="zl-name">${z.name}</div>
        <div class="zl-data"><span class="mono">${d.people}/${z.capacity}</span><span class="zl-tag">${d.label}</span></div>
      </div>`,
      iconSize: [null, null],
    });
    L.marker([z.lat, z.lng], { icon: labelIcon, zIndexOffset: 200 })
      .bindPopup(`<div style="min-width:170px">
        <strong>${z.name}</strong>
        <div style="margin:4px 0;font-size:11px;color:#94a3b8;">유동인구 ${d.people}명 / 수용 ${z.capacity}명</div>
        <div style="color:${d.color};font-weight:700;">${d.label} (${Math.round(d.ratio * 100)}%)</div>
      </div>`, { className: 'custom-popup', closeButton: false })
      .addTo(densityLayer);
  });
  densityLayer.addTo(map);
}

function toggleDensity() {
  densityVisible = !densityVisible;
  renderDensityLayer();
  addMarkers(currentFilter); // 시설 마커 on/off
  renderFilters();
}

// ===== SAFETY ALERTS =====
function computeSafetyAlerts() {
  const alerts = [];
  ZONES.forEach(z => {
    const d = zoneDensity(z);
    if (d.level === 'critical') {
      alerts.push({
        type: 'crowd', zone: z.name, level: 'critical', icon: '🚨',
        title: `${z.name} 혼잡 경보`,
        message: `${d.people}/${z.capacity}명 (${Math.round(d.ratio*100)}%) · 안전관리 인력 투입 권고`,
        zoneRef: z,
      });
    } else if (d.level === 'high') {
      alerts.push({
        type: 'crowd', zone: z.name, level: 'warning', icon: '⚠️',
        title: `${z.name} 유동인구 증가`,
        message: `${d.people}/${z.capacity}명 · 모니터링 강화`,
        zoneRef: z,
      });
    }
  });
  // 저내구 시설 × 고밀도 혼합 위험
  FACILITIES.forEach(f => {
    if (f.hp > 30) return;
    const z = ZONES.find(zz => zz.name === f.zone);
    if (!z) return;
    const d = zoneDensity(z);
    if (d.level === 'critical' || d.level === 'high') {
      alerts.push({
        type: 'combo', zone: f.zone, level: 'critical', icon: '🛑',
        title: `${f.name} 안전사고 위험`,
        message: `HP ${f.hp}% + ${z.name} ${d.label} · 즉시 조치 필요`,
        facilityRef: f,
      });
    }
  });
  const rank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level]);
}

function renderSafetyOverlay() {
  let overlay = document.getElementById('safetyOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'safetyOverlay';
    overlay.className = 'safety-overlay';
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) mapContainer.appendChild(overlay);
    else return;
  }
  const alerts = computeSafetyAlerts();
  if (alerts.length === 0) {
    overlay.innerHTML = `<div class="safety-empty">🛡️ 이상 징후 없음</div>`;
    overlay.classList.remove('has-critical');
    return;
  }
  const critical = alerts.filter(a => a.level === 'critical').length;
  const warning  = alerts.filter(a => a.level === 'warning').length;
  overlay.classList.toggle('has-critical', critical > 0);
  overlay.innerHTML = `
    <div class="sa-head">
      <span class="sa-title">🛡️ 안전 경보</span>
      ${critical > 0 ? `<span class="sa-chip crit">🚨 ${critical}</span>` : ''}
      ${warning > 0  ? `<span class="sa-chip warn">⚠️ ${warning}</span>` : ''}
    </div>
    <div class="sa-list">
      ${alerts.slice(0, 5).map(a => `
        <div class="sa-item sa-${a.level}" ${a.facilityRef ? `onclick="selectFacility('${a.facilityRef.id}')"` : ''}>
          <span class="sa-icon">${a.icon}</span>
          <div class="sa-content">
            <div class="sa-item-title">${a.title}</div>
            <div class="sa-item-msg">${a.message}</div>
          </div>
        </div>`).join('')}
    </div>
  `;
}

// ===== 시설 목록 페이지 (검색/필터) =====
let listMode = false;
let listSearch = '';
let listTypeFilter = 'all';
let listHpFilter = 'all'; // 'all' | 'good' (>80) | 'caution' (50-80) | 'warning' (30-50) | 'danger' (<=30)
let listSort = 'hp-asc'; // 'name' | 'hp-asc' | 'hp-desc'
let listAssigneeFilter = 'all'; // 'all' | 'none' | staffId

function toggleListMode() {
  listMode = !listMode;
  document.body.classList.toggle('list-mode', listMode);
  if (listMode) {
    // 사이드바가 접혀있으면 펴고, 모바일이면 바텀시트 오픈
    if (document.body.classList.contains('sidebar-collapsed')) {
      document.body.classList.remove('sidebar-collapsed');
      updateSidebarToggleIcon();
      setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 320);
    }
    openSidebarIfMobile();
    renderFacilityList();
  } else {
    if (selectedId) selectFacility(selectedId);
    else clearSelection();
  }
  renderFilters();
}

function renderFacilityList() {
  const items = filteredListItems();
  const rowsHtml = items.length === 0
    ? `<div class="list-empty"><div class="icon">🔍</div><div>조건에 맞는 시설이 없습니다</div></div>`
    : items.map(f => listRowHtml(f)).join('');

  const assigneeOpts = ['<option value="all">담당자 전체</option>', '<option value="none">미배정만</option>']
    .concat(STAFF.map(s => `<option value="${s.id}" ${listAssigneeFilter === s.id ? 'selected':''}>${s.avatar} ${s.name}</option>`))
    .join('');
  const typeChips = [
    {k:'all', l:'전체', i:'📡'},
    {k:'bench', l:'벤치', i:'🪑'},
    {k:'restroom', l:'화장실', i:'🚻'},
    {k:'exercise', l:'운동기구', i:'🏋️'},
    {k:'light', l:'가로등', i:'💡'},
    {k:'bin', l:'쓰레기통', i:'🗑️'},
    {k:'parking', l:'주차장', i:'🅿️'},
    {k:'cctv', l:'CCTV', i:'📹'},
  ].map(t => `<button class="lf-chip ${listTypeFilter===t.k?'active':''}" onclick="setListType('${t.k}')">${t.i} ${t.l}</button>`).join('');
  const hpChips = [
    {k:'all', l:'HP 전체'},
    {k:'good', l:'양호 80+'},
    {k:'caution', l:'주의 50-80'},
    {k:'warning', l:'경고 30-50'},
    {k:'danger', l:'위험 ~30'},
  ].map(h => `<button class="lf-chip lf-chip-hp ${listHpFilter===h.k?'active':''}" onclick="setListHp('${h.k}')">${h.l}</button>`).join('');

  document.getElementById('detailPanel').innerHTML = `
    <div class="list-panel">
      <div class="list-head">
        <div class="list-title">
          <span>📋 ${getCurrentPark().name} 시설</span>
          <span class="list-count">${items.length} / ${FACILITIES.length}</span>
        </div>
        <button class="close-btn" onclick="toggleListMode()">×</button>
      </div>
      <div class="list-search">
        <span class="ls-icon">🔍</span>
        <input id="listSearchInput" placeholder="이름·ID·구역·담당자 검색..."
               oninput="onListSearchInput(this.value)" value="${listSearch.replace(/"/g,'&quot;')}">
        ${listSearch ? '<button class="ls-clear" onclick="clearListSearch()">×</button>' : ''}
      </div>
      <div class="list-chips">${typeChips}</div>
      <div class="list-chips">${hpChips}</div>
      <div class="list-row-controls">
        <select class="list-select" onchange="setListAssignee(this.value)">${assigneeOpts}</select>
        <select class="list-select" onchange="setListSort(this.value)">
          <option value="hp-asc" ${listSort==='hp-asc'?'selected':''}>HP 낮은순</option>
          <option value="hp-desc" ${listSort==='hp-desc'?'selected':''}>HP 높은순</option>
          <option value="name" ${listSort==='name'?'selected':''}>이름순</option>
        </select>
      </div>
      <div class="list-rows" id="listRows">${rowsHtml}</div>
    </div>`;

  // 입력창 포커스 유지
  const input = document.getElementById('listSearchInput');
  if (input && listSearch) {
    input.focus();
    const len = input.value.length;
    try { input.setSelectionRange(len, len); } catch(e) {}
  }
}

function filteredListItems() {
  let items = FACILITIES.slice();
  const q = listSearch.trim().toLowerCase();
  if (q) {
    items = items.filter(f => {
      const s = (f.assigneeId ? (getStaffById(f.assigneeId)?.name || '') : '').toLowerCase();
      return f.name.toLowerCase().includes(q)
        || f.id.toLowerCase().includes(q)
        || f.zone.toLowerCase().includes(q)
        || s.includes(q);
    });
  }
  if (listTypeFilter !== 'all') {
    items = items.filter(f => f.type === listTypeFilter);
  }
  if (listHpFilter !== 'all') {
    items = items.filter(f => {
      if (listHpFilter === 'good')    return f.hp > 80;
      if (listHpFilter === 'caution') return f.hp > 50 && f.hp <= 80;
      if (listHpFilter === 'warning') return f.hp > 30 && f.hp <= 50;
      if (listHpFilter === 'danger')  return f.hp <= 30;
      return true;
    });
  }
  if (listAssigneeFilter !== 'all') {
    if (listAssigneeFilter === 'none') items = items.filter(f => !f.assigneeId);
    else items = items.filter(f => f.assigneeId === listAssigneeFilter);
  }
  if (listSort === 'name') items.sort((a,b) => a.name.localeCompare(b.name, 'ko'));
  else if (listSort === 'hp-desc') items.sort((a,b) => b.hp - a.hp);
  else items.sort((a,b) => a.hp - b.hp);
  return items;
}

function listRowHtml(f) {
  const cfg = TYPE_CFG[f.type];
  const color = hpColor(f.hp);
  const grade = hpGrade(f.hp);
  const assignee = f.assigneeId ? getStaffById(f.assigneeId) : null;
  const pending = INSPECTIONS.filter(i => i.facilityId === f.id && i.status === 'pending').length;
  const repairs = REPAIRS.filter(r => r.facilityId === f.id && r.status !== 'done').length;
  return `<div class="list-row" onclick="selectFromList('${f.id}')">
    <span class="lr-icon" style="background:${cfg.color}20;border:1px solid ${cfg.color}50;">${cfg.icon}</span>
    <div class="lr-info">
      <div class="lr-name">${f.name}</div>
      <div class="lr-sub">${f.id} · ${f.zone}${assignee?` · ${assignee.avatar} ${assignee.name}`:''}</div>
    </div>
    <div class="lr-hp">
      <div class="lr-hp-bar"><div style="width:${f.hp}%;background:${color}"></div></div>
      <div class="lr-hp-text mono" style="color:${color}">${f.hp}% <span class="lr-hp-grade">${grade}</span></div>
    </div>
    <div class="lr-badges">
      ${pending?`<span class="lr-b lr-b-inspect" title="대기 점검">📋${pending}</span>`:''}
      ${repairs?`<span class="lr-b lr-b-repair" title="미완료 수리">🔧${repairs}</span>`:''}
    </div>
  </div>`;
}

function onListSearchInput(v) {
  listSearch = v;
  // 검색어만 바뀔 때는 rows만 갱신 (포커스 유지)
  const rowsEl = document.getElementById('listRows');
  const countEl = document.querySelector('.list-count');
  if (!rowsEl) { renderFacilityList(); return; }
  const items = filteredListItems();
  rowsEl.innerHTML = items.length === 0
    ? `<div class="list-empty"><div class="icon">🔍</div><div>조건에 맞는 시설이 없습니다</div></div>`
    : items.map(f => listRowHtml(f)).join('');
  if (countEl) countEl.textContent = `${items.length} / ${FACILITIES.length}`;
  // clear 버튼 토글
  const searchBar = document.querySelector('.list-search');
  const existingClear = searchBar?.querySelector('.ls-clear');
  if (v && !existingClear) {
    const btn = document.createElement('button');
    btn.className = 'ls-clear';
    btn.textContent = '×';
    btn.onclick = () => clearListSearch();
    searchBar.appendChild(btn);
  } else if (!v && existingClear) {
    existingClear.remove();
  }
}

function clearListSearch() {
  listSearch = '';
  renderFacilityList();
}
function setListType(k) { listTypeFilter = k; renderFacilityList(); }
function setListHp(k)   { listHpFilter = k; renderFacilityList(); }
function setListAssignee(v) { listAssigneeFilter = v; renderFacilityList(); }
function setListSort(v) { listSort = v; renderFacilityList(); }

function selectFromList(id) {
  listMode = false;
  document.body.classList.remove('list-mode');
  renderFilters();
  selectFacility(id);
}

// ===== HISTORY PANEL =====
function showHistory(facilityId) {
  const panel = document.getElementById('detailPanel');
  panel.style.animation = 'pushOutLeft 0.2s cubic-bezier(0.4,0,0.2,1) forwards';
  setTimeout(() => {
    panel.style.animation = '';
    renderHistoryPanel(facilityId);
  }, 200);
}

function backFromHistory(facilityId) {
  const panel = document.getElementById('detailPanel');
  panel.style.animation = 'pushOutRight 0.2s cubic-bezier(0.4,0,0.2,1) forwards';
  setTimeout(() => {
    panel.style.animation = '';
    selectFacility(facilityId);
  }, 200);
}

function renderHistoryPanel(facilityId) {
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  const cfg = TYPE_CFG[f.type];
  ensureEvents(f);

  // 이벤트 + 점검 요청 병합
  const eventItems = f.events.map(ev => ({
    ts: ev.ts,
    src: ev.src === 'report' ? 'report' : 'sensor',
    kind: ev.kind,
    hpDelta: ev.hpDelta,
    note: ev.note,
    status: null,
  }));
  const inspectItems = INSPECTIONS
    .filter(i => i.facilityId === facilityId)
    .map(i => ({
      ts: i.ts,
      src: i.status === 'done' ? 'done' : 'inspect',
      kind: i.reason,
      hpDelta: 0,
      note: i.note,
      status: i.status,
      doneAt: i.doneAt,
    }));
  const repairItems = REPAIRS
    .filter(r => r.facilityId === facilityId)
    .map(r => ({
      ts: r.ts,
      src: r.status === 'done' ? 'done' : 'repair',
      kind: `🔧 수리 · ${r.type}`,
      hpDelta: 0,
      note: r.note || r.priorityLabel,
      status: r.status,
      doneAt: r.doneAt,
    }));
  const merged = [...eventItems, ...inspectItems, ...repairItems]
    .sort((a, b) => b.ts - a.ts);

  const itemsHtml = merged.length === 0
    ? `<div class="h-empty">이력이 없습니다</div>`
    : merged.map(item => {
        const dc = item.hpDelta < 0 ? 'down' : item.hpDelta > 0 ? 'up' : 'flat';
        const dt = item.hpDelta !== 0
          ? `<span class="h-delta ${dc}">${item.hpDelta > 0 ? '+' : ''}${item.hpDelta}</span>`
          : '';
        const noteHtml = item.note
          ? `<div class="h-note">${item.note}</div>`
          : '';
        const statusTag = item.status
          ? `<span class="h-status-tag ${item.status}">${item.status === 'done' ? '완료' : '대기'}</span>`
          : '';
        return `<div class="h-item">
          <div class="h-dot src-${item.src}"></div>
          <div class="h-body">
            <div class="h-row1">
              <span class="h-kind">${item.kind}</span>
              ${dt}
            </div>
            ${noteHtml}
            <div class="h-meta">
              <span class="h-time">${formatRelTime(item.ts)}</span>
              ${statusTag}
            </div>
          </div>
        </div>`;
      }).join('');

  document.getElementById('detailPanel').innerHTML = `
    <div class="detail-panel push-in-right">
      <div class="history-header">
        <button class="back-btn" onclick="backFromHistory('${f.id}')">← 뒤로</button>
        <div class="history-title-wrap">
          <div class="ht-name">${cfg.icon} ${f.name}</div>
          <div class="ht-count">이력 ${merged.length}건</div>
        </div>
      </div>
      <div class="history-timeline">${itemsHtml}</div>
    </div>
  `;
}

// ===== INSPECTION REQUESTS =====
function loadInspections() {
  try {
    const raw = localStorage.getItem(keyInspections());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveInspections() {
  try { localStorage.setItem(keyInspections(), JSON.stringify(INSPECTIONS)); } catch (e) {}
}

let INSPECTIONS = loadInspections();
let inspectTab = 'pending';
let inspectFacilityFilter = null; // null = 전체, facilityId = 해당 시설만

const SEV_STYLE = {
  1: { label: '경미', bg: '#84cc1625', color: '#bef264', border: '#84cc1640' },
  2: { label: '보통', bg: '#f59e0b25', color: '#fcd34d', border: '#f59e0b40' },
  3: { label: '심각', bg: '#ef444425', color: '#fca5a5', border: '#ef444440' },
};

function addInspection(facilityId, reason, severity, note) {
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  const cfg = TYPE_CFG[f.type];
  INSPECTIONS.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    facilityId,
    facilityName: f.name,
    facilityIcon: cfg.icon,
    reason: reason || '📋 수동 요청',
    severity: severity || null,
    note: note || '',
    ts: Date.now(),
    status: 'pending',
    doneAt: null,
  });
  saveInspections();
  updateInspectBadge();
  // 패널이 점검 리스트를 보여주는 중이면 갱신
  const panel = document.querySelector('.inspect-panel');
  if (panel) renderInspectPanel();
}

function requestInspection(facilityId) {
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  addInspection(facilityId, '📋 점검 요청', null, '');
  const pending = INSPECTIONS.filter(i => i.status === 'pending').length;
  showToast('📋', `<strong>${f.name}</strong> 점검 요청 등록 · 대기 ${pending}건`, 'info');
  if (selectedId === facilityId) selectFacility(facilityId);
}

function completeInspection(id) {
  const item = INSPECTIONS.find(x => x.id === id);
  if (!item) return;
  item.status = 'done';
  item.doneAt = Date.now();
  saveInspections();
  updateInspectBadge();
  renderInspectPanel();
  showToast('✅', `<strong>${item.facilityName}</strong> 점검 완료 처리됐습니다`, 'ok');
}

function updateInspectBadge() {
  const pending = INSPECTIONS.filter(i => i.status === 'pending').length;
  const btn = document.getElementById('inspectBadgeBtn');
  const cnt = document.getElementById('inspectBadgeCount');
  if (!btn || !cnt) return;
  cnt.textContent = pending;
  cnt.classList.toggle('hidden', pending === 0);
  btn.classList.toggle('has-items', pending > 0);
}

function injectInspectBadge() {
  const headerRight = document.querySelector('.header-right');
  if (!headerRight || document.getElementById('inspectBadgeBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'inspectBadgeBtn';
  btn.className = 'inspect-badge';
  btn.onclick = () => openInspectPanel(null);
  btn.innerHTML = `📋 점검 리스트<span class="badge-count hidden" id="inspectBadgeCount">0</span>`;
  headerRight.insertBefore(btn, headerRight.firstChild);
}

function openInspectPanel(facilityId) {
  inspectFacilityFilter = facilityId || null;
  inspectTab = 'pending';
  renderInspectPanel();
}

function closeInspectPanel() {
  inspectFacilityFilter = null;
  if (selectedId) selectFacility(selectedId);
  else clearSelection();
}

function switchInspectTab(tab) {
  inspectTab = tab;
  renderInspectPanel();
}

function renderInspectPanel() {
  const isPending = inspectTab === 'pending';
  const pending = INSPECTIONS.filter(i => i.status === 'pending').length;
  const f = inspectFacilityFilter ? FACILITIES.find(x => x.id === inspectFacilityFilter) : null;
  const cfg = f ? TYPE_CFG[f.type] : null;

  // 헤더
  const subTitle = f
    ? `${cfg.icon} ${f.name}`
    : `전체 · 대기 ${pending}건`;
  const addBtn = f
    ? (['bench','restroom','exercise'].includes(f.type)
        ? `<button class="add-inspect-btn" onclick="openReportModal('${f.id}')">＋ QR 제보</button>`
        : `<button class="add-inspect-btn" onclick="requestInspection('${f.id}')">＋ 요청 추가</button>`)
    : '';

  // 아이템 필터
  let items = INSPECTIONS.filter(i => i.status === (isPending ? 'pending' : 'done'));
  if (inspectFacilityFilter) items = items.filter(i => i.facilityId === inspectFacilityFilter);

  const emptyMsg = f
    ? (isPending ? '이 시설의 대기 중 요청이 없습니다' : '이 시설의 완료된 점검이 없습니다')
    : (isPending ? '대기 중인 점검 요청이 없습니다' : '완료된 점검이 없습니다');

  const itemsHtml = items.length === 0
    ? `<div class="inspect-empty"><div class="icon">${isPending ? '✅' : '📭'}</div><div>${emptyMsg}</div></div>`
    : items.map(item => {
        const sev = item.severity ? SEV_STYLE[item.severity] : null;
        const sevTag = sev
          ? `<span class="sev-tag" style="background:${sev.bg};color:${sev.color};border:1px solid ${sev.border};">${sev.label}</span>`
          : '';
        const footer = item.status === 'pending'
          ? `<button class="complete-btn" onclick="completeInspection('${item.id}')">✓ 완료</button>`
          : `<span class="done-tag">완료 · ${formatRelTime(item.doneAt)}</span>`;
        const noteHtml = item.note ? `<div class="note-text">"${item.note}"</div>` : '';
        const facLabel = f
          ? ''
          : `<span class="fac-icon">${item.facilityIcon || '📍'}</span><span class="fac-name">${item.facilityName}</span>`;
        return `<div class="inspect-item${item.status === 'done' ? ' done' : ''}">
          <div class="inspect-item-head">${facLabel}${sevTag}</div>
          <div class="reason">${item.reason}</div>
          ${noteHtml}
          <div class="inspect-item-foot">
            <span class="rel-time">${formatRelTime(item.ts)}</span>
            ${footer}
          </div>
        </div>`;
      }).join('');

  document.getElementById('detailPanel').innerHTML = `
    <div class="inspect-panel">
      <div class="inspect-panel-head">
        <button class="ip-back" onclick="closeInspectPanel()">← 뒤로</button>
        <div class="ip-title">
          <span>📋 점검 리스트</span>
          <span class="ip-sub">${subTitle}</span>
        </div>
        ${addBtn}
      </div>
      <div class="inspect-tabs">
        <button class="inspect-tab ${isPending ? 'active' : ''}" onclick="switchInspectTab('pending')">
          대기 중 <span class="tab-cnt">${INSPECTIONS.filter(i => i.status==='pending' && (!inspectFacilityFilter || i.facilityId===inspectFacilityFilter)).length}</span>
        </button>
        <button class="inspect-tab ${!isPending ? 'active' : ''}" onclick="switchInspectTab('done')">
          완료 <span class="tab-cnt">${INSPECTIONS.filter(i => i.status==='done' && (!inspectFacilityFilter || i.facilityId===inspectFacilityFilter)).length}</span>
        </button>
      </div>
      <div class="inspect-list">${itemsHtml}</div>
    </div>
  `;
}

// ===== 담당자 배정 =====
function assignStaff(facilityId, staffId) {
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  f.assigneeId = staffId || null;
  saveFacilities();
  const s = staffId ? getStaffById(staffId) : null;
  if (s) showToast('👤', `<strong>${f.name}</strong> · ${s.name} 배정`, 'ok');
  else    showToast('👤', `<strong>${f.name}</strong> 담당자 해제`, 'info');
  if (selectedId === facilityId) selectFacility(facilityId);
  if (listMode) renderFacilityList();
}

function openAssigneePicker(facilityId) {
  const f = FACILITIES.find(x => x.id === facilityId);
  if (!f) return;
  let modal = document.getElementById('assigneeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assigneeModal';
    modal.className = 'report-modal hidden';
    document.body.appendChild(modal);
  }
  const rows = STAFF.map(s => `
    <button class="edit-mode-btn" onclick="window.__pickAssignee('${s.id}')">
      <div class="emb-icon" style="background:#3b82f620;">${s.avatar}</div>
      <div class="emb-txt">
        <strong>${s.name} · ${s.role}</strong>
        <small>${s.dept} · ${s.phone}</small>
      </div>
    </button>`).join('');
  modal.innerHTML = `
    <div class="report-card" style="max-width:380px">
      <div class="report-head">
        <div class="report-qr" style="background:linear-gradient(135deg,#3b82f625,#22c55e25);border-color:#3b82f650;">👤</div>
        <div>
          <div class="t">${f.name}</div>
          <div class="s">담당자 배정</div>
        </div>
      </div>
      <div class="edit-mode-list">
        ${rows}
        <button class="edit-mode-btn" onclick="window.__pickAssignee(null)">
          <div class="emb-icon" style="background:#64748b30;">⊘</div>
          <div class="emb-txt"><strong>미배정</strong><small>담당자 해제</small></div>
        </button>
      </div>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="window.__pickAssignee('__cancel__')" style="flex:1;padding:9px 0;">닫기</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  window.__pickAssignee = (id) => {
    modal.classList.add('hidden');
    delete window.__pickAssignee;
    if (id === '__cancel__') return;
    assignStaff(facilityId, id);
  };
  modal.onclick = (e) => { if (e.target === modal && window.__pickAssignee) window.__pickAssignee('__cancel__'); };
}

function openStaffManager() {
  let modal = document.getElementById('staffMgrModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'staffMgrModal';
    modal.className = 'report-modal hidden';
    document.body.appendChild(modal);
  }
  renderStaffManager(modal);
  modal.classList.remove('hidden');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
}

function renderStaffManager(modal) {
  if (!modal) modal = document.getElementById('staffMgrModal');
  if (!modal) return;
  const rows = STAFF.map(s => {
    const count = FACILITIES.filter(f => f.assigneeId === s.id).length;
    return `<div class="staff-row">
      <div class="emb-icon" style="background:#3b82f620;">${s.avatar}</div>
      <div class="staff-info">
        <div class="staff-name">${s.name} · ${s.role}</div>
        <div class="staff-sub">${s.dept} · ${s.phone}</div>
      </div>
      <div class="staff-cnt">담당 ${count}건</div>
      <button class="pd-del" onclick="removeStaff('${s.id}')" title="삭제">×</button>
    </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="report-card" style="max-width:440px">
      <div class="report-head">
        <div class="report-qr" style="background:linear-gradient(135deg,#3b82f625,#22c55e25);border-color:#3b82f650;">👥</div>
        <div>
          <div class="t">담당자 관리</div>
          <div class="s">총 ${STAFF.length}명</div>
        </div>
      </div>
      <div class="staff-list">${rows}</div>
      <button class="pd-add" onclick="addStaffPrompt()" style="margin-top:8px;">➕ 담당자 추가</button>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="document.getElementById('staffMgrModal').classList.add('hidden')" style="flex:1;padding:9px 0;">닫기</button>
      </div>
    </div>`;
}

function addStaffPrompt() {
  const name = prompt('담당자 이름', '');
  if (!name || !name.trim()) return;
  const role = prompt('역할 (예: 시설정비)', '담당자') || '담당자';
  const dept = prompt('부서 (예: 시설관리과)', '시설관리과') || '시설관리과';
  const phone = prompt('연락처 (예: 010-0000-0000)', '') || '';
  const avatars = ['👷','🔧','⚡','🧹','🛡️','🧑‍🔬','🧑‍💼','🧑‍🏭'];
  STAFF.push({
    id: 's-' + Date.now(),
    name: name.trim(), role, dept, phone,
    avatar: avatars[STAFF.length % avatars.length],
  });
  saveStaff();
  renderStaffManager();
  showToast('✅', `<strong>${name.trim()}</strong> 추가됨`, 'ok');
}

function removeStaff(id) {
  const s = getStaffById(id);
  if (!s) return;
  const assigned = FACILITIES.filter(f => f.assigneeId === id).length;
  const msg = assigned > 0
    ? `'${s.name}' 담당자를 삭제하시겠습니까?\n현재 ${assigned}개 시설에 배정되어 있으며, 모두 미배정으로 전환됩니다.`
    : `'${s.name}' 담당자를 삭제하시겠습니까?`;
  if (!confirm(msg)) return;
  FACILITIES.forEach(f => { if (f.assigneeId === id) f.assigneeId = null; });
  saveFacilities();
  const idx = STAFF.findIndex(x => x.id === id);
  if (idx >= 0) STAFF.splice(idx, 1);
  saveStaff();
  renderStaffManager();
  if (selectedId) selectFacility(selectedId);
  if (listMode) renderFacilityList();
}

// ===== REPAIR REQUESTS =====
function loadRepairs() {
  try {
    const raw = localStorage.getItem(keyRepairs());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveRepairs() {
  try { localStorage.setItem(keyRepairs(), JSON.stringify(REPAIRS)); } catch (e) {}
}

let REPAIRS = loadRepairs();

const REPAIR_TYPES = [
  { id: 'damage',   label: '파손 보수',  icon: '🔨' },
  { id: 'part',     label: '부품 교체',  icon: '🔄' },
  { id: 'electric', label: '전기 공사',  icon: '⚡' },
  { id: 'clean',    label: '청소/정비',  icon: '🧹' },
  { id: 'replace',  label: '전면 교체',  icon: '🏗️' },
];
const REPAIR_PRIORITY = [
  { id: 1, label: '보통', cls: 'sev-1' },
  { id: 2, label: '긴급', cls: 'sev-3' },
];
let repairState = { id: null, type: null, priority: null };

function injectRepairModal() {
  if (document.getElementById('repairModal')) return;
  const el = document.createElement('div');
  el.id = 'repairModal';
  el.className = 'report-modal hidden';
  el.innerHTML = `
    <div class="report-card">
      <div class="report-head">
        <div class="report-qr" style="background:linear-gradient(135deg,#f59e0b25,#ef444425);border-color:#f59e0b50;">🔧</div>
        <div>
          <div class="t" id="repairTitle">수리 요청</div>
          <div class="s" id="repairSubtitle">현장 수리 작업 발주</div>
        </div>
      </div>
      <div class="report-section">
        <label>수리 유형</label>
        <div class="chip-group" id="repairTypeChips"></div>
      </div>
      <div class="report-section">
        <label>우선순위</label>
        <div class="chip-group" id="repairPriorityChips"></div>
      </div>
      <div class="report-section">
        <label>작업 내용 (선택)</label>
        <textarea class="report-note" id="repairNote" rows="2" placeholder="구체적인 작업 내용을 입력하세요..."></textarea>
      </div>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="closeRepairModal()" style="flex:1;padding:9px 0;">취소</button>
        <button class="action-btn submit repair-submit" id="repairSubmitBtn" onclick="submitRepair()" style="flex:2;padding:9px 0;" disabled>수리 요청 제출</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeRepairModal(); });
}

function openRepairModal(id) {
  const f = FACILITIES.find(x => x.id === id);
  if (!f) return;
  repairState = { id, type: null, priority: null };
  const cfg = TYPE_CFG[f.type];
  document.getElementById('repairModal').classList.remove('hidden');
  document.getElementById('repairTitle').textContent = `${cfg.icon} ${f.name}`;
  document.getElementById('repairSubtitle').textContent = `${f.id} · ${f.zone} 수리 요청`;
  document.getElementById('repairNote').value = '';
  document.getElementById('repairTypeChips').innerHTML = REPAIR_TYPES.map(t =>
    `<button class="chip" data-rtype="${t.id}" onclick="pickRepairType('${t.id}')">${t.icon} ${t.label}</button>`
  ).join('');
  document.getElementById('repairPriorityChips').innerHTML = REPAIR_PRIORITY.map(p =>
    `<button class="chip ${p.cls}" data-pri="${p.id}" onclick="pickRepairPriority(${p.id})">${p.label}</button>`
  ).join('');
  updateRepairSubmitBtn();
}

function pickRepairType(id) {
  repairState.type = id;
  document.querySelectorAll('#repairTypeChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.rtype === id)
  );
  updateRepairSubmitBtn();
}
function pickRepairPriority(id) {
  repairState.priority = id;
  document.querySelectorAll('#repairPriorityChips .chip').forEach(c =>
    c.classList.toggle('active', +c.dataset.pri === id)
  );
  updateRepairSubmitBtn();
}
function updateRepairSubmitBtn() {
  const btn = document.getElementById('repairSubmitBtn');
  if (btn) btn.disabled = !(repairState.type && repairState.priority);
}
function closeRepairModal() {
  document.getElementById('repairModal').classList.add('hidden');
}

function submitRepair() {
  const f = FACILITIES.find(x => x.id === repairState.id);
  if (!f || !repairState.type || !repairState.priority) return;
  const t = REPAIR_TYPES.find(x => x.id === repairState.type);
  const p = REPAIR_PRIORITY.find(x => x.id === repairState.priority);
  const note = (document.getElementById('repairNote').value || '').trim();

  REPAIRS.unshift({
    id: 'rp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
    facilityId: f.id,
    facilityName: f.name,
    facilityIcon: TYPE_CFG[f.type].icon,
    type: `${t.icon} ${t.label}`,
    priority: p.id,
    priorityLabel: p.label,
    note: note,
    ts: Date.now(),
    status: 'pending',
    doneAt: null,
  });
  saveRepairs();
  pushEvent(f, 'repair', `🔧 ${t.label} 요청`, 0, note || p.label);
  saveFacilities();
  closeRepairModal();
  showToast(p.id === 2 ? '🚨' : '🔧', `<strong>${f.name}</strong> 수리 요청 등록 · ${p.label}`, p.id === 2 ? 'alert' : 'info');
  refreshAll();
  if (selectedId === f.id) selectFacility(f.id);
}

function completeRepair(id) {
  const item = REPAIRS.find(x => x.id === id);
  if (!item) return;
  item.status = 'done';
  item.doneAt = Date.now();
  saveRepairs();
  const f = FACILITIES.find(x => x.id === item.facilityId);
  if (f) { pushEvent(f, 'repair', `✅ 수리 완료`, 0, item.type); saveFacilities(); }
  showToast('✅', `<strong>${item.facilityName}</strong> 수리 완료`, 'ok');
  refreshAll();
  if (selectedId === item.facilityId) selectFacility(item.facilityId);
}

// 모든 폴리곤 점 합치기 (fitBounds, 중심 계산 용)
function allBoundaryPoints(park) {
  if (!park.boundary || park.boundary.length === 0) return [];
  return park.boundary.reduce((acc, poly) => acc.concat(poly || []), []);
}
function pointInAnyPolygon(lat, lng, polygons) {
  if (!polygons || polygons.length === 0) return false;
  return polygons.some(poly => poly && poly.length >= 3 && pointInPolygon(lat, lng, poly));
}

// 공원 경계 항상 표시 레이어 (다중 폴리곤 지원)
let parkOutlineLayer = null;
function renderParkOutline() {
  if (parkOutlineLayer) { map.removeLayer(parkOutlineLayer); parkOutlineLayer = null; }
  const polygons = getCurrentPark().boundary || [];
  if (polygons.length === 0) return;
  parkOutlineLayer = L.layerGroup();
  polygons.forEach(poly => {
    if (!poly || poly.length < 3) return;
    L.polygon(poly, {
      color: '#3b82f6',
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#3b82f6',
      fillOpacity: 0.18,
      dashArray: '6 4',
      interactive: false,
    }).addTo(parkOutlineLayer);
  });
  parkOutlineLayer.addTo(map);
  parkOutlineLayer.eachLayer(l => l.bringToBack && l.bringToBack());
}

// ===== PARK SWITCH / WIZARD =====
function switchPark(parkId) {
  if (!PARKS.find(p => p.id === parkId)) return;
  if (parkId === currentParkId) { closeParkDropdown(); return; }
  currentParkId = parkId;
  localStorage.setItem(CURRENT_PARK_KEY, parkId);

  // 현재 공원 데이터 교체
  const park = getCurrentPark();
  ZONES = park.zones || [];
  PARK_BOUNDARY = park.boundary || [];
  FACILITIES = loadFacilities();
  INSPECTIONS = loadInspections();
  REPAIRS = loadRepairs();
  ZONE_DATA = loadZoneData();

  // 선택 해제, 혼잡도·목록 모드 끄기
  clearSelection();
  densityVisible = false;
  listMode = false;
  document.body.classList.remove('list-mode');

  // 지도 뷰: 경계 점이 3개 이상이면 fitBounds, 없으면 중심만 이동
  const allPts = allBoundaryPoints(park);
  if (allPts.length >= 3) {
    map.flyToBounds(allPts, { padding: [40, 40], maxZoom: 17, duration: 0.8 });
  } else {
    map.flyTo(park.center, park.zoom || 16, { duration: 0.8 });
  }

  // 전면 재렌더
  refreshAll();
  renderParkOutline();
  renderParkSelector();
  closeParkDropdown();
  showToast('🏞️', `<strong>${park.name}</strong>(으)로 전환`, 'info');
}

function deletePark(parkId) {
  if (parkId === DEFAULT_PARK.id) {
    alert('기본 공원(태화강국가정원)은 삭제할 수 없습니다.');
    return;
  }
  const park = PARKS.find(p => p.id === parkId);
  if (!park) return;
  if (!confirm(`'${park.name}' 공원과 그 안의 모든 데이터(시설/점검/수리)를 삭제할까요?`)) return;
  // 스토리지 제거
  ['facilities','inspections','repairs','zones'].forEach(k => {
    try { localStorage.removeItem(`park-${parkId}-${k}`); } catch(e){}
  });
  PARKS = PARKS.filter(p => p.id !== parkId);
  saveParks();
  if (currentParkId === parkId) {
    switchPark(DEFAULT_PARK.id);
  } else {
    renderParkSelector();
    renderParkDropdown();
  }
  showToast('🗑️', `'${park.name}' 삭제됨`, 'ok');
}

// --- 공원 추가 / 경계 편집 ---
let parkDrawingMode = false;
let parkDrawingName = '';
let parkDrawingPoints = [];
let parkDrawingLayer = null;
let editingParkId = null; // null=신규추가, parkId=기존 공원 경계 편집
let editingMode = null;   // 'redraw' | 'append' | 'extend' (신규 생성 시 무시)
let editingPolyIdx = null; // extend 모드에서 어느 영역을 연장할지
let extendInsertionIdx = null; // extend 모드에서 새 점을 삽입할 현재 위치
let extendMarkerClicked = false; // 마커 클릭과 맵 클릭 충돌 방지

function startParkCreation() {
  closeParkDropdown();
  const name = prompt('새 공원 이름을 입력하세요', '');
  if (!name || !name.trim()) return;
  editingParkId = null;
  beginDrawing(name.trim(), '경계 그리기');
}

function startBoundaryEdit(parkId) {
  closeParkDropdown();
  const park = PARKS.find(p => p.id === parkId);
  if (!park) return;
  showEditModeChoice(park, (mode) => {
    if (mode === 'cancel') return;
    if (mode === 'delete') {
      if (!confirm(`'${park.name}'의 경계를 전체 삭제할까요? (공원 자체는 유지됩니다)`)) return;
      park.boundary = [];
      saveParks();
      if (park.id === currentParkId) {
        PARK_BOUNDARY = [];
        renderParkOutline();
      }
      showToast('🗑️', `<strong>${park.name}</strong> 경계 삭제됨`, 'ok');
      return;
    }
    if (mode === 'vertexDelete') {
      startVertexDelete(parkId);
      return;
    }
    if (mode === 'extend') {
      const polygons = park.boundary || [];
      if (polygons.length === 0) {
        alert('이어 나갈 기존 영역이 없습니다.');
        return;
      }
      if (polygons.length === 1) {
        startExtendPolygon(parkId, 0);
      } else {
        showPolygonPicker(park, (polyIdx) => {
          if (polyIdx !== null) startExtendPolygon(parkId, polyIdx);
        });
      }
      return;
    }
    editingParkId = parkId;
    editingMode = mode; // 'redraw' | 'append'
    if (mode === 'redraw') {
      beginDrawing(park.name, '경계 다시 그리기');
    } else if (mode === 'append') {
      beginDrawing(park.name, '새 영역 추가 그리기');
      // 기존 경계 폴리곤들 힌트로 표시 (연한 파랑 fill)
      if (park.boundary && park.boundary.length > 0) {
        park.boundary.forEach(poly => {
          if (!poly || poly.length < 3) return;
          L.polygon(poly, {
            color: '#60a5fa', weight: 1.5, opacity: 0.6,
            fillColor: '#60a5fa', fillOpacity: 0.08,
            dashArray: '3 3', interactive: false,
          }).addTo(parkDrawingLayer);
        });
      }
    }
  });
}

// --- 기존 영역 이어 나가기 모드 ---
function startExtendPolygon(parkId, polyIdx) {
  const park = PARKS.find(p => p.id === parkId);
  if (!park || !park.boundary || !park.boundary[polyIdx]) return;
  editingParkId = parkId;
  editingMode = 'extend';
  editingPolyIdx = polyIdx;
  beginDrawing(park.name, `영역 ${polyIdx + 1} 이어 나가기`);
  // 기존 점들을 버퍼에 주입
  parkDrawingPoints = park.boundary[polyIdx].map(pt => [pt[0], pt[1]]);
  extendInsertionIdx = parkDrawingPoints.length - 1; // 기본값: 마지막 점
  renderExtendState();

  // 인디케이터 메시지 교체 (이어 나가기 전용 안내)
  const indicator = document.getElementById('addIndicator');
  indicator.innerHTML = `<span>🔗</span>
    <strong>${park.name}</strong> 영역 ${polyIdx + 1} ·
    파란점을 클릭해 <strong>이어갈 시작점</strong>을 바꾸고, 지도 클릭으로 점 추가
    <button onclick="cancelParkCreation()">취소</button>
    <button onclick="finishParkCreation()" style="background:#22c55e;color:#000;border-color:#16a34a;">완성</button>`;
  indicator.classList.remove('hidden');
}

function renderExtendState() {
  if (!parkDrawingLayer) return;
  parkDrawingLayer.clearLayers();
  // 폴리라인 (기존 점들의 연결)
  if (parkDrawingPoints.length >= 2) {
    L.polyline(parkDrawingPoints.concat([parkDrawingPoints[0]]), {
      color: '#60a5fa', weight: 2, dashArray: '4 3', opacity: 0.65,
    }).addTo(parkDrawingLayer);
  }
  // 각 점을 클릭 가능한 마커로
  parkDrawingPoints.forEach((pt, idx) => {
    const isInsertion = idx === extendInsertionIdx;
    const m = L.circleMarker(pt, {
      radius: isInsertion ? 9 : 5,
      color: isInsertion ? '#22c55e' : '#60a5fa',
      fillColor: isInsertion ? '#22c55e' : '#60a5fa',
      fillOpacity: isInsertion ? 0.45 : 0.9,
      weight: isInsertion ? 3 : 2,
    });
    m.bindTooltip(
      isInsertion ? `시작점 (점 ${idx + 1})` : `클릭해 이어갈 위치로 지정 · 점 ${idx + 1}`,
      { direction: 'top', offset: [0, -10] }
    );
    m.on('click', (e) => {
      extendMarkerClicked = true;
      setTimeout(() => { extendMarkerClicked = false; }, 80);
      if (e && e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      extendInsertionIdx = idx;
      renderExtendState();
    });
    m.addTo(parkDrawingLayer);
  });
}

function showPolygonPicker(park, callback) {
  let modal = document.getElementById('polyPickerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'polyPickerModal';
    modal.className = 'report-modal hidden';
    document.body.appendChild(modal);
  }
  const polyButtons = park.boundary.map((poly, idx) =>
    `<button class="edit-mode-btn" onclick="window.__pickPoly(${idx})">
      <div class="emb-icon" style="background:rgba(96,165,250,0.2);">🔷</div>
      <div class="emb-txt">
        <strong>영역 ${idx + 1}</strong>
        <small>${poly.length}개 꼭짓점</small>
      </div>
    </button>`
  ).join('');
  modal.innerHTML = `
    <div class="report-card" style="max-width:340px">
      <div class="report-head">
        <div class="report-qr" style="background:linear-gradient(135deg,#60a5fa25,#22c55e25);border-color:#60a5fa50;">🔗</div>
        <div>
          <div class="t">${park.name}</div>
          <div class="s">이어 나갈 영역을 선택하세요</div>
        </div>
      </div>
      <div class="edit-mode-list">${polyButtons}</div>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="window.__pickPoly(null)" style="flex:1;padding:9px 0;">닫기</button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
  window.__pickPoly = (idx) => {
    modal.classList.add('hidden');
    delete window.__pickPoly;
    callback(idx);
  };
  modal.onclick = (e) => {
    if (e.target === modal && window.__pickPoly) window.__pickPoly(null);
  };
}

// --- 점 단위 삭제 모드 ---
let vertexDeleteMode = false;
let vertexDeleteParkId = null;
let vertexDeleteBoundary = [];
let vertexDeleteLayer = null;

function startVertexDelete(parkId) {
  const park = PARKS.find(p => p.id === parkId);
  if (!park || !park.boundary || park.boundary.length === 0) {
    alert('경계가 없습니다.');
    return;
  }
  const totalVertices = (park.boundary || []).reduce((s, p) => s + (p ? p.length : 0), 0);
  if (totalVertices < 4) {
    alert('점 선택 삭제는 4점 이상일 때 가능합니다.');
    return;
  }
  vertexDeleteMode = true;
  vertexDeleteParkId = parkId;
  // 깊은 복사 (다중 폴리곤)
  vertexDeleteBoundary = park.boundary.map(poly => poly.map(pt => [pt[0], pt[1]]));
  vertexDeleteLayer = L.layerGroup().addTo(map);
  const allPts = vertexDeleteBoundary.flat();
  if (allPts.length >= 3) {
    map.flyToBounds(allPts, { padding: [60, 60], maxZoom: 18, duration: 0.6 });
  }
  renderVertexDeletion();

  const indicator = document.getElementById('addIndicator');
  indicator.innerHTML = `<span>🎯</span>
    <strong>${park.name}</strong> 삭제할 점을 클릭 · 남은 점 <span id="vdCount">${totalVertices}</span>개 · ${vertexDeleteBoundary.length}개 영역
    <button onclick="cancelVertexDelete()">취소</button>
    <button onclick="finishVertexDelete()" style="background:#22c55e;color:#000;border-color:#16a34a;">완료</button>`;
  indicator.classList.remove('hidden');
}

function renderVertexDeletion() {
  if (!vertexDeleteLayer) return;
  vertexDeleteLayer.clearLayers();
  // 각 영역별 폴리곤 + 점 그리기
  vertexDeleteBoundary.forEach((poly, polyIdx) => {
    if (!poly || poly.length === 0) return;
    if (poly.length >= 3) {
      L.polygon(poly, {
        color: '#f59e0b', weight: 2.5, opacity: 0.9,
        fillColor: '#f59e0b', fillOpacity: 0.12,
        dashArray: '5 3',
      }).addTo(vertexDeleteLayer);
    } else if (poly.length === 2) {
      L.polyline(poly, { color: '#f59e0b', weight: 2, dashArray: '5 3' }).addTo(vertexDeleteLayer);
    }
    poly.forEach((pt, ptIdx) => {
      const m = L.circleMarker(pt, {
        radius: 9,
        color: '#ef4444',
        fillColor: '#fff',
        fillOpacity: 1,
        weight: 3,
      });
      m.bindTooltip(`영역 ${polyIdx + 1} · 점 ${ptIdx + 1}`, { direction: 'top', offset: [0, -10] });
      m.on('click', () => {
        // 이 영역이 이미 3점이면 → 영역 전체 삭제 확인
        if (poly.length <= 3) {
          if (vertexDeleteBoundary.length > 1) {
            if (confirm(`이 영역(${polyIdx + 1}번)을 전체 삭제할까요?`)) {
              vertexDeleteBoundary.splice(polyIdx, 1);
              updateVertexCount();
              renderVertexDeletion();
            }
          } else {
            showToast('⚠️', '각 영역은 최소 3점이 필요합니다', 'warn', 2500);
          }
          return;
        }
        poly.splice(ptIdx, 1);
        updateVertexCount();
        renderVertexDeletion();
      });
      m.addTo(vertexDeleteLayer);
    });
  });
}

function updateVertexCount() {
  const total = vertexDeleteBoundary.reduce((s, p) => s + p.length, 0);
  const cnt = document.getElementById('vdCount');
  if (cnt) cnt.textContent = total;
}

function cancelVertexDelete() {
  exitVertexDelete();
  showToast('✖️', '점 삭제 취소', 'info', 2000);
}

function finishVertexDelete() {
  // 3점 미만 폴리곤 제거
  const validPolys = vertexDeleteBoundary.filter(p => p && p.length >= 3);
  const park = PARKS.find(p => p.id === vertexDeleteParkId);
  if (park) {
    park.boundary = validPolys.map(p => p.slice());
    const allPts = allBoundaryPoints(park);
    if (allPts.length > 0) {
      park.center = allPts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
        .map(v => v / allPts.length);
    }
    saveParks();
    if (park.id === currentParkId) {
      PARK_BOUNDARY = park.boundary;
      renderParkOutline();
      if (allPts.length >= 3) map.flyToBounds(allPts, { padding: [40, 40], maxZoom: 17, duration: 0.6 });
    }
    const totalPts = validPolys.reduce((s, p) => s + p.length, 0);
    showToast('✅', `<strong>${park.name}</strong> 경계 업데이트됨 (${validPolys.length}개 영역, ${totalPts}점)`, 'ok');
  }
  exitVertexDelete();
}

function exitVertexDelete() {
  vertexDeleteMode = false;
  vertexDeleteParkId = null;
  vertexDeleteBoundary = [];
  if (vertexDeleteLayer) { map.removeLayer(vertexDeleteLayer); vertexDeleteLayer = null; }
  document.getElementById('addIndicator').classList.add('hidden');
}

function showEditModeChoice(park, callback) {
  let modal = document.getElementById('editModeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editModeModal';
    modal.className = 'report-modal hidden';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="report-card" style="max-width:340px">
      <div class="report-head">
        <div class="report-qr" style="background:linear-gradient(135deg,#3b82f625,#8b5cf625);border-color:#3b82f650;">✏️</div>
        <div>
          <div class="t">${park.name}</div>
          <div class="s">경계 편집 방식 선택</div>
        </div>
      </div>
      <div class="edit-mode-list">
        <button class="edit-mode-btn" onclick="window.__editChoice('redraw')">
          <div class="emb-icon">🔄</div>
          <div class="emb-txt">
            <strong>다시 그리기</strong>
            <small>기존 경계를 삭제하고 처음부터 새로 그립니다</small>
          </div>
        </button>
        <button class="edit-mode-btn" onclick="window.__editChoice('extend')">
          <div class="emb-icon" style="background:rgba(34,197,94,0.2);">🔗</div>
          <div class="emb-txt">
            <strong>기존 영역 이어 나가기</strong>
            <small>기존 폴리곤의 마지막 점에서 이어서 점을 추가합니다</small>
          </div>
        </button>
        <button class="edit-mode-btn" onclick="window.__editChoice('append')">
          <div class="emb-icon">➕</div>
          <div class="emb-txt">
            <strong>새 영역 추가</strong>
            <small>기존 영역과 독립된 새 폴리곤을 하나 더 그립니다</small>
          </div>
        </button>
        <button class="edit-mode-btn" onclick="window.__editChoice('vertexDelete')">
          <div class="emb-icon" style="background:rgba(245,158,11,0.2);">🎯</div>
          <div class="emb-txt">
            <strong>점 선택 삭제</strong>
            <small>원하는 꼭짓점만 골라 삭제합니다 (최소 3점 유지)</small>
          </div>
        </button>
        <button class="edit-mode-btn edit-mode-danger" onclick="window.__editChoice('delete')">
          <div class="emb-icon emb-icon-danger">🗑️</div>
          <div class="emb-txt">
            <strong>경계 전체 삭제</strong>
            <small>경계 전체를 비웁니다 (공원과 시설은 유지)</small>
          </div>
        </button>
      </div>
      <div class="report-actions">
        <button class="action-btn cancel" onclick="window.__editChoice('cancel')" style="flex:1;padding:9px 0;">닫기</button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
  window.__editChoice = (mode) => {
    modal.classList.add('hidden');
    delete window.__editChoice;
    callback(mode);
  };
  modal.onclick = (e) => {
    if (e.target === modal && window.__editChoice) window.__editChoice('cancel');
  };
}

function beginDrawing(name, mode) {
  parkDrawingName = name;
  parkDrawingMode = true;
  parkDrawingPoints = [];
  parkDrawingLayer = L.layerGroup().addTo(map);
  map.doubleClickZoom.disable();

  const indicator = document.getElementById('addIndicator');
  indicator.innerHTML = `<span>✏️</span>
    <strong>${name}</strong> ${mode} · 클릭으로 점 추가, 더블클릭으로 완성 (3점 이상)
    <button onclick="cancelParkCreation()">취소</button>
    <button onclick="finishParkCreation()" style="background:#22c55e;color:#000;border-color:#16a34a;">완성</button>`;
  indicator.classList.remove('hidden');
  map.getContainer().style.cursor = 'crosshair';
}

function handleParkDrawingClick(latlng) {
  if (editingMode === 'extend') {
    if (extendMarkerClicked) return; // 마커 클릭 직후는 무시
    // 현재 선택된 삽입 위치 "뒤에" 새 점 삽입
    if (extendInsertionIdx == null) extendInsertionIdx = parkDrawingPoints.length - 1;
    extendInsertionIdx += 1;
    parkDrawingPoints.splice(extendInsertionIdx, 0, [latlng.lat, latlng.lng]);
    renderExtendState();
    return;
  }
  // 일반 그리기 (redraw / append / 신규 생성)
  parkDrawingPoints.push([latlng.lat, latlng.lng]);
  L.circleMarker(latlng, {
    radius: 5, color: '#ef4444', fillColor: '#fff',
    fillOpacity: 1, weight: 2,
  }).addTo(parkDrawingLayer);
  if (parkDrawingPoints.length >= 2) {
    parkDrawingLayer.eachLayer(l => {
      if (l instanceof L.Polyline && !(l instanceof L.Polygon)) parkDrawingLayer.removeLayer(l);
    });
    L.polyline(parkDrawingPoints, { color: '#ef4444', weight: 2, dashArray: '4 3' }).addTo(parkDrawingLayer);
  }
}

function finishParkCreation() {
  if (parkDrawingPoints.length < 3) {
    alert('최소 3개의 점이 필요합니다.');
    return;
  }
  const newPoly = parkDrawingPoints.slice();

  if (editingParkId) {
    const park = PARKS.find(p => p.id === editingParkId);
    if (park) {
      if (editingMode === 'append') {
        // 새 영역을 별도 폴리곤으로 추가
        if (!Array.isArray(park.boundary)) park.boundary = [];
        park.boundary.push(newPoly);
      } else if (editingMode === 'extend') {
        // 기존 영역을 확장한 폴리곤으로 교체
        if (!Array.isArray(park.boundary)) park.boundary = [];
        if (editingPolyIdx != null && park.boundary[editingPolyIdx]) {
          park.boundary[editingPolyIdx] = newPoly;
        } else {
          park.boundary.push(newPoly);
        }
      } else {
        // 'redraw': 기존 폴리곤 모두 교체
        park.boundary = [newPoly];
      }
      // 중심점 재계산 (모든 폴리곤 점 평균)
      const allPts = allBoundaryPoints(park);
      if (allPts.length > 0) {
        park.center = allPts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
          .map(v => v / allPts.length);
      }
      saveParks();
      if (editingParkId === currentParkId) {
        PARK_BOUNDARY = park.boundary;
        renderParkOutline();
        if (allPts.length >= 3) {
          map.flyToBounds(allPts, { padding: [40, 40], maxZoom: 17, duration: 0.6 });
        }
      }
      const msg = editingMode === 'append' ? '새 영역 추가됨'
        : editingMode === 'extend' ? `영역 ${editingPolyIdx + 1} 연장됨`
        : '경계 업데이트됨';
      showToast('✅', `<strong>${park.name}</strong> ${msg}`, 'ok');
    }
    exitParkCreation();
  } else {
    // 신규 공원
    const center = newPoly.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
      .map(v => v / newPoly.length);
    const newPark = {
      id: 'park-' + Date.now(),
      name: parkDrawingName,
      center: center,
      zoom: 16,
      boundary: [newPoly],
      zones: [],
    };
    PARKS.push(newPark);
    saveParks();
    exitParkCreation();
    switchPark(newPark.id);
  }
}

function cancelParkCreation() {
  exitParkCreation();
  showToast('✖️', '공원 추가 취소', 'info', 2000);
}

function exitParkCreation() {
  parkDrawingMode = false;
  parkDrawingName = '';
  parkDrawingPoints = [];
  editingParkId = null;
  editingMode = null;
  editingPolyIdx = null;
  extendInsertionIdx = null;
  extendMarkerClicked = false;
  if (parkDrawingLayer) { map.removeLayer(parkDrawingLayer); parkDrawingLayer = null; }
  document.getElementById('addIndicator').classList.add('hidden');
  map.getContainer().style.cursor = '';
  map.doubleClickZoom.enable();
}

// --- 헤더 공원 셀렉터 UI ---
function injectParkSelector() {
  const headerLeft = document.querySelector('.header-left');
  if (!headerLeft || document.getElementById('parkSelector')) return;
  const icon = headerLeft.querySelector('.header-icon');
  const titleWrap = headerLeft.querySelector('.header-icon + div');
  if (titleWrap) titleWrap.remove();

  const sel = document.createElement('div');
  sel.className = 'park-selector-wrap';
  sel.innerHTML = `
    <button class="park-selector" id="parkSelector" onclick="toggleParkDropdown()">
      <span class="ps-name" id="psCurrentName"></span>
      <span class="ps-sub">IoT 통합관제 ▾</span>
    </button>
    <div class="park-dropdown hidden" id="parkDropdown"></div>
  `;
  if (icon && icon.nextSibling) headerLeft.insertBefore(sel, icon.nextSibling);
  else headerLeft.appendChild(sel);

  // 드롭다운 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('parkDropdown');
    const ps = document.getElementById('parkSelector');
    if (!dd || dd.classList.contains('hidden')) return;
    if (!dd.contains(e.target) && !ps.contains(e.target)) closeParkDropdown();
  });
}

function renderParkSelector() {
  const name = document.getElementById('psCurrentName');
  if (name) name.textContent = getCurrentPark().name;
}

function renderParkDropdown() {
  const dd = document.getElementById('parkDropdown');
  if (!dd) return;
  const items = PARKS.map(p => {
    const isCur = p.id === currentParkId;
    const isDefault = p.id === DEFAULT_PARK.id;
    const editBtn = `<button class="pd-edit" onclick="event.stopPropagation();startBoundaryEdit('${p.id}')" title="경계 편집">✏️</button>`;
    const delBtn = isDefault ? '' : `<button class="pd-del" onclick="event.stopPropagation();deletePark('${p.id}')" title="삭제">×</button>`;
    return `<div class="pd-item ${isCur?'active':''}" onclick="switchPark('${p.id}')">
      <span class="pd-icon">🏞️</span>
      <span class="pd-name">${p.name}</span>
      ${isCur ? '<span class="pd-check">✓</span>' : ''}
      ${editBtn}
      ${delBtn}
    </div>`;
  }).join('');
  dd.innerHTML = `
    <div class="pd-section-title">공원 선택</div>
    ${items}
    <div class="pd-divider"></div>
    <button class="pd-add" onclick="startParkCreation()">➕ 공원 추가</button>
  `;
}

function toggleParkDropdown() {
  const dd = document.getElementById('parkDropdown');
  if (!dd) return;
  if (dd.classList.contains('hidden')) {
    renderParkDropdown();
    dd.classList.remove('hidden');
  } else {
    closeParkDropdown();
  }
}

function closeParkDropdown() {
  const dd = document.getElementById('parkDropdown');
  if (dd) dd.classList.add('hidden');
}

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('ko-KR');
  // CCTV 타임스탬프도 함께 갱신
  const cctvTs = document.getElementById('cctvTimestamp');
  if (cctvTs) {
    const pad = n => String(n).padStart(2, '0');
    cctvTs.textContent =
      `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}

// ===== DEMO SEED =====
function seedDemoData() {
  // 기본 공원(태화강)에만 시드
  if (currentParkId !== DEFAULT_PARK.id) return;

  const now = Date.now();
  const H = 60 * 60 * 1000;
  const D = 24 * H;

  if (INSPECTIONS.length > 0) {
    // 점검/이벤트 시드는 건너뛰되 수리 시드는 독립적으로 체크
    seedRepairsIfEmpty(now, H, D);
    return;
  }
  const demos = [
    { fid: 'B003', reason: '🔨 파손',      sev: 3, note: '좌석 판자 2장 갈라짐',  ago:  3 * H, status: 'pending' },
    { fid: 'T002', reason: '🧹 오염',      sev: 2, note: '세면대 배수 막힘',       ago:  8 * H, status: 'pending' },
    { fid: 'E002', reason: '⚠️ 고장',      sev: 3, note: '벨트 구동부 작동 안됨',  ago: 1 * D,  status: 'pending' },
    { fid: 'E001', reason: '🚨 안전위험',  sev: 2, note: '바닥 마감재 들뜸',       ago:  5 * H, status: 'pending' },
    { fid: 'B001', reason: '📋 점검 요청', sev: null, note: '',                    ago: 3 * D,  status: 'done', doneAgo: 2 * D },
    { fid: 'T003', reason: '🧹 오염',      sev: 1, note: '출입구 낙엽 제거 요청',  ago: 2 * D,  status: 'done', doneAgo: 1 * D },
  ];
  demos.forEach(d => {
    const f = FACILITIES.find(x => x.id === d.fid);
    if (!f) return;
    const cfg = TYPE_CFG[f.type];
    INSPECTIONS.push({
      id: `demo-${d.fid}-${Math.random().toString(36).slice(2, 5)}`,
      facilityId: d.fid,
      facilityName: f.name,
      facilityIcon: cfg.icon,
      reason: d.reason,
      severity: d.sev,
      note: d.note,
      ts: now - d.ago,
      status: d.status,
      doneAt: d.doneAgo ? now - d.doneAgo : null,
    });
  });
  saveInspections();

  // 시설 이벤트 로그 데모 (이력 보기용)
  const eventSeeds = [
    { fid: 'L002', src: 'sensor', kind: '⚡ 전력 이상',      hp: -5, note: '',              ago: 6 * H },
    { fid: 'L002', src: 'sensor', kind: '🔄 정기 마모',      hp: -1, note: '',              ago: 2 * D },
    { fid: 'W002', src: 'sensor', kind: '🗑️ 과적 발생',      hp: -3, note: '적재량 100%',   ago: 4 * H },
    { fid: 'W002', src: 'sensor', kind: '♻️ 수거 완료',      hp:  1, note: '91% → 12%',     ago: 1 * D },
    { fid: 'B003', src: 'report', kind: '🔨 파손',          hp: -30, note: '좌석 판자 2장 갈라짐', ago: 3 * H },
    { fid: 'E002', src: 'report', kind: '⚠️ 고장',          hp: -30, note: '벨트 구동부 작동 안됨', ago: 1 * D },
  ];
  eventSeeds.forEach(e => {
    const f = FACILITIES.find(x => x.id === e.fid);
    if (!f) return;
    ensureEvents(f);
    f.events.push({
      id: `demo-${e.fid}-${Math.random().toString(36).slice(2, 5)}`,
      src: e.src, kind: e.kind,
      hpDelta: 0, // HP는 이미 DEFAULT_FACILITIES에 반영된 상태라 가정, 재감소 방지
      note: e.note,
      ts: now - e.ago,
    });
  });
  // 최신순 정렬
  FACILITIES.forEach(f => {
    if (Array.isArray(f.events)) f.events.sort((a, b) => b.ts - a.ts);
  });
  saveFacilities();

  seedRepairsIfEmpty(now, H, D);
}

function seedRepairsIfEmpty(now, H, D) {
  if (REPAIRS.length > 0) return;
  const repairDemos = [
    { fid: 'B004', type: '🔨 파손 보수', pri: 2, priLabel: '긴급', note: '좌석 전체 교체 필요',       ago: 1 * H, status: 'pending' },
    { fid: 'L002', type: '⚡ 전기 공사', pri: 2, priLabel: '긴급', note: '점등 회로 단선 의심',       ago: 2 * H, status: 'pending' },
    { fid: 'E002', type: '🔄 부품 교체', pri: 1, priLabel: '보통', note: '구동벨트 + 모터 점검',     ago: 4 * H, status: 'pending' },
    { fid: 'W002', type: '🧹 청소/정비', pri: 1, priLabel: '보통', note: '',                        ago: 2 * D, status: 'done', doneAgo: 1 * D },
  ];
  repairDemos.forEach(d => {
    const f = FACILITIES.find(x => x.id === d.fid);
    if (!f) return;
    REPAIRS.push({
      id: `rp-demo-${d.fid}-${Math.random().toString(36).slice(2, 5)}`,
      facilityId: d.fid,
      facilityName: f.name,
      facilityIcon: TYPE_CFG[f.type].icon,
      type: d.type,
      priority: d.pri,
      priorityLabel: d.priLabel,
      note: d.note,
      ts: now - d.ago,
      status: d.status,
      doneAt: d.doneAgo ? now - d.doneAgo : null,
    });
  });
  saveRepairs();
}

// 사이드바 접기 토글 (태블릿/데스크톱)
function injectSidebarToggle() {
  if (document.querySelector('.sidebar-toggle')) return;
  const btn = document.createElement('button');
  btn.className = 'sidebar-toggle';
  btn.id = 'sidebarToggle';
  btn.title = '사이드바 접기';
  btn.innerHTML = '›';
  btn.onclick = toggleSidebar;
  document.body.appendChild(btn);
  updateSidebarToggleIcon();
}

function toggleSidebar() {
  document.body.classList.toggle('sidebar-collapsed');
  updateSidebarToggleIcon();
  // 레이아웃 변경 반영 (Leaflet 사이즈 재계산)
  setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 320);
}

function updateSidebarToggleIcon() {
  const btn = document.getElementById('sidebarToggle');
  if (!btn) return;
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  btn.innerHTML = collapsed ? '‹' : '›';
  btn.title = collapsed ? '사이드바 펴기' : '사이드바 접기';
}

// 모바일 사이드바 드래그 핸들
function injectMobileSidebarHandle() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.querySelector('.sidebar-handle')) return;
  const handle = document.createElement('div');
  handle.className = 'sidebar-handle';
  handle.onclick = () => sidebar.classList.toggle('mobile-open');
  sidebar.prepend(handle);
}

// 시설 선택 시 모바일에서는 사이드바 자동 오픈
function openSidebarIfMobile() {
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar')?.classList.add('mobile-open');
  }
}

function injectStaffButton() {
  const headerRight = document.querySelector('.header-right');
  if (!headerRight || document.getElementById('staffMgrBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'staffMgrBtn';
  btn.className = 'hdr-icon-btn';
  btn.title = '담당자 관리';
  btn.innerHTML = '👥';
  btn.onclick = openStaffManager;
  // 테마 토글 앞에 삽입
  const theme = document.getElementById('themeToggle');
  if (theme) headerRight.insertBefore(btn, theme);
  else headerRight.appendChild(btn);
}

// ===== INIT =====
injectToastStack();
injectReportModal();
injectRepairModal();
injectParkSelector();
injectStaffButton();
injectSidebarToggle();
injectMobileSidebarHandle();
renderParkSelector();
seedDemoData();
renderParkOutline();
addMarkers('all');
renderFilters();
renderAddMenu();
renderStats();
renderAlerts();
renderOverallGauge();
updateClock();
setInterval(updateClock, 1000);
