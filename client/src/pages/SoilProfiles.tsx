import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Layers, MapPin, Info } from 'lucide-react';
import type { InfrastructureObject, SoilProfile, SoilLayer } from '@shared/schema';

const soilTypeLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    rock: 'Скальный', gravel: 'Гравий', sand: 'Песок',
    clay: 'Глина', silt: 'Суглинок', loam: 'Супесь',
    fill: 'Насыпной', peat: 'Торф', permafrost: 'Вечная мерзлота'
  };
  return type ? (labels[type] || type) : '—';
};

const categoryBadge = (cat: string | null) => {
  switch (cat) {
    case 'I': return <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">Кат. I</Badge>;
    case 'II': return <Badge className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100">Кат. II</Badge>;
    case 'III': return <Badge className="text-[10px] bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Кат. III</Badge>;
    case 'IV': return <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">Кат. IV</Badge>;
    default: return null;
  }
};

const ProfileCard: FC<{ profile: SoilProfile; objectName?: string }> = ({ profile, objectName }) => {
  const [expanded, setExpanded] = useState(false);

  const { data: layers = [] } = useQuery<SoilLayer[]>({
    queryKey: ['/api/soil-profiles', profile.id, 'layers'],
    queryFn: async () => {
      const res = await fetch(`/api/soil-profiles/${profile.id}/layers`);
      if (!res.ok) throw new Error('Failed to fetch layers');
      return res.json();
    },
    enabled: expanded
  });

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-yellow-50 flex-shrink-0 mt-0.5">
              <Layers className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-semibold text-slate-800">{profile.name}</p>
                {categoryBadge(profile.seismicSoilCategory)}
                <Badge variant="outline" className="text-[10px]">СП 14</Badge>
              </div>
              {objectName && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />{objectName}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {profile.vs30 != null && (
                  <div>
                    <p className="text-[10px] text-slate-400">Vs30</p>
                    <p className="text-xs font-bold text-slate-700">{profile.vs30} м/с</p>
                  </div>
                )}
                {profile.totalDepth != null && (
                  <div>
                    <p className="text-[10px] text-slate-400">Глубина</p>
                    <p className="text-xs font-bold text-slate-700">{profile.totalDepth} м</p>
                  </div>
                )}
                {profile.groundwaterDepth != null && (
                  <div>
                    <p className="text-[10px] text-slate-400">УГВ</p>
                    <p className="text-xs font-bold text-slate-700">{profile.groundwaterDepth} м</p>
                  </div>
                )}
                {profile.amplificationFactor != null && (
                  <div>
                    <p className="text-[10px] text-slate-400">Коэф. усил.</p>
                    <p className="text-xs font-bold text-blue-700">{profile.amplificationFactor.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 flex-shrink-0"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
            {profile.description && (
              <p className="text-xs text-slate-600">{profile.description}</p>
            )}
            {profile.surveyDate && (
              <p className="text-xs text-slate-500">
                Дата изысканий: {new Date(profile.surveyDate).toLocaleDateString('ru-RU')}
              </p>
            )}

            {/* Soil layers table */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Разрез грунта</p>
              {layers.length === 0 ? (
                <p className="text-xs text-slate-400">Данные по слоям не внесены</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="text-left pb-1.5 pr-3 font-medium">№</th>
                        <th className="text-left pb-1.5 pr-3 font-medium">Грунт</th>
                        <th className="text-right pb-1.5 pr-3 font-medium">Гл., м</th>
                        <th className="text-right pb-1.5 pr-3 font-medium">Vs, м/с</th>
                        <th className="text-right pb-1.5 pr-3 font-medium">ρ, т/м³</th>
                        <th className="text-right pb-1.5 font-medium">E, МПа</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map(l => (
                        <tr key={l.id} className="border-b border-slate-100 text-slate-600">
                          <td className="py-1.5 pr-3">{l.layerNumber}</td>
                          <td className="py-1.5 pr-3">{soilTypeLabel(l.soilType)}</td>
                          <td className="py-1.5 pr-3 text-right">{l.depth != null ? l.depth.toFixed(1) : '—'}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{l.shearWaveVelocity != null ? l.shearWaveVelocity : '—'}</td>
                          <td className="py-1.5 pr-3 text-right">{l.density != null ? l.density.toFixed(2) : '—'}</td>
                          <td className="py-1.5 text-right">{l.elasticModulus != null ? l.elasticModulus : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SoilProfiles: FC = () => {
  const { data: profiles = [], isLoading } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles']
  });

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects']
  });

  const objectMap = new Map(objects.map(o => [o.id, o]));

  const stats = {
    total: profiles.length,
    withVs30: profiles.filter(p => p.vs30 != null).length,
    catI: profiles.filter(p => p.seismicSoilCategory === 'I').length,
    catII: profiles.filter(p => p.seismicSoilCategory === 'II').length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Header
          title="База данных грунтов"
          subtitle="Инженерно-геологические разрезы и характеристики грунтов объектов г. Иркутска (СП 14, СП 22, СП 47)"
        />

        <div className="p-6 space-y-5">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Скважин / разрезов', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-100' },
              { label: 'Vs30 измерено', value: stats.withVs30, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Категория I', value: stats.catI, color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Категория II', value: stats.catII, color: 'text-orange-700', bg: 'bg-orange-50' },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-3">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${s.bg}`}>
                    <Layers className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm bg-blue-50 border border-blue-200">
            <CardContent className="py-3 px-4 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Классификация грунтов выполнена по <strong>СП 14.13330.2018</strong>.
                Коэффициенты усиления назначены согласно табл. 1: кат. I — 1.0, кат. II — 1.2, кат. III — 1.5, кат. IV — 2.0.
                Расчётная сейсмичность г. Иркутска — <strong>7 баллов</strong> (МСК-64).
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {isLoading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400 text-sm">Загрузка базы грунтов...</CardContent>
              </Card>
            ) : profiles.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 mb-1">База грунтов пуста</p>
                  <p className="text-xs text-slate-400">Данные появятся после привязки разрезов к объектам</p>
                </CardContent>
              </Card>
            ) : (
              profiles.map(profile => {
                const obj = profile.objectId != null ? objectMap.get(profile.objectId) : undefined;
                return <ProfileCard key={profile.id} profile={profile} objectName={obj?.name} />;
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SoilProfiles;
