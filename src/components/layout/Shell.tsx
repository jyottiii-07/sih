import React from 'react';
import { ActiveTab } from '../../types/sensor';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ReadingDetailDrawer } from '../common/ReadingDetailDrawer';
import { useSensorData } from '../../hooks/useSensorData';

interface ShellProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onCenterInGrid?: (reading: any) => void;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  activeTab,
  setActiveTab,
  onCenterInGrid,
}) => {
  const { selectedReading, setSelectedReading } = useSensorData();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Main Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Reading Detail Drawer */}
      {selectedReading && (
        <ReadingDetailDrawer
          reading={selectedReading}
          onClose={() => setSelectedReading(null)}
          onCenterInGrid={onCenterInGrid}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
