import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import Hierarchy from './pages/Hierarchy';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Compliance from './pages/Compliance';

function MainApp() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview'   && <Overview  setActiveTab={setActiveTab} />}
      {activeTab === 'hierarchy'  && <Hierarchy />}
      {activeTab === 'vehicles'   && <Vehicles />}
      {activeTab === 'drivers'    && <Drivers />}
      {activeTab === 'compliance' && <Compliance />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
