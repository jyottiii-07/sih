import React, { useState } from 'react';
import { SensorDataProvider } from './context/SensorDataContext';
import { Shell } from './components/layout/Shell';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SurveyPage } from './pages/Survey/SurveyPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { LogsPage } from './pages/Logs/LogsPage';
import { ActiveTab, SensorReading } from './types/sensor';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const handleCenterInGrid = (_reading: SensorReading) => {
    setActiveTab('survey');
  };

  return (
    <Shell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onCenterInGrid={handleCenterInGrid}
    >
      {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
      {activeTab === 'survey' && <SurveyPage />}
      {activeTab === 'analytics' && <AnalyticsPage />}
      {activeTab === 'logs' && <LogsPage />}
    </Shell>
  );
};

export function App() {
  return (
    <SensorDataProvider>
      <AppContent />
    </SensorDataProvider>
  );
}

export default App;
