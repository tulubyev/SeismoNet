import { FC, useState } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity,
  Clipboard, 
  FileText, 
  Camera, 
  Mic, 
  UploadCloud, 
  Save,
  Gauge,
  MapPin,
  Mountain,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const MobileDataCollection: FC = () => {
  const { stations } = useSeismicData();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('record');
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(60);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [samplingRate, setSamplingRate] = useState([100]);
  const [recordingQuality, setRecordingQuality] = useState('medium');
  const [gpsCoordinates, setGpsCoordinates] = useState({ lat: '', lng: '' });
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [customEventInfo, setCustomEventInfo] = useState({
    eventType: 'seismic',
    magnitude: '',
    depth: '',
    description: ''
  });
  
  // Simulate starting a recording
  const handleStartRecording = () => {
    if (!activeStation) {
      toast({
        title: "No station selected",
        description: "Please select a station before recording",
        variant: "destructive"
      });
      return;
    }
    
    setIsRecording(true);
    setRecordingProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setRecordingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRecording(false);
          toast({
            title: "Recording completed",
            description: `Captured ${recordDuration}s of data at ${samplingRate}Hz`
          });
          return 100;
        }
        return prev + (100 / (recordDuration / 2));
      });
    }, 500);
  };
  
  // Simulate data upload
  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          toast({
            title: "Upload complete",
            description: "Data has been saved to the central repository"
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };
  
  // Simulate saving local data
  const handleSaveLocal = () => {
    toast({
      title: "Data saved locally",
      description: "Will be synced when connection is available"
    });
  };
  
  // Simulate submitting a custom event
  const handleSubmitEvent = () => {
    toast({
      title: "Event submitted",
      description: "Your custom event has been recorded"
    });
    
    setCustomEventInfo({
      eventType: 'seismic',
      magnitude: '',
      depth: '',
      description: ''
    });
  };
  
  return (
    <div className="p-4 pb-16">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="record" className="text-xs">
            <Activity className="h-4 w-4 mr-1" />
            Record
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            <UploadCloud className="h-4 w-4 mr-1" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            Event Log
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="record" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Record Waveform Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="station-select" className="flex items-center text-sm mb-2">
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  Select Station
                </Label>
                <Select
                  value={activeStation || ''}
                  onValueChange={setActiveStation}
                >
                  <SelectTrigger id="station-select">
                    <SelectValue placeholder="Select a station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map(station => (
                      <SelectItem 
                        key={station.id} 
                        value={station.stationId}
                        disabled={station.status !== 'online'}
                      >
                        {station.name} - {station.status === 'online' ? 
                          <span className="text-green-500">Online</span> : 
                          <span className="text-red-500">Offline</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="recording-quality" className="flex items-center text-sm mb-2">
                  <Gauge className="h-4 w-4 mr-2 text-amber-500" />
                  Recording Quality
                </Label>
                <RadioGroup 
                  id="recording-quality" 
                  value={recordingQuality} 
                  onValueChange={setRecordingQuality}
                  className="flex justify-between space-x-2"
                >
                  <div className="flex flex-col items-center space-y-1 flex-1">
                    <RadioGroupItem 
                      value="low" 
                      id="r-low" 
                      className="peer sr-only" 
                    />
                    <Label 
                      htmlFor="r-low" 
                      className="peer-data-[state=checked]:border-primary 
                      peer-data-[state=checked]:bg-primary/10 h-20 w-full
                      flex flex-col items-center justify-center rounded-lg
                      border-2 border-muted cursor-pointer hover:bg-accent"
                    >
                      <span>Low</span>
                      <span className="text-xs text-muted-foreground">50Hz</span>
                    </Label>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-1 flex-1">
                    <RadioGroupItem 
                      value="medium" 
                      id="r-medium" 
                      className="peer sr-only" 
                    />
                    <Label 
                      htmlFor="r-medium" 
                      className="peer-data-[state=checked]:border-primary 
                      peer-data-[state=checked]:bg-primary/10 h-20 w-full
                      flex flex-col items-center justify-center rounded-lg
                      border-2 border-muted cursor-pointer hover:bg-accent"
                    >
                      <span>Medium</span>
                      <span className="text-xs text-muted-foreground">100Hz</span>
                    </Label>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-1 flex-1">
                    <RadioGroupItem 
                      value="high" 
                      id="r-high" 
                      className="peer sr-only" 
                    />
                    <Label 
                      htmlFor="r-high" 
                      className="peer-data-[state=checked]:border-primary 
                      peer-data-[state=checked]:bg-primary/10 h-20 w-full
                      flex flex-col items-center justify-center rounded-lg
                      border-2 border-muted cursor-pointer hover:bg-accent"
                    >
                      <span>High</span>
                      <span className="text-xs text-muted-foreground">200Hz</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-purple-500" />
                    Recording Duration (seconds)
                  </Label>
                  <span className="text-sm font-medium">{recordDuration}s</span>
                </div>
                <Slider
                  value={[recordDuration]}
                  onValueChange={(vals) => setRecordDuration(vals[0])}
                  min={10}
                  max={300}
                  step={10}
                  disabled={isRecording}
                />
              </div>
              
              <div>
                <Label htmlFor="gps-auto" className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    Use Current GPS Location
                  </div>
                  <Switch id="gps-auto" defaultChecked />
                </Label>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="gps-lat" className="text-xs">Latitude</Label>
                    <Input 
                      id="gps-lat" 
                      value={gpsCoordinates.lat}
                      onChange={(e) => setGpsCoordinates({...gpsCoordinates, lat: e.target.value})}
                      placeholder="0.000000"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="gps-lng" className="text-xs">Longitude</Label>
                    <Input 
                      id="gps-lng" 
                      value={gpsCoordinates.lng}
                      onChange={(e) => setGpsCoordinates({...gpsCoordinates, lng: e.target.value})}
                      placeholder="0.000000"
                      disabled
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes" className="flex items-center text-sm mb-2">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Notes
                </Label>
                <Textarea 
                  id="notes"
                  placeholder="Add notes about this recording..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              {isRecording ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Recording in progress...</span>
                    <span>{Math.round(recordingProgress)}%</span>
                  </div>
                  <Progress value={recordingProgress} className="h-2" />
                  
                  <Button 
                    variant="destructive" 
                    className="w-full mt-4"
                    onClick={() => setIsRecording(false)}
                  >
                    Stop Recording
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="secondary" 
                    className="flex items-center"
                    onClick={handleSaveLocal}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Load Template
                  </Button>
                  
                  <Button 
                    className="flex items-center"
                    onClick={handleStartRecording}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upload Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <UploadCloud className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600 mb-2">Drag and drop files here or click to browse</p>
                <p className="text-xs text-slate-500">Supported formats: .mseed, .sac, .gse, .segy</p>
                
                <Label 
                  htmlFor="file-upload"
                  className="inline-block mt-3 px-4 py-2 text-xs font-medium rounded-md bg-primary text-white cursor-pointer"
                >
                  Browse Files
                </Label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  multiple
                  accept=".mseed,.sac,.gse,.segy,.txt"
                />
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Selected Files (3)</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                      <span>station_12_20230516.mseed</span>
                    </div>
                    <span className="text-xs">2.4 MB</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-green-500" />
                      <span>event_metadata.txt</span>
                    </div>
                    <span className="text-xs">12 KB</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                    <div className="flex items-center">
                      <Camera className="h-4 w-4 mr-2 text-amber-500" />
                      <span>field_photo.jpg</span>
                    </div>
                    <span className="text-xs">1.1 MB</span>
                  </div>
                </div>
              </div>
              
              {isUploading ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Uploading files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="secondary" 
                    className="flex items-center"
                    onClick={handleSaveLocal}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Locally
                  </Button>
                  
                  <Button 
                    className="flex items-center"
                    onClick={handleUpload}
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Submit Field Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="event-type" className="flex items-center text-sm mb-2">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  Event Type
                </Label>
                <Select
                  value={customEventInfo.eventType}
                  onValueChange={(val) => setCustomEventInfo({...customEventInfo, eventType: val})}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seismic">Seismic Event</SelectItem>
                    <SelectItem value="landslide">Landslide</SelectItem>
                    <SelectItem value="eruption">Volcanic Activity</SelectItem>
                    <SelectItem value="equipment">Equipment Issue</SelectItem>
                    <SelectItem value="other">Other Observation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="magnitude" className="flex items-center text-sm mb-2">
                    <Activity className="h-4 w-4 mr-2 text-red-500" />
                    Magnitude Est.
                  </Label>
                  <Input 
                    id="magnitude"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 3.5"
                    value={customEventInfo.magnitude}
                    onChange={(e) => setCustomEventInfo({...customEventInfo, magnitude: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="depth" className="flex items-center text-sm mb-2">
                    <Mountain className="h-4 w-4 mr-2 text-blue-500" />
                    Depth Est. (km)
                  </Label>
                  <Input 
                    id="depth"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.2"
                    value={customEventInfo.depth}
                    onChange={(e) => setCustomEventInfo({...customEventInfo, depth: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="event-description" className="flex items-center text-sm mb-2">
                  <Clipboard className="h-4 w-4 mr-2 text-slate-500" />
                  Description
                </Label>
                <Textarea 
                  id="event-description"
                  placeholder="Describe the event or observation in detail..."
                  rows={4}
                  value={customEventInfo.description}
                  onChange={(e) => setCustomEventInfo({...customEventInfo, description: e.target.value})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="attach-media" className="flex items-center text-sm">
                  <Camera className="h-4 w-4 mr-2 text-pink-500" />
                  Attach Media
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-8"
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  Capture
                </Button>
              </div>
              
              <div className="pt-2">
                <Button 
                  className="w-full flex items-center justify-center"
                  onClick={handleSubmitEvent}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Event
                </Button>
              </div>
              
              <div className="border-t border-slate-200 pt-3 mt-4">
                <h3 className="text-sm font-medium mb-2">Recent Submissions</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                    <div>
                      <div className="font-medium flex items-center">
                        <Activity className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                        Seismic Event
                      </div>
                      <div className="text-xs text-slate-500">Today, 10:23 AM</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      M 2.8
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                    <div>
                      <div className="font-medium flex items-center">
                        <WrenchIcon className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                        Equipment Issue
                      </div>
                      <div className="text-xs text-slate-500">Yesterday, 4:15 PM</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      Station 5
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileDataCollection;