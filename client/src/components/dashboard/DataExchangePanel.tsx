import { FC, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ResearchNetwork } from '@shared/schema';
import { Globe, Earth, GlobeLock, Goal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataExchangePanelProps {
  researchNetworks: ResearchNetwork[];
}

const DataExchangePanel: FC<DataExchangePanelProps> = ({ researchNetworks }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  
  // Setup Chart.js when component mounts
  useEffect(() => {
    // Load Chart.js if not available
    if (!window.Chart && !document.getElementById('chartjs-script')) {
      const script = document.createElement('script');
      script.id = 'chartjs-script';
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
      script.onload = initializeChart;
      document.head.appendChild(script);
    } else if (window.Chart) {
      initializeChart();
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, []);
  
  // Update chart when networks change
  useEffect(() => {
    updateChart();
  }, [researchNetworks]);
  
  const initializeChart = () => {
    if (!chartRef.current || !window.Chart) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Create mock data for the chart
    const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const data = {
      labels,
      datasets: [
        {
          label: 'Data Exchange',
          data: Array.from({ length: 24 }, () => Math.random() * 6 + 1),
          borderColor: 'hsl(var(--chart-1))',
          backgroundColor: 'hsla(var(--chart-1), 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
    
    chartInstanceRef.current = new window.Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            grid: {
              color: 'hsla(var(--border), 0.2)',
            },
            ticks: {
              callback: (value: number) => `${value} MB/s`
            }
          }
        }
      }
    });
  };
  
  const updateChart = () => {
    if (!chartInstanceRef.current) return;
    
    // Update chart with new data
    chartInstanceRef.current.data.datasets[0].data = Array.from(
      { length: 24 }, 
      () => Math.random() * 6 + 1
    );
    chartInstanceRef.current.update();
  };
  
  // Get appropriate icon for network based on region
  const getNetworkIcon = (network: ResearchNetwork) => {
    const region = network.region?.toLowerCase() || '';
    
    if (region.includes('europe') || region.includes('mediterranean') || region.includes('germany')) {
      return <Earth className="h-4 w-4 text-secondary" />;
    } 
    if (region.includes('asia') || region.includes('japan')) {
      return <GlobeLock className="h-4 w-4 text-accent" />;
    }
    if (region.includes('united states') || region.includes('america')) {
      return <Goal className="h-4 w-4 text-primary" />;
    }
    
    return <Globe className="h-4 w-4 text-slate-DEFAULT" />;
  };
  
  // Get background color class for network icon
  const getNetworkIconBg = (network: ResearchNetwork) => {
    const region = network.region?.toLowerCase() || '';
    
    if (region.includes('europe') || region.includes('mediterranean') || region.includes('germany')) {
      return 'bg-secondary bg-opacity-10';
    } 
    if (region.includes('asia') || region.includes('japan')) {
      return 'bg-accent bg-opacity-10';
    }
    if (region.includes('united states') || region.includes('america')) {
      return 'bg-primary bg-opacity-10';
    }
    
    return 'bg-slate-DEFAULT bg-opacity-10';
  };
  
  // Total data transferred
  const totalDataTransferred = researchNetworks.reduce(
    (sum, network) => sum + (network.syncedDataVolume || 0), 
    0
  ).toFixed(1);
  
  // Current transfer rate (mock calculation)
  const currentTransferRate = (researchNetworks.length * 1.2).toFixed(1);
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-dark">Data Exchange</h2>
        <div className="flex gap-2">
          <Select defaultValue="24h">
            <SelectTrigger className="text-xs h-8 w-auto min-w-[120px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <div>
            <span className="font-medium text-slate-dark">Total Data Transferred</span>
            <div className="text-2xl font-semibold mt-1">{totalDataTransferred} GB</div>
          </div>
          <div>
            <span className="font-medium text-slate-dark">Current Transfer Rate</span>
            <div className="text-2xl font-semibold mt-1 text-right">{currentTransferRate} MB/s</div>
          </div>
        </div>
        
        <div className="h-48">
          <canvas ref={chartRef}></canvas>
        </div>
        
        <div className="pt-4 border-t border-slate-light">
          <h3 className="text-sm font-medium text-slate-DEFAULT mb-3">Global Research Networks</h3>
          <div className="space-y-2">
            {researchNetworks.map(network => (
              <div key={network.networkId} className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded ${getNetworkIconBg(network)} flex items-center justify-center`}>
                    {getNetworkIcon(network)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-dark">{network.name}</p>
                    <p className="text-xs text-slate-DEFAULT">{network.region}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-dark">{network.syncedDataVolume?.toFixed(1)} GB</p>
                  <p className={`text-xs ${
                    network.connectionStatus === 'connected' 
                      ? 'text-status-success' 
                      : network.connectionStatus === 'syncing' 
                        ? 'text-status-warning' 
                        : 'text-status-danger'
                  }`}>
                    {network.connectionStatus.charAt(0).toUpperCase() + network.connectionStatus.slice(1)}
                  </p>
                </div>
              </div>
            ))}
            
            {researchNetworks.length === 0 && (
              <div className="py-3 text-center text-slate-DEFAULT">
                <p>No research networks connected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DataExchangePanel;
