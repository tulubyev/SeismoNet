import { FC, useState } from 'react';
import { Station } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Search, Filter, MapPin, Activity, Signal, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface StationListProps {
  stations: Station[];
}

const StationList: FC<StationListProps> = ({ stations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Filter stations based on search term and status filter
  const filteredStations = stations.filter(station => {
    const matchesSearch = 
      station.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (station.location && station.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' ||
      station.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Helper to determine status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success bg-opacity-10 text-status-success">
            Online
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-warning bg-opacity-10 text-status-warning">
            Degraded
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-danger bg-opacity-10 text-status-danger">
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info bg-opacity-10 text-status-info">
            Unknown
          </span>
        );
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-DEFAULT h-4 w-4" />
              <Input 
                placeholder="Search stations..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stations</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="degraded">Degraded</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Rate</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStations.map(station => (
                  <TableRow key={station.stationId}>
                    <TableCell className="font-medium">{station.stationId}</TableCell>
                    <TableCell>{station.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-slate-DEFAULT" />
                        <span>{station.location || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-slate-DEFAULT">
                        {station.latitude.toString()}° {parseFloat(station.latitude.toString()) >= 0 ? 'N' : 'S'}, 
                        {station.longitude.toString()}° {parseFloat(station.longitude.toString()) >= 0 ? 'E' : 'W'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(station.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Signal className="h-3 w-3 mr-1 text-slate-DEFAULT" />
                        <span>{station.dataRate ? `${station.dataRate.toFixed(1)} MB/s` : 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-slate-DEFAULT" />
                        <span>{format(new Date(station.lastUpdate), 'MMM d, HH:mm:ss')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <Activity className="h-3 w-3 mr-1" />
                          <span className="text-xs">View Data</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="text-xs">Locate</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredStations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-slate-DEFAULT">No stations found</p>
                      {searchTerm && (
                        <p className="text-sm text-slate-DEFAULT mt-1">
                          Try a different search term or clear the filters
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-slate-DEFAULT">
              Showing {filteredStations.length} of {stations.length} stations
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-slate-dark mb-4">Network Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-ultralight rounded-lg p-4">
              <div className="text-sm font-medium text-slate-DEFAULT mb-1">Total Stations</div>
              <div className="text-2xl font-semibold">{stations.length}</div>
              <div className="text-xs text-slate-DEFAULT mt-1">Distributed across global network</div>
            </div>
            
            <div className="bg-slate-ultralight rounded-lg p-4">
              <div className="text-sm font-medium text-slate-DEFAULT mb-1">Online</div>
              <div className="text-2xl font-semibold text-status-success">
                {stations.filter(s => s.status === 'online').length}
              </div>
              <div className="text-xs text-slate-DEFAULT mt-1">
                {((stations.filter(s => s.status === 'online').length / stations.length) * 100).toFixed(0)}% of total network
              </div>
            </div>
            
            <div className="bg-slate-ultralight rounded-lg p-4">
              <div className="text-sm font-medium text-slate-DEFAULT mb-1">Degraded</div>
              <div className="text-2xl font-semibold text-status-warning">
                {stations.filter(s => s.status === 'degraded').length}
              </div>
              <div className="text-xs text-slate-DEFAULT mt-1">
                Performance or connectivity issues
              </div>
            </div>
            
            <div className="bg-slate-ultralight rounded-lg p-4">
              <div className="text-sm font-medium text-slate-DEFAULT mb-1">Offline</div>
              <div className="text-2xl font-semibold text-status-danger">
                {stations.filter(s => s.status === 'offline').length}
              </div>
              <div className="text-xs text-slate-DEFAULT mt-1">
                Requires maintenance or investigation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StationList;
