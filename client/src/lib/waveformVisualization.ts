import * as d3 from 'd3';
import { SeismicDataPoint } from '@shared/schema';

// Create SVG waveform visualization from seismic data points
export function createWaveformSVG(
  dataPoints: SeismicDataPoint[],
  width: number,
  height: number,
  color: string
): string {
  // Set up SVG container
  const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('xmlns', 'http://www.w3.org/2000/svg');
  
  // Create scales
  const xScale = d3.scaleLinear()
    .domain([0, dataPoints.length - 1])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([-1, 1]) // Normalized values between -1 and 1
    .range([height - 10, 10]); // Leave some padding
  
  // Create line generator
  const line = d3.line<SeismicDataPoint>()
    .x((d, i) => xScale(i))
    .y(d => yScale(d.value))
    .curve(d3.curveCardinal);
  
  // Add the line path
  svg.append('path')
    .datum(dataPoints)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('d', line);
  
  // Convert SVG to string
  return svg.node()!.outerHTML;
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
    // Use sine wave with some noise for realistic seismic data
    const timestamp = now - (length - 1 - i) * 1000;
    const baseValue = Math.sin(i / 5) * baseAmplitude;
    const noise = (Math.random() - 0.5) * noiseLevel;
    const value = baseValue + noise;
    
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
  
  const width = element.clientWidth;
  const height = element.clientHeight;
  
  const svg = createWaveformSVG(dataPoints, width, height, color);
  element.innerHTML = svg;
}
