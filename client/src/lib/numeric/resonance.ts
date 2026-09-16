


export type RiskLevel = 'green' | 'yellow' | 'red';

export function calcRisk(T_building: number, T_soil: number): { risk: RiskLevel; ratio: number; label: string; rec: string } {
  const ratio = Math.abs(T_soil - T_building) / Math.max(T_soil, T_building);
  if (ratio < 0.15) return { risk: 'red', ratio,
    label: `ВЫСОКИЙ РИСК (|ΔT|/T=${(ratio*100).toFixed(1)}% < 15%)`,
    rec: 'Детальное обследование; рассмотреть усиление или сейсмоизоляцию. Обязательна инструментальная проверка динамических параметров здания.' };
  if (ratio < 0.30) return { risk: 'yellow', ratio,
    label: `УМЕРЕННЫЙ РИСК (|ΔT|/T=${(ratio*100).toFixed(1)}%, 15–30%)`,
    rec: 'Рекомендуется инструментальный мониторинг и расчёт МКЭ. При проектировании — рассмотреть изменение этажности.' };
  return { risk: 'green', ratio,
    label: `РИСК НИЗКИЙ (|ΔT|/T=${(ratio*100).toFixed(1)}% > 30%)`,
    rec: 'Резонанс грунт–здание маловероятен при данных условиях.' };
}
