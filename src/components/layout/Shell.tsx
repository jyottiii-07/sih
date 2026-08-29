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
    <div className="min-h-screen flex flex-col bg-[#070b12] text-slate-100 relative selection:bg-cyan-500 selection:text-black">
      {/* Background Ambient Grid Glow */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative z-10">
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
