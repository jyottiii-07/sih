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
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { dataSource } = useSensorData();
  const { activeSensorId } = useTelemetryStats();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'survey', label: 'Survey Grid', icon: <Map className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <LineChart className="w-4 h-4" /> },
    { id: 'logs', label: 'Data Logs', icon: <Table className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070b12]/95 backdrop-blur-md border-b border-[#1f324d] px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Mission Identifier */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] text-slate-950">
              <Compass className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '24s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm sm:text-base text-slate-100 tracking-wider">
                  NCPOR / MoES
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#152238] text-cyan-400 border border-cyan-500/30">
                  ID: 26064
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans tracking-tight">
                Seafloor Metal Detection Sensor Mission Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <DataSourceBadge dataSource={dataSource} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-[#0e1626] p-1 rounded-xl border border-[#1f324d] overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#152238]'
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

          {/* Active Sensor Tag */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1626] border border-[#1f324d] text-xs font-mono text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">NODE:</span>
            <span className="font-bold text-cyan-300">{activeSensorId}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
