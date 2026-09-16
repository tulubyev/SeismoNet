import { SeismicDataPoint } from '@shared/schema';

// Build an SVG waveform (polyline) from normalized seismic samples in [-1, 1].
export function createWaveformSVG(
  dataPoints: SeismicDataPoint[],
  width: number,
  height: number,
  color: string
): string {
  const pad = 10;
  const n = dataPoints.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : 0);
  const y = (v: number) => height - pad - ((Math.max(-1, Math.min(1, v)) + 1) / 2) * (height - 2 * pad);
  const points = dataPoints.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" points="${points}"/></svg>`
  );
}

// Generate random waveform data for testing
export function generateRandomWaveformData(
  length: number,
  baseAmplitude: number = 0.5,
  noiseLevel: number = 0.2
): SeismicDataPoint[] {
  const data: SeismicDataPoint[] = [];
  const now = Date.now();
  for (let i = 0; i < length; i++) {
    const timestamp = now - (length - 1 - i) * 1000;
    const value = Math.sin(i / 5) * baseAmplitude + (Math.random() - 0.5) * noiseLevel;
    data.push({ timestamp, value });
  }
  return data;
}

// Render waveform visualization into an HTML element
export function renderWaveform(
  elementId: string,
  dataPoints: SeismicDataPoint[],
  color: string = '#2563eb'
): void {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = createWaveformSVG(dataPoints, element.clientWidth, element.clientHeight, color);
}
