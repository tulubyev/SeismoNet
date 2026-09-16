import { FC, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { ResearchNetwork } from '@shared/schema';
import { Globe, Earth, GlobeLock, Goal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataExchangePanelProps {
  researchNetworks: ResearchNetwork[];
}

const DataExchangePanel: FC<DataExchangePanelProps> = ({ researchNetworks }) => {
  // Mock 24-hour throughput series (the real feed is not wired up yet);
  // regenerated when the network list changes, like the original Chart.js code.
  const throughput = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, mbps: +(Math.random() * 6 + 1).toFixed(2) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [researchNetworks],
  );

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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughput} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v: number) => `${v} MB/s`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v} MB/s`, 'Throughput']} />
              <Area type="monotone" dataKey="mbps" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
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
