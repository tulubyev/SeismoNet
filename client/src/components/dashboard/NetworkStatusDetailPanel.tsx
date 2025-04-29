import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Station, NetworkStatusUpdate } from '@shared/schema';
import { RefreshCw, TriangleAlert, XCircle, InfoIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface NetworkStatusDetailPanelProps {
  stations: Station[];
  systemStatus: NetworkStatusUpdate;
}

const NetworkStatusDetailPanel: FC<NetworkStatusDetailPanelProps> = ({ 
  stations, 
  systemStatus 
}) => {
  // Count stations by status
  const onlineStations = stations.filter(s => s.status === 'online').length;
  const degradedStations = stations.filter(s => s.status === 'degraded').length;
  const offlineStations = stations.filter(s => s.status === 'offline').length;
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-dark">Network Status</h2>
        <button className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-dark">
          <RefreshCw className="h-3 w-3 inline mr-1" /> Refresh
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-DEFAULT mb-2">Station Status</h3>
          <div className="flex">
            <div className="flex-1 text-center p-2 border-r border-slate-light">
              <div className="text-2xl font-semibold text-status-success">{onlineStations}</div>
              <div className="text-xs text-slate-DEFAULT mt-1">Online</div>
            </div>
            <div className="flex-1 text-center p-2 border-r border-slate-light">
              <div className="text-2xl font-semibold text-status-warning">{degradedStations}</div>
              <div className="text-xs text-slate-DEFAULT mt-1">Degraded</div>
            </div>
            <div className="flex-1 text-center p-2">
              <div className="text-2xl font-semibold text-status-danger">{offlineStations}</div>
              <div className="text-xs text-slate-DEFAULT mt-1">Offline</div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-light">
          <h3 className="text-sm font-medium text-slate-DEFAULT mb-2">System Health</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Data Processing</span>
                <span className="text-status-success">
                  {systemStatus.dataProcessingHealth >= 95 ? 'Excellent' : 
                   systemStatus.dataProcessingHealth >= 80 ? 'Good' : 
                   systemStatus.dataProcessingHealth >= 60 ? 'Moderate' : 'Poor'}
                </span>
              </div>
              <Progress value={systemStatus.dataProcessingHealth} className="h-1.5" />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Network Connectivity</span>
                <span className="text-status-success">
                  {systemStatus.networkConnectivityHealth >= 95 ? 'Excellent' : 
                   systemStatus.networkConnectivityHealth >= 80 ? 'Good' : 
                   systemStatus.networkConnectivityHealth >= 60 ? 'Moderate' : 'Poor'}
                </span>
              </div>
              <Progress value={systemStatus.networkConnectivityHealth} className="h-1.5" />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Storage Capacity</span>
                <span className="text-status-warning">
                  {systemStatus.storageCapacityHealth >= 95 ? 'Excellent' : 
                   systemStatus.storageCapacityHealth >= 80 ? 'Good' : 
                   systemStatus.storageCapacityHealth >= 60 ? 'Moderate' : 'Poor'}
                </span>
              </div>
              <Progress value={systemStatus.storageCapacityHealth} className="h-1.5 bg-slate-light">
                <div 
                  className="h-full bg-status-warning rounded-full"
                  style={{ width: `${systemStatus.storageCapacityHealth}%` }}
                ></div>
              </Progress>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>API Performance</span>
                <span className="text-status-success">
                  {systemStatus.apiPerformanceHealth >= 95 ? 'Excellent' : 
                   systemStatus.apiPerformanceHealth >= 80 ? 'Good' : 
                   systemStatus.apiPerformanceHealth >= 60 ? 'Moderate' : 'Poor'}
                </span>
              </div>
              <Progress value={systemStatus.apiPerformanceHealth} className="h-1.5" />
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-light">
          <h3 className="text-sm font-medium text-slate-DEFAULT mb-2">Recent Issues</h3>
          <div className="space-y-2">
            <div className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-status-warning bg-opacity-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TriangleAlert className="h-3 w-3 text-status-warning" />
              </div>
              <div className="ml-2">
                <p className="text-xs text-slate-dark">Connection timeout on SOCAL-15</p>
                <p className="text-xs text-slate-DEFAULT">24 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-status-danger bg-opacity-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <XCircle className="h-3 w-3 text-status-danger" />
              </div>
              <div className="ml-2">
                <p className="text-xs text-slate-dark">ALASKA-09 station offline</p>
                <p className="text-xs text-slate-DEFAULT">1 hour ago</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-status-info bg-opacity-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <InfoIcon className="h-3 w-3 text-status-info" />
              </div>
              <div className="ml-2">
                <p className="text-xs text-slate-dark">Scheduled maintenance for HAWAII cluster</p>
                <p className="text-xs text-slate-DEFAULT">Tomorrow, 02:00 UTC</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NetworkStatusDetailPanel;
