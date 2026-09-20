// Single source of truth for access control. Server middleware and client UI
// both read this table; the rows are docs/roles-specification.md verbatim.

export const ROLES = ['superadmin', 'designer', 'seismologist', 'data_analyst', 'device_manager', 'staff'] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  'monitoring', 'objects', 'sensors', 'stations', 'seismicMap', 'events', 'seismograms',
  'spectral', 'soil', 'mtsm', 'norms', 'calibration', 'settings', 'users', 'analytics', 'customers',
] as const;
export type Module = (typeof MODULES)[number];

export type Access = 'none' | 'read' | 'write';
export type Level = 'read' | 'write';

const W: Access = 'write', R: Access = 'read', N: Access = 'none';

//                  monitoring objects sensors stations seismicMap events seismograms spectral soil mtsm norms calibration settings users analytics customers
const ROW = (a: Access[]): Record<Module, Access> =>
  Object.fromEntries(MODULES.map((m, i) => [m, a[i]])) as Record<Module, Access>;

export const PERMISSIONS: Record<Role, Record<Module, Access>> = {
  superadmin:     ROW([W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W]),
  designer:       ROW([R, W, W, R, R, N, N, N, R, R, W, N, N, N, N, N]),
  seismologist:   ROW([R, R, R, R, W, W, W, W, W, W, R, R, N, N, N, N]),
  data_analyst:   ROW([R, R, N, N, R, W, W, W, R, W, R, N, N, N, N, N]),
  device_manager: ROW([W, R, W, W, N, N, R, N, N, N, N, W, N, N, N, N]),
  staff:          ROW([R, R, N, N, R, R, N, N, N, N, N, N, N, N, N, N]),
};

export function can(role: Role | null | undefined, module: Module, level: Level): boolean {
  if (!role || !(role in PERMISSIONS)) return false;
  const access = PERMISSIONS[role][module];
  return access === 'write' || (access === 'read' && level === 'read');
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Суперадмин',
  designer: 'Конструктор',
  seismologist: 'Сейсмолог',
  data_analyst: 'Аналитик данных',
  device_manager: 'Инженер по датчикам',
  staff: 'Представитель застройщика',
};

export const MODULE_LABELS: Record<Module, string> = {
  monitoring: 'Онлайн-мониторинг',
  objects: 'Объекты инфраструктуры',
  sensors: '3D-схема / датчики объекта',
  stations: 'Станции и устройства',
  seismicMap: 'Карта сейсмичности',
  events: 'История событий',
  seismograms: 'Сейсмограммы',
  spectral: 'Спектральный анализ',
  soil: 'Профили грунтов',
  mtsm: 'Расчёт усиления (МТСМ)',
  norms: 'Нормативная база',
  calibration: 'Калибровка датчиков',
  settings: 'Настройки системы',
  users: 'Управление пользователями',
  analytics: 'Статистика посещений',
  customers: 'Заказчики',
};
