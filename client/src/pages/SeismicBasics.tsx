import { FC } from 'react';
import { Cpu, Radio, Database, Settings, BarChart2, Compass } from 'lucide-react';

const SeismicBasics: FC = () => (
  <div className="min-h-full bg-slate-900">
    <div className="px-6 pt-8 pb-10 max-w-5xl mx-auto">

      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-lime-600 to-lime-800 border border-white/10 shadow-xl shadow-lime-900/40">
        <h1 className="text-3xl font-bold text-white mb-2">Основы сейсмических наблюдений</h1>
        <p className="text-lime-100/80 text-base leading-relaxed">
          Сейсмические наблюдения — система непрерывной регистрации колебаний грунта
          с помощью специальных приборов (сейсмографов и акселерометров), последующей
          обработки и интерпретации полученных данных.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Cpu className="h-5 w-5 text-lime-400" /></div>
            <h2 className="text-white font-semibold">Типы датчиков</h2>
          </div>
          <ul className="space-y-3">
            {[
              { name: 'Сейсмометр (велосиметр)', desc: 'Регистрирует скорость смещения грунта. Высокая чувствительность, используется для слабых удалённых землетрясений. Полоса частот 0.01–50 Гц.' },
              { name: 'Акселерометр', desc: 'Регистрирует ускорение колебаний. Не выходит из строя при сильных землетрясениях. Применяется в инженерной сейсмологии и мониторинге зданий.' },
              { name: 'МЭМС-датчик', desc: 'Микроэлектромеханический датчик для компактных станций. Меньшая чувствительность, но высокая надёжность и низкая стоимость.' },
            ].map(d => (
              <li key={d.name} className="flex flex-col gap-1">
                <span className="text-white text-sm font-medium">{d.name}</span>
                <span className="text-slate-400 text-xs leading-relaxed">{d.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Radio className="h-5 w-5 text-cyan-400" /></div>
            <h2 className="text-white font-semibold">Устройство сейсмической станции</h2>
          </div>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Датчик (сенсор)', desc: 'Преобразует механические колебания грунта в электрический сигнал' },
              { step: '2', label: 'АЦП (регистратор)', desc: 'Оцифровывает аналоговый сигнал с частотой 100–500 выборок/с' },
              { step: '3', label: 'Блок синхронизации', desc: 'GPS-приёмник обеспечивает точность привязки времени ±0.001 с' },
              { step: '4', label: 'Концентратор', desc: 'Передаёт данные на центральный сервер по сети или спутниковому каналу' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-lime-700 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">{s.step}</div>
                <div>
                  <div className="text-white text-sm font-medium">{s.label}</div>
                  <div className="text-slate-400 text-xs">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-700"><BarChart2 className="h-5 w-5 text-violet-400" /></div>
          <h2 className="text-white font-semibold">Основные методы обработки</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Фурье-анализ (БПФ)', desc: 'Разложение сейсмограммы на частотные составляющие. Позволяет определить доминирующие частоты колебаний.' },
            { name: 'Метод HVSR (Накамура)', desc: 'Отношение спектров горизонтальных и вертикальной компонент для определения частоты грунта.' },
            { name: 'STA/LTA-детектор', desc: 'Автоматическое обнаружение сейсмических фаз по отношению краткосрочного к долгосрочному среднему.' },
            { name: 'Спектр отклика', desc: 'Максимальная реакция осциллятора с заданным демпфированием — основа сейсмостойкого проектирования.' },
            { name: 'Корреляционный анализ', desc: 'Сопоставление записей разных станций для определения скоростной модели разреза.' },
            { name: 'Фильтрация', desc: 'Полосовые, ФВЧ и ФНЧ фильтры для выделения полезного сигнала и подавления шума.' },
          ].map(m => (
            <div key={m.name} className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-white text-sm font-semibold mb-1">{m.name}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Database className="h-5 w-5 text-teal-400" /></div>
            <h2 className="text-white font-semibold">Форматы данных</h2>
          </div>
          <ul className="space-y-2">
            {[
              { fmt: 'MiniSEED', desc: 'Стандартный формат FDSN для архивирования сейсмических данных' },
              { fmt: 'SAC', desc: 'Seismic Analysis Code — широко используется для научной обработки' },
              { fmt: 'ASC / CSV', desc: 'Текстовые форматы для обмена данными с расчётными программами' },
              { fmt: 'StationXML', desc: 'Метаданные станций: координаты, характеристики датчиков' },
            ].map(f => (
              <li key={f.fmt} className="flex gap-3 items-start">
                <span className="text-lime-400 font-mono text-xs bg-slate-700 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">{f.fmt}</span>
                <span className="text-slate-400 text-xs">{f.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Settings className="h-5 w-5 text-orange-400" /></div>
            <h2 className="text-white font-semibold">Протоколы передачи данных</h2>
          </div>
          <ul className="space-y-2">
            {[
              { proto: 'SeedLink', desc: 'Протокол потоковой передачи сейсмических данных в реальном времени (IRIS)' },
              { proto: 'FDSN-WS', desc: 'REST API для доступа к архивным данным и метаданным сейсмических сетей' },
              { proto: 'Earthworm', desc: 'Система сбора и обработки данных, применяемая в национальных сетях' },
              { proto: 'MQTT / WebSocket', desc: 'Лёгкие протоколы для IoT-датчиков и веб-приложений мониторинга' },
            ].map(p => (
              <li key={p.proto} className="flex gap-3 items-start">
                <span className="text-orange-400 font-mono text-xs bg-slate-700 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">{p.proto}</span>
                <span className="text-slate-400 text-xs">{p.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  </div>
);

export default SeismicBasics;
