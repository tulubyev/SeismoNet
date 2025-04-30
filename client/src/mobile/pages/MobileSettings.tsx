import { FC, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Bell, 
  Moon, 
  Languages, 
  DownloadCloud, 
  Battery, 
  Gauge, 
  Signal, 
  Shield, 
  HardDrive,
  HelpCircle,
  FileCog,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MobileSettings: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataUpdateMode, setDataUpdateMode] = useState('wifi-only');
  const [language, setLanguage] = useState('english');
  const [samplingRate, setSamplingRate] = useState([100]);
  const [storageLimit, setStorageLimit] = useState([75]);
  const [batteryMode, setBatteryMode] = useState('balanced');
  
  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated",
    });
  };
  
  return (
    <div className="p-4 pb-16">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-primary" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mr-4">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="font-medium">{user?.fullName || 'User'}</h3>
              <p className="text-sm text-slate-500">{user?.email || ''}</p>
              <div className="text-xs mt-1 bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 inline-block capitalize">
                {user?.role || 'User'}
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="w-full">
            Edit Profile
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Settings className="h-5 w-5 mr-2 text-primary" />
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="flex items-center text-sm">
              <Moon className="h-4 w-4 mr-2" />
              Dark Mode
            </Label>
            <Switch 
              id="dark-mode" 
              checked={darkMode} 
              onCheckedChange={setDarkMode} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="flex items-center text-sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Label>
            <Switch 
              id="notifications" 
              checked={notificationsEnabled} 
              onCheckedChange={setNotificationsEnabled} 
            />
          </div>
          
          <div>
            <Label htmlFor="language" className="flex items-center text-sm mb-2">
              <Languages className="h-4 w-4 mr-2" />
              Language
            </Label>
            <Select 
              value={language} 
              onValueChange={setLanguage}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="data-update" className="flex items-center text-sm mb-2">
              <DownloadCloud className="h-4 w-4 mr-2" />
              Data Synchronization
            </Label>
            <Select 
              value={dataUpdateMode} 
              onValueChange={setDataUpdateMode}
            >
              <SelectTrigger id="data-update">
                <SelectValue placeholder="Select update mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wifi-only">Wi-Fi Only</SelectItem>
                <SelectItem value="any-network">Any Network</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <FileCog className="h-5 w-5 mr-2 text-primary" />
            Field Collection Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="sampling-rate" className="flex items-center text-sm">
                <Gauge className="h-4 w-4 mr-2" />
                Default Sampling Rate (Hz)
              </Label>
              <span className="text-sm font-medium">{samplingRate}Hz</span>
            </div>
            <Slider
              id="sampling-rate"
              min={10}
              max={1000}
              step={10}
              value={samplingRate}
              onValueChange={setSamplingRate}
            />
          </div>
          
          <div>
            <Label htmlFor="battery-mode" className="flex items-center text-sm mb-2">
              <Battery className="h-4 w-4 mr-2" />
              Battery Usage Mode
            </Label>
            <Select 
              value={batteryMode} 
              onValueChange={setBatteryMode}
            >
              <SelectTrigger id="battery-mode">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="power-save">Power Save</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="storage-limit" className="flex items-center text-sm">
                <HardDrive className="h-4 w-4 mr-2" />
                Storage Usage Limit (%)
              </Label>
              <span className="text-sm font-medium">{storageLimit}%</span>
            </div>
            <Slider
              id="storage-limit"
              min={10}
              max={90}
              step={5}
              value={storageLimit}
              onValueChange={setStorageLimit}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="offline-mode" className="flex items-center text-sm">
              <Signal className="h-4 w-4 mr-2" />
              Offline Collection Mode
            </Label>
            <Switch 
              id="offline-mode" 
              defaultChecked={true}
            />
          </div>
          
          <div className="pt-2">
            <Button className="w-full" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            About & Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-1">
            <span className="text-sm">App Version</span>
            <span className="text-sm font-medium">1.0.3</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between py-1">
            <span className="text-sm">Database Version</span>
            <span className="text-sm font-medium">2.5.1</span>
          </div>
          
          <Separator />
          
          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & Documentation
          </Button>
          
          <Button variant="outline" className="w-full flex items-center justify-center" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Report an Issue
          </Button>
          
          <div className="pt-2">
            <Textarea 
              placeholder="Send feedback about the application..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileSettings;