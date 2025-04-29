import { FC } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@shared/schema';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: FC<HeaderProps> = ({ title, subtitle }) => {
  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });
  
  const unreadAlerts = alerts?.filter(alert => !alert.isRead) || [];
  
  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-dark">{title}</h1>
          {subtitle && <p className="text-sm text-slate-DEFAULT">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            {unreadAlerts.length > 0 && (
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-status-danger"></span>
            )}
            <button className="p-2 rounded-full hover:bg-slate-light transition-colors">
              <Bell className="h-5 w-5 text-slate-DEFAULT" />
            </button>
          </div>
          <div className="px-3 py-1.5 bg-status-success bg-opacity-10 text-status-success rounded-full flex items-center">
            <span className="pulse-dot bg-status-success mr-2"></span>
            <span className="text-sm font-medium">System Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
