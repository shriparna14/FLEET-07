import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from '../common/Toast';

export default function Layout({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-text">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeTab={activeTab} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6 bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
