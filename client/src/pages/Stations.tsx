import { FC } from 'react';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';
import StationList from '@/components/stations/StationList';

const Stations: FC = () => (
  <div className="p-6 space-y-5">
    <div>
      <Link href="/monitoring-hub">
        <button className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Онлайн обзор
        </button>
      </Link>
    </div>
    <StationList />
  </div>
);

export default Stations;
