import { FC } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const Settings: FC = () => {
  return (  <>
        
        <div className="p-6">
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-dark mb-4">General Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Dark Mode</Label>
                        <p className="text-sm text-slate-DEFAULT">Switch between light and dark theme</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Auto-refresh</Label>
                        <p className="text-sm text-slate-DEFAULT">Automatically update data</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Refresh Interval (seconds)</Label>
                      <div className="flex items-center gap-4">
                        <Slider defaultValue={[5]} max={30} step={1} className="flex-1" />
                        <span className="w-12 text-right">5s</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Default Time Format</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="24h" name="timeFormat" defaultChecked />
                          <label htmlFor="24h">24-hour</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="radio" id="12h" name="timeFormat" />
                          <label htmlFor="12h">12-hour</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-dark mb-4">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Enable Notifications</Label>
                        <p className="text-sm text-slate-DEFAULT">Allow system to send notifications</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Minimum Magnitude for Alerts</Label>
                      <div className="flex items-center gap-4">
                        <Slider defaultValue={[4.5]} min={1} max={8} step={0.1} className="flex-1" />
                        <span className="w-12 text-right">4.5</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-slate-DEFAULT">Receive major event alerts via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-sm text-slate-DEFAULT">Receive critical alerts via SMS</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="network">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-dark mb-4">Network Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>API Endpoint</Label>
                      <Input defaultValue="https://api.seismonet.org/v1" />
                      <p className="text-xs text-slate-DEFAULT">Central API endpoint for seismic data</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Authentication Token</Label>
                      <Input type="password" defaultValue="••••••••••••••••" />
                      <p className="text-xs text-slate-DEFAULT">Used for secure API access</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Connect to Global Research Networks</Label>
                        <p className="text-sm text-slate-DEFAULT">Share data with research institutions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Use SSL/TLS</Label>
                        <p className="text-sm text-slate-DEFAULT">Secure communication with stations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Connection Timeout (seconds)</Label>
                      <div className="flex items-center gap-4">
                        <Slider defaultValue={[30]} min={5} max={120} step={5} className="flex-1" />
                        <span className="w-12 text-right">30s</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="data">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-dark mb-4">Data Management</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Data Retention Period</Label>
                      <select className="w-full p-2 border rounded">
                        <option>7 days</option>
                        <option>30 days</option>
                        <option selected>90 days</option>
                        <option>1 year</option>
                        <option>Indefinite</option>
                      </select>
                      <p className="text-xs text-slate-DEFAULT">How long to keep historical data</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Enable Data Compression</Label>
                        <p className="text-sm text-slate-DEFAULT">Reduce storage requirements</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Auto Archive</Label>
                        <p className="text-sm text-slate-DEFAULT">Automatically archive old data</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="pt-4">
                      <Button variant="destructive">Clear Local Cache</Button>
                      <p className="text-xs text-slate-DEFAULT mt-1">
                        This will remove temporary files but won't affect your data
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <Button variant="outline">Export Configuration</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="account">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-dark mb-4">Account Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">JS</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium">Dr. John Smith</p>
                        <p className="text-sm text-slate-DEFAULT">Seismologist</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input defaultValue="John" />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input defaultValue="Smith" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue="john.smith@seismonet.org" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input defaultValue="Seismologist" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Input defaultValue="Global Seismic Research Institute" />
                      </div>
                    </div>
                    
                    <div className="pt-4 flex gap-2">
                      <Button>Save Changes</Button>
                      <Button variant="outline">Change Password</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
  </>
  );
};

export default Settings;
