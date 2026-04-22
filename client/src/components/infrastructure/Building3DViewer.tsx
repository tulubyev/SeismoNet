import { FC, useRef, useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, RotateCcw, Maximize2 } from 'lucide-react';
import type { InfrastructureObject, Sensor } from '@shared/schema';

// ─── Projection helpers ───────────────────────────────────────────────────────

const DEG = Math.PI / 180;

interface Pt3 { x: number; y: number; z: number; }
interface Pt2 { x: number; y: number; }

function project(
  p: Pt3,
  azimuth: number,
  elevation: number,
  scale: number,
  cx: number,
  cy: number
): Pt2 {
  const a = azimuth * DEG;
  const e = elevation * DEG;
  const rx = p.x * Math.cos(a) - p.y * Math.sin(a);
  const rz = p.z;
  const ry = p.x * Math.sin(a) + p.y * Math.cos(a);
  const fx = rx;
  const fz = ry * Math.sin(e) + rz * Math.cos(e);
  const fy = ry * Math.cos(e) - rz * Math.sin(e);
  void fy;
  return { x: cx + fx * scale, y: cy - fz * scale };
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const STRUCT_COLORS: Record<string, { face: string; side: string; top: string }> = {
  reinforced_concrete: { face: '#c0cfe8', side: '#8fa3c0', top: '#dae4f2' },
  frame:               { face: '#b8d4e8', side: '#7a9cb0', top: '#d0e8f4' },
  monolithic:          { face: '#c4c8d8', side: '#9498b0', top: '#d8dce8' },
  panel:               { face: '#b8c8d0', side: '#8898a0', top: '#ccdae0' },
  masonry:             { face: '#dfc9a8', side: '#b09878', top: '#ede0cb' },
  brick:               { face: '#d4b898', side: '#a08868', top: '#e8d0b0' },
  steel:               { face: '#b0c4c4', side: '#7a9898', top: '#cde0e0' },
  wood:                { face: '#d4b896', side: '#a08060', top: '#e8d4bc' },
  mixed:               { face: '#c8c8d8', side: '#9898b0', top: '#dcdce8' },
};
const DEFAULT_COLOR = { face: '#c8ccd8', side: '#9898b0', top: '#dcdce8' };

const SENSOR_COLORS: Record<string, string> = {
  foundation:   '#f59e0b',
  ground_floor: '#3b82f6',
  mid_floor:    '#8b5cf6',
  roof:         '#ef4444',
  free_field:   '#10b981',
};

const AXIS_COLORS: Record<string, string> = { Z: '#ef4444', NS: '#3b82f6', EW: '#10b981' };

// ─── Building geometry ────────────────────────────────────────────────────────

function drawFace(
  ctx: CanvasRenderingContext2D,
  pts: Pt2[],
  fill: string,
  stroke = 'rgba(0,0,0,0.18)',
  lineW = 0.8
) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineW;
  ctx.stroke();
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, z0: number,
  w: number, d: number, h: number,
  clr: { face: string; side: string; top: string },
  az: number, el: number, sc: number, cx: number, cy: number,
  alpha = 1
) {
  const proj = (p: Pt3) => project(p, az, el, sc, cx, cy);
  ctx.globalAlpha = alpha;

  drawFace(ctx, [
    proj({ x: x0,     y: y0, z: z0     }),
    proj({ x: x0 + w, y: y0, z: z0     }),
    proj({ x: x0 + w, y: y0, z: z0 + h }),
    proj({ x: x0,     y: y0, z: z0 + h }),
  ], clr.face);

  drawFace(ctx, [
    proj({ x: x0 + w, y: y0,     z: z0     }),
    proj({ x: x0 + w, y: y0 + d, z: z0     }),
    proj({ x: x0 + w, y: y0 + d, z: z0 + h }),
    proj({ x: x0 + w, y: y0,     z: z0 + h }),
  ], clr.side);

  drawFace(ctx, [
    proj({ x: x0,     y: y0,     z: z0 + h }),
    proj({ x: x0 + w, y: y0,     z: z0 + h }),
    proj({ x: x0 + w, y: y0 + d, z: z0 + h }),
    proj({ x: x0,     y: y0 + d, z: z0 + h }),
  ], clr.top);

  ctx.globalAlpha = 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  object: InfrastructureObject;
  sensors: Sensor[];
  editMode?: boolean;
  onSaveSchema?: (params: SchemaParams) => void;
}

