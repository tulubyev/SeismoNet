import { FC } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { insertStationSchema } from '@shared/schema';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Extend the insert schema with validation rules
const addStationSchema = insertStationSchema.extend({
  name: z.string().min(3, 'Station name must be at least 3 characters'),
  stationId: z.string().min(3, 'Station ID must be at least 3 characters').regex(/^[A-Z]+-\d+$/, 'Station ID must be in format REGION-XX (e.g., SOCAL-12)'),
  latitude: z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a valid latitude value'),
  longitude: z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a valid longitude value'),
});

type AddStationFormValues = z.infer<typeof addStationSchema>;

const AddStation: FC = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<AddStationFormValues>({
    resolver: zodResolver(addStationSchema),
    defaultValues: {
      name: '',
      stationId: '',
      latitude: '',
      longitude: '',
      status: 'offline',
      location: '',
      lastUpdate: new Date(),
      dataRate: 0,
      batteryLevel: 100,
      batteryVoltage: 12.0,
      powerConsumption: 0.5,
      storageCapacity: 1000,
      storageRemaining: 1000,
      sensorType: 'broadband',
      firmwareVersion: '1.0.0',
      depth: 0
    }
  });
  
  const onSubmit = async (data: AddStationFormValues) => {
    try {
      await apiRequest('/api/stations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      // Invalidate stations query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      
      toast({
        title: 'Station created',
        description: `New station "${data.name}" has been added to the network.`,
      });
      
      // Navigate back to stations page
      navigate('/stations');
    } catch (error) {
      console.error('Failed to create station:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new station. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header 
          title="Add New Station" 
          subtitle="Configure and deploy a new seismic station" 
        />
        
        <div className="p-6">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Station Information</CardTitle>
              <CardDescription>
                Enter the details for the new seismic monitoring station to be added to the network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Station Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Southern California Station" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Station ID</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., SOCAL-12" {...field} />
                          </FormControl>
                          <FormDescription>
                            Format: REGION-XX (uppercase region code + station number)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location Information */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Los Angeles Basin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="depth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Installation Depth (m)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 0" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coordinates */}
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 34.0522" {...field} />
                          </FormControl>
                          <FormDescription>
                            Decimal degrees (e.g., 34.0522°N = 34.0522)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., -118.2437" {...field} />
                          </FormControl>
                          <FormDescription>
                            Decimal degrees (e.g., 118.2437°W = -118.2437)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hardware Information */}
                    <FormField
                      control={form.control}
                      name="sensorType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sensor Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sensor type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="broadband">Broadband Seismometer</SelectItem>
                              <SelectItem value="short-period">Short-Period Seismometer</SelectItem>
                              <SelectItem value="accelerometer">Accelerometer</SelectItem>
                              <SelectItem value="infrasound">Infrasound Sensor</SelectItem>
                              <SelectItem value="combined">Combined Sensors</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="firmwareVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firmware Version</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1.0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Information */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select initial status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                              <SelectItem value="degraded">Degraded</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dataRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Rate (MB/s)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="e.g., 0.5" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Power Information */}
                    <FormField
                      control={form.control}
                      name="batteryLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Level (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 100" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="batteryVoltage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Voltage (V)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="e.g., 12.0" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Storage Information */}
                    <FormField
                      control={form.control}
                      name="storageCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Capacity (GB)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 1000" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="storageRemaining"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Remaining (GB)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 1000" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/stations')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Station</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AddStation;