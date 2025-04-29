import * as d3 from 'd3';

interface WaveformOptions {
  containerId: string;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  animated?: boolean;
  timeLabels?: boolean;
  labelCount?: number;
}

/**
 * Renders a seismic waveform in the specified container
 */
export function renderWaveform(data: number[], options: WaveformOptions) {
  const {
    containerId,
    width = 0,
    height = 80,
    color = '#2563eb',
    backgroundColor = 'transparent',
    showGrid = true,
    animated = true,
    timeLabels = true,
    labelCount = 6
  } = options;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear previous content
  container.innerHTML = '';

  // Get actual width from container if not specified
  const actualWidth = width || container.clientWidth;
  
  // Create SVG element
  const svg = d3.select(container)
    .append('svg')
    .attr('width', actualWidth)
    .attr('height', height)
    .style('background', backgroundColor);

  // Add grid lines if requested
  if (showGrid) {
    const gridGroup = svg.append('g')
      .attr('class', 'grid-lines');

    // Horizontal grid lines
    const horizontalGridCount = 4;
    for (let i = 1; i < horizontalGridCount; i++) {
      gridGroup.append('line')
        .attr('x1', 0)
        .attr('y1', height * (i / horizontalGridCount))
        .attr('x2', actualWidth)
        .attr('y2', height * (i / horizontalGridCount))
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5);
    }

    // Vertical grid lines
    const verticalGridCount = Math.min(data.length - 1, 10);
    for (let i = 1; i < verticalGridCount; i++) {
      gridGroup.append('line')
        .attr('x1', actualWidth * (i / verticalGridCount))
        .attr('y1', 0)
        .attr('x2', actualWidth * (i / verticalGridCount))
        .attr('y2', height)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5);
    }
  }

  // Create scales
  const xScale = d3.scaleLinear()
    .domain([0, data.length - 1])
    .range([0, actualWidth]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(data) || -1, d3.max(data) || 1])
    .range([height - 5, 5]);

  // Create line generator
  const line = d3.line<number>()
    .x((_, i) => xScale(i))
    .y(d => yScale(d))
    .curve(d3.curveMonotoneX);

  // Create path
  const path = svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('d', line);

  // Add animation if requested
  if (animated) {
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
    
    path.attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);
  }
  
  // Add time labels if requested
  if (timeLabels) {
    const labelGroup = svg.append('g')
      .attr('class', 'time-labels');
    
    for (let i = 0; i < labelCount; i++) {
      const x = (actualWidth / (labelCount - 1)) * i;
      const minutes = -10 + (10 * i / (labelCount - 1));
      
      const label = minutes === 0 ? 'Now' : `${minutes.toFixed(0)}m`;
      
      labelGroup.append('text')
        .attr('x', x)
        .attr('y', height + 12)
        .attr('text-anchor', i === 0 ? 'start' : (i === labelCount - 1 ? 'end' : 'middle'))
        .attr('font-size', '10px')
        .attr('fill', '#64748b')
        .text(label);
    }
  }
}

/**
 * Generate synthetic waveform data for testing or initial display
 */
export function generateSyntheticWaveform(
  length: number = 100,
  amplitude: number = 1,
  frequency: number = 0.1
): number[] {
  const data: number[] = [];
  
  for (let i = 0; i < length; i++) {
    const t = i / length;
    
    // Base sine wave
    const baseWave = Math.sin(2 * Math.PI * frequency * i);
    
    // Add some random noise
    const noise = Math.random() * 0.2 - 0.1;
    
    // Add sudden spike for "event" simulation
    const spike = (i > length * 0.6 && i < length * 0.7) 
      ? Math.sin((i - length * 0.6) * 0.5) * 1.5 
      : 0;
    
    data.push(baseWave * amplitude + noise + spike);
  }
  
  return data;
}

/**
 * Create a real-time updating waveform with new data points
 */
export function createRealtimeWaveform(
  containerId: string, 
  options: WaveformOptions = { containerId }
) {
  const bufferSize = 100;
  let buffer = Array(bufferSize).fill(0);
  
  // Initial render
  renderWaveform(buffer, options);
  
  // Function to add a new data point
  function addDataPoint(value: number) {
    buffer = [...buffer.slice(1), value];
    renderWaveform(buffer, options);
  }
  
  return {
    addDataPoint,
    getCurrentBuffer: () => [...buffer],
    reset: () => {
      buffer = Array(bufferSize).fill(0);
      renderWaveform(buffer, options);
    }
  };
}