export interface SchemaParams {
  floors: number;
  structuralSystem: string;
  buildingWidth: number;
  buildingDepth: number;
}

const FLOOR_H = 1.2;
const SLAB_H  = 0.12;

const Building3DViewer: FC<Props> = ({ object, sensors, editMode = false, onSaveSchema }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [azimuth,   setAzimuth]   = useState(-35);
  const [elevation, setElevation] = useState(28);
  const drag = useRef<{ startX: number; startY: number; az: number; el: number } | null>(null);
  const [hoveredSensor, setHoveredSensor] = useState<Sensor | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRef = useRef(autoRotate);
  useEffect(() => { autoRef.current = autoRotate; }, [autoRotate]);

  const [showSettings, setShowSettings] = useState(false);

  // Schema params (editable)
  const [schemaFloors, setSchemaFloors]         = useState(Math.max(object.floors ?? 5, 1));
  const [schemaStruct, setSchemaStruct]         = useState(object.structuralSystem ?? 'monolithic');
  const [schemaBldgW,  setSchemaBldgW]          = useState(4.0);
  const [schemaBldgD,  setSchemaBldgD]          = useState(3.0);

  // Keep in sync with object prop
  useEffect(() => {
    setSchemaFloors(Math.max(object.floors ?? 5, 1));
    setSchemaStruct(object.structuralSystem ?? 'monolithic');
  }, [object.floors, object.structuralSystem]);

  const floors = schemaFloors;
  const BLDG_W = schemaBldgW;
  const BLDG_D = schemaBldgD;

  // Map sensor to world position
  const sensorWorld = useCallback((inst: Sensor): Pt3 => {
    const loc = inst.location ?? 'ground_floor';
    const floorN = inst.floor ?? 1;
    let z: number;
    switch (loc) {
      case 'foundation':   z = -0.6; break;
      case 'ground_floor': z = 0.3;  break;
      case 'roof':         z = floors * FLOOR_H + 0.2; break;
      case 'free_field':   z = 0.1;  break;
      default:             z = Math.max(1, floorN) * FLOOR_H - FLOOR_H / 2;
    }
    const idx = sensors.indexOf(inst);
    const xFrac = sensors.length > 1 ? (idx / (sensors.length - 1)) * 0.7 + 0.15 : 0.5;
    const yFrac = loc === 'free_field' ? -0.4 : 0.5;
    return { x: xFrac * BLDG_W - BLDG_W / 2 + BLDG_W / 2, y: yFrac * BLDG_D, z };
  }, [sensors, floors, BLDG_W, BLDG_D]);

  // Main draw
  const draw = useCallback((az: number, el: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const sc = Math.min(W, H) * 0.055;
    const cx = W * 0.48;
    const cy = H * 0.52;
    const proj = (p: Pt3) => project(p, az, el, sc, cx, cy);
    const clr  = STRUCT_COLORS[schemaStruct] ?? DEFAULT_COLOR;

    // Grid
    ctx.globalAlpha = 0.18;
    const GX = 8, GZ_half = 5;
    for (let gx = -GX; gx <= GX; gx += 1.5) {
      const a = proj({ x: gx, y: -GZ_half, z: 0 });
      const b = proj({ x: gx, y:  GZ_half, z: 0 });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    for (let gz = -GZ_half; gz <= GZ_half; gz += 1.5) {
      const a = proj({ x: -GX, y: gz, z: 0 });
      const b = proj({ x:  GX, y: gz, z: 0 });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Foundation
    drawBox(ctx, 0, 0, -0.8, BLDG_W, BLDG_D, 0.8, {
      face: '#64748b', side: '#475569', top: '#94a3b8'
    }, az, el, sc, cx, cy, 0.7);

    // Floors
    for (let f = 0; f < floors; f++) {
      const z0 = f * FLOOR_H;
      drawBox(ctx, 0, 0, z0, BLDG_W, BLDG_D, FLOOR_H - SLAB_H, clr, az, el, sc, cx, cy);
      drawBox(ctx, 0, 0, z0 + FLOOR_H - SLAB_H, BLDG_W, BLDG_D, SLAB_H, {
        face: '#7c9cc0', side: '#5b7a9a', top: '#c0d4e8'
      }, az, el, sc, cx, cy);
    }

    // Roof
    drawBox(ctx, 0, 0, floors * FLOOR_H, BLDG_W, BLDG_D, 0.18, {
      face: '#475569', side: '#334155', top: '#64748b'
    }, az, el, sc, cx, cy);

    // Column lines
    ctx.globalAlpha = 0.25;
    const colPosX = [0.6, BLDG_W - 0.6];
    const colPosY = [0.5, BLDG_D - 0.5];
    colPosX.forEach(cx2 => {
      colPosY.forEach(cy2 => {
        const bot = proj({ x: cx2, y: cy2, z: 0 });
        const top = proj({ x: cx2, y: cy2, z: floors * FLOOR_H });
        ctx.beginPath();
        ctx.moveTo(bot.x, bot.y);
        ctx.lineTo(top.x, top.y);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });
    ctx.globalAlpha = 1;

    // Floor labels
    for (let f = 0; f < floors; f++) {
      const midZ = f * FLOOR_H + FLOOR_H / 2;
      const lp = proj({ x: BLDG_W + 0.3, y: 0, z: midZ });
      ctx.font = `${Math.round(sc * 0.45)}px monospace`;
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.textAlign = 'left';
      ctx.fillText(`${f + 1}эт`, lp.x + 2, lp.y + 4);
    }

    // Sensor cables
    sensors.forEach(inst => {
      if (!inst.isActive) return;
      const sw = sensorWorld(inst);
      const base: Pt3 = { x: sw.x, y: sw.y, z: 0 };
      const pSensor = proj(sw);
      const pBase   = proj(base);
      ctx.beginPath();
      ctx.moveTo(pSensor.x, pSensor.y);
      ctx.lineTo(pBase.x, pBase.y);
      const loc = inst.location ?? 'ground_floor';
      ctx.strokeStyle = SENSOR_COLORS[loc] ?? '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 4]);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    // Sensor markers
    sensors.forEach(inst => {
      const sw   = sensorWorld(inst);
      const pp   = proj(sw);
      const loc  = inst.location ?? 'ground_floor';
      const col  = SENSOR_COLORS[loc] ?? '#94a3b8';
      const r    = sc * 0.45;

      if (inst.isActive) {
        const grd = (canvasRef.current!.getContext('2d')!).createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, r * 2.5);
        grd.addColorStop(0, col + 'aa');
        grd.addColorStop(1, col + '00');
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
      ctx.fillStyle = inst.isActive ? col : '#475569';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const axes = (inst.axes ?? 'Z,NS,EW').split(',');
      axes.forEach((ax, i) => {
        const c = AXIS_COLORS[ax.trim()] ?? '#fff';
        ctx.beginPath();
        ctx.arc(pp.x + (i - 1) * r * 0.9, pp.y - r * 1.6, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });

      ctx.font = `bold ${Math.round(sc * 0.36)}px monospace`;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(inst.sensorCode, pp.x, pp.y + r * 1.95);
    });

    // Axes
    const axO = proj({ x: -0.5, y: -0.5, z: 0 });
    const axX = proj({ x:  1.5, y: -0.5, z: 0 });
    const axY = proj({ x: -0.5, y:  1.5, z: 0 });
    const axZ = proj({ x: -0.5, y: -0.5, z: 2 });
    [
      { p: axX, lbl: 'E→W', c: '#10b981' },
      { p: axY, lbl: 'N→S', c: '#3b82f6' },
      { p: axZ, lbl: '↑Z',  c: '#ef4444' },
    ].forEach(({ p, lbl, c }) => {
      ctx.beginPath();
      ctx.moveTo(axO.x, axO.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.font = `bold ${Math.round(sc * 0.38)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(lbl, p.x, p.y - 4);
    });

    // Title
    const structLabels: Record<string,string> = {
      monolithic:'Монолит', frame:'Каркас', brick:'Кирпич', panel:'Панель',
      reinforced_concrete:'Ж/Б', steel:'Сталь', masonry:'Кладка', wood:'Дерево', mixed:'Смешан.'
    };
    ctx.font = `bold ${Math.round(sc * 0.38)}px sans-serif`;
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${floors} эт. · ${structLabels[schemaStruct] ?? schemaStruct} · ${BLDG_W.toFixed(0)}×${BLDG_D.toFixed(0)}м`,
      10, 18
    );
  }, [object, sensors, sensorWorld, floors, schemaStruct, BLDG_W, BLDG_D]);

  // Auto-rotate
  useEffect(() => {
    let rafId: number;
    let az = azimuth;
    const tick = () => {
      if (autoRef.current) {
        az = (az + 0.15) % 360;
        setAzimuth(az);
        draw(az, elevation);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [elevation, draw]);

  useEffect(() => {
    if (!autoRotate) draw(azimuth, elevation);
  }, [azimuth, elevation, autoRotate, draw]);

  const onMouseDown = (e: React.MouseEvent) => {
    setAutoRotate(false);
    drag.current = { startX: e.clientX, startY: e.clientY, az: azimuth, el: elevation };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const dAz = (e.clientX - drag.current.startX) * 0.5;
    const dEl = (e.clientY - drag.current.startY) * 0.3;
    const newAz = drag.current.az + dAz;
    const newEl = Math.max(-10, Math.min(70, drag.current.el - dEl));
    setAzimuth(newAz);
    setElevation(newEl);
    draw(newAz, newEl);
  };
  const onMouseUp = () => { drag.current = null; };

  const onMouseMoveHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || drag.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvasRef.current.width  / rect.width);
    const my = (e.clientY - rect.top)  * (canvasRef.current.height / rect.height);
    const sc = Math.min(canvasRef.current.width, canvasRef.current.height) * 0.055;
    const cx = canvasRef.current.width  * 0.48;
    const cy = canvasRef.current.height * 0.52;
    const r  = sc * 0.45 + 6;
    let found: Sensor | null = null;
    for (const inst of sensors) {
      const sw = sensorWorld(inst);
      const pp = project(sw, azimuth, elevation, sc, cx, cy);
      if (Math.hypot(mx - pp.x, my - pp.y) < r) { found = inst; break; }
    }
    setHoveredSensor(found);
  };

  const locLabel: Record<string, string> = {
    foundation:   'Фундамент',
    ground_floor: '1й этаж',
    mid_floor:    'Средний этаж',
    roof:         'Кровля',
    free_field:   'Свободное поле',
  };

  const structOptions = [
    { value: 'monolithic', label: 'Монолитный' },
    { value: 'frame',      label: 'Каркасный' },
    { value: 'brick',      label: 'Кирпичный' },
    { value: 'panel',      label: 'Панельный' },
    { value: 'reinforced_concrete', label: 'Ж/Б каркас' },
    { value: 'steel',  label: 'Стальной каркас' },
    { value: 'masonry',label: 'Кирпичная кладка' },
    { value: 'wood',   label: 'Деревянный' },
    { value: 'mixed',  label: 'Смешанный' },
  ];

  const handleSaveSchema = () => {
    onSaveSchema?.({ floors: schemaFloors, structuralSystem: schemaStruct, buildingWidth: schemaBldgW, buildingDepth: schemaBldgD });
    setShowSettings(false);
  };

  return (
    <div className="space-y-2">
      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
        <canvas
          ref={canvasRef}
          width={520}
          height={340}
          className="w-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
          onMouseMove={(e) => { onMouseMove(e); onMouseMoveHover(e); }}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        {/* Control bar */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {editMode && (
            <button
              className={`text-[10px] border px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800/80 text-slate-300 border-slate-600 hover:bg-slate-700'
              }`}
              onClick={() => setShowSettings(v => !v)}
            >
              <Settings className="h-3 w-3" />
              Параметры
            </button>
          )}
          <button
            className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-600 px-2 py-1 rounded hover:bg-slate-700 transition-colors flex items-center gap-1"
            onClick={() => { setAzimuth(-35); setElevation(28); setAutoRotate(true); }}
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <button
            className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-600 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
            onClick={() => setAutoRotate(v => !v)}
          >
            {autoRotate ? '⏸' : '▶'}
          </button>
        </div>

        {/* Hovered sensor tooltip */}
        {hoveredSensor && (
          <div className="absolute bottom-2 left-2 bg-slate-800/90 border border-slate-600 text-xs text-slate-200 rounded-lg px-3 py-2 pointer-events-none">
            <p className="font-bold text-white">{hoveredSensor.sensorCode}</p>
            <p className="text-slate-400">{locLabel[hoveredSensor.location ?? ''] ?? hoveredSensor.location}</p>
            {hoveredSensor.floor != null && <p className="text-slate-400">Этаж: {hoveredSensor.floor}</p>}
            <p className="text-slate-400">Оси: {hoveredSensor.axes}</p>
            <p className={hoveredSensor.isActive ? 'text-emerald-400' : 'text-red-400'}>
              {hoveredSensor.isActive ? '● Активен' : '○ Отключён'}
            </p>
          </div>
        )}
      </div>

      {/* Schema edit panel */}
      {editMode && showSettings && (
        <div className="bg-slate-900 border border-slate-600 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-blue-400" />
              Параметры 3D-схемы
            </p>
            <p className="text-[10px] text-slate-500">Изменения применяются сразу</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400">Этажность</Label>
              <Input
                type="number" min={1} max={50}
                value={schemaFloors}
                onChange={e => setSchemaFloors(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400">Конструктивная система</Label>
              <Select value={schemaStruct} onValueChange={setSchemaStruct}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {structOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400">Ширина здания (усл. ед.)</Label>
              <Input
                type="number" min={2} max={12} step={0.5}
                value={schemaBldgW}
                onChange={e => setSchemaBldgW(Math.max(2, parseFloat(e.target.value) || 4))}
                className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400">Глубина здания (усл. ед.)</Label>
              <Input
                type="number" min={2} max={10} step={0.5}
                value={schemaBldgD}
                onChange={e => setSchemaBldgD(Math.max(2, parseFloat(e.target.value) || 3))}
                className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800"
              onClick={() => {
                setSchemaFloors(Math.max(object.floors ?? 5, 1));
                setSchemaStruct(object.structuralSystem ?? 'monolithic');
                setSchemaBldgW(4.0);
                setSchemaBldgD(3.0);
              }}
            >
              Сбросить
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveSchema}
            >
              Сохранить в БД
            </Button>
          </div>
        </div>
      )}

      {/* Sensor legend */}
      {sensors.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 font-semibold">
            Датчики регистрации ({sensors.length})
          </p>
          <div className="space-y-1.5">
            {sensors.map(inst => {
              const loc = inst.location ?? 'ground_floor';
              const col = SENSOR_COLORS[loc] ?? '#94a3b8';
              const axes = (inst.axes ?? 'Z').split(',');
              return (
                <div key={inst.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col }} />
                    <span className="text-[11px] text-slate-300 font-mono">{inst.sensorCode}</span>
                    <span className="text-[10px] text-slate-500 truncate">{locLabel[loc] ?? loc}</span>
                    {inst.floor != null && (
                      <span className="text-[10px] text-slate-500">эт.{inst.floor}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {axes.map(ax => (
                      <span
                        key={ax}
                        className="text-[9px] font-bold px-1 rounded"
                        style={{ background: (AXIS_COLORS[ax.trim()] ?? '#64748b') + '33', color: AXIS_COLORS[ax.trim()] ?? '#94a3b8' }}
                      >
                        {ax.trim()}
                      </span>
                    ))}
                    <Badge
                      className={`text-[9px] h-4 ml-1 hover:bg-opacity-80 ${
                        inst.isActive
                          ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {inst.isActive ? 'ON' : 'OFF'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/50">
            {Object.entries(AXIS_COLORS).map(([ax, col]) => (
              <span key={ax} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                <span className="text-slate-400">{ax} {ax === 'Z' ? '(верт.)' : ax === 'NS' ? '(С→Ю)' : '(З→В)'}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {sensors.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-xs bg-slate-900/30 rounded-lg border border-slate-700/30">
          Датчики не привязаны к объекту
        </div>
      )}

      <p className="text-[10px] text-slate-500 text-center">
        Перетащите мышью для поворота · наведите на датчик для информации
      </p>
    </div>
  );
};

export default Building3DViewer;
