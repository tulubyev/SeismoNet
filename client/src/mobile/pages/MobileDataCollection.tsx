import { FC, useState } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Activity,
  Upload,
  Download,
  Camera,
  CheckCircle,
  Clock,
  Info,
  Mic,
  Save,
  LocateFixed,
  WrenchIcon,
} from 'lucide-react';

const Waveform = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 12h2" />
    <path d="M6 12h2" />
    <path d="M10 12h2" />
    <path d="M14 12h2" />
    <path d="M18 12h2" />
    <path d="M22 12h2" />
    <path d="M6 16v-4" />
    <path d="M10 16v-8" />
    <path d="M14 16v-4" />
    <path d="M18 16V8" />
  </svg>
);

interface CollectionMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const MobileDataCollection: FC = () => {
  const { stations } = useSeismicData();
  const [activeTab, setActiveTab] = useState('collect');
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sampleRate, setSampleRate] = useState(50);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const collectionModes: CollectionMode[] = [
    {
      id: 'waveform',
      name: 'Волновая форма',
      description: 'Запись сейсмических волн',
      icon: <Waveform className="h-6 w-6" />
    },
    {
      id: 'maintenance',
      name: 'Обслуживание',
      description: 'Данные технического обслуживания',
      icon: <WrenchIcon className="h-6 w-6" />
    },
    {
      id: 'photo',
      name: 'Фото',
      description: 'Фотосъёмка станции',
      icon: <Camera className="h-6 w-6" />
    },
    {
      id: 'audio',
      name: 'Аудио',
      description: 'Запись окружающего звука',
      icon: <Mic className="h-6 w-6" />
    }
  ];

  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      if (uploadStatus === 'idle') {
        setUploadStatus('uploading');
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setUploadStatus('success');
          }
        }, 300);
      }
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setUploadProgress(0);
      setUploadStatus('idle');
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (!isRecording) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 pb-16">
      <Tabs defaultValue="collect" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="collect" className="text-xs">Сбор данных</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">История</TabsTrigger>
        </TabsList>

        <TabsContent value="collect" className="mt-0">
          {!selectedMode ? (
            <>
              <h2 className="text-lg font-semibold mb-3">Выберите режим сбора</h2>
              <div className="grid grid-cols-2 gap-3">
                {collectionModes.map(mode => (
                  <Card
                    key={mode.id}
                    className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="bg-primary/10 p-3 rounded-full mb-3">
                        {mode.icon}
                      </div>
                      <h3 className="font-medium">{mode.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  {selectedMode === 'waveform' && <Waveform className="h-5 w-5 mr-2 text-primary" />}
                  {selectedMode === 'maintenance' && <WrenchIcon className="h-5 w-5 mr-2 text-primary" />}
                  {selectedMode === 'photo' && <Camera className="h-5 w-5 mr-2 text-primary" />}
                  {selectedMode === 'audio' && <Mic className="h-5 w-5 mr-2 text-primary" />}
                  {collectionModes.find(m => m.id === selectedMode)?.name || 'Сбор'}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMode(null);
                    setIsRecording(false);
                    setUploadStatus('idle');
                  }}
                >
                  Изменить
                </Button>
              </div>

              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Выбор станции</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {stations.slice(0, 4).map(station => (
                      <div
                        key={station.id}
                        className="border rounded-md p-2 cursor-pointer hover:border-primary transition-colors flex flex-col"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{station.name}</span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              station.status === 'online' ? 'bg-green-500' :
                              station.status === 'warning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{station.stationId}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedMode === 'waveform' && (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="sample-rate">Частота дискретизации ({sampleRate} Гц)</Label>
                    </div>
                    <Slider
                      id="sample-rate"
                      min={10}
                      max={100}
                      step={5}
                      value={[sampleRate]}
                      onValueChange={(values) => setSampleRate(values[0])}
                      disabled={isRecording}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="high-precision">Режим высокой точности</Label>
                      <Switch id="high-precision" disabled={isRecording} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Повышает качество данных, но потребляет больше заряда и памяти
                    </p>
                  </div>

                  <Card className={`mb-4 ${isRecording ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          {isRecording ? (
                            <>
                              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2" />
                              <span className="font-medium">Запись</span>
                            </>
                          ) : (
                            <>
                              <Waveform className="h-4 w-4 mr-2" />
                              <span className="font-medium">Готов к записи</span>
                            </>
                          )}
                        </div>
                        <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                      </div>

                      {isRecording && (
                        <div className="mb-2">
                          <div className="h-12 bg-slate-100 rounded-md overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center relative">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full h-6 flex items-center">
                                  {Array.from({ length: 50 }).map((_, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        height: `${Math.abs(Math.sin(i / 3)) * 100}%`,
                                        width: '2px',
                                        marginRight: '2px',
                                        background: 'rgba(59, 130, 246, 0.5)'
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadStatus === 'uploading' && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Загрузка данных...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} />
                        </div>
                      )}

                      {uploadStatus === 'success' && (
                        <div className="flex items-center text-green-600 mb-3 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Данные успешно загружены
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={isRecording ? "destructive" : "default"}
                          onClick={handleRecordToggle}
                          disabled={uploadStatus === 'uploading'}
                          className="w-full"
                        >
                          {isRecording ? 'Остановить' : 'Начать запись'}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={isRecording || uploadStatus !== 'success'}
                          className="w-full"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="mb-4">
                <Label htmlFor="notes" className="mb-1 block">Заметки</Label>
                <Textarea
                  id="notes"
                  placeholder="Добавьте заметки о сборе данных..."
                  className="resize-none"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Button variant="outline" size="sm" className="flex items-center">
                  <LocateFixed className="h-4 w-4 mr-1" />
                  Добавить координаты
                </Button>
                {selectedMode === 'maintenance' && (
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Camera className="h-4 w-4 mr-1" />
                    Добавить фото
                  </Button>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <h2 className="text-lg font-semibold mb-3">История сбора данных</h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Waveform className="h-4 w-4 mr-2 text-primary" />
                    <div>
                      <h3 className="font-medium text-sm">Запись волновой формы</h3>
                      <p className="text-xs text-muted-foreground">Станция Alpha-1</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Загружено</Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Сегодня, 09:45
                  </span>
                  <span>2.5 МБ</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Детали
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Download className="h-3 w-3 mr-1" />
                    Скачать
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <WrenchIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-sm">Запись обслуживания</h3>
                      <p className="text-xs text-muted-foreground">Станция Beta-3</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Только локально</Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Вчера, 15:30
                  </span>
                  <span>0.8 МБ</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Детали
                  </Button>
                  <Button variant="default" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Upload className="h-3 w-3 mr-1" />
                    Загрузить
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Camera className="h-4 w-4 mr-2 text-green-500" />
                    <div>
                      <h3 className="font-medium text-sm">Фотосъёмка</h3>
                      <p className="text-xs text-muted-foreground">Станция Delta-7</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Загружено</Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    11 апр., 11:20
                  </span>
                  <span>5.3 МБ</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Детали
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2 flex items-center">
                    <Download className="h-3 w-3 mr-1" />
                    Скачать
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileDataCollection;
