import React from 'react';
import { ActiveTab } from '../../types/sensor';
import { useSensorData } from '../../hooks/useSensorData';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { DataSourceBadge } from '../common/Badge';
import { PlaybackControls } from './PlaybackControls';
import {
  Compass,
  LayoutDashboard,
  Map,
  LineChart,
  Table,
  Radio,
  RotateCcw,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { dataSource, clearData } = useSensorData();
  const { activeSensorId } = useTelemetryStats();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetSurvey = async () => {
    if (window.confirm('Reset all survey readings and clear data back to zero?')) {
      try {
        setIsResetting(true);
        await clearData();
      } finally {
        setIsResetting(false);
      }
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'survey', label: 'Survey Grid', icon: <Map className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <LineChart className="w-4 h-4" /> },
    { id: 'logs', label: 'Data Logs', icon: <Table className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Mission Identifier */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  NCPOR / MoES
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                  ID: 26064
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Seafloor Metal Detection Sensor Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <DataSourceBadge dataSource={dataSource} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="hidden md:block">
            <DataSourceBadge dataSource={dataSource} />
          </div>

          <PlaybackControls />

          {/* Reset Survey Action Button */}
          <button
            onClick={handleResetSurvey}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Clear all readings from database and reset survey back to zero"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin text-red-600' : ''}`} />
            <span className="hidden sm:inline font-mono">Reset Survey</span>
          </button>

          {/* Active Sensor Tag */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Node:</span>
            <span className="font-semibold text-slate-900">{activeSensorId}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
