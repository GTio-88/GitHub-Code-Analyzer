import React from 'react';
import { ActiveTab } from '../types';

interface Tab {
  id: ActiveTab;
  title: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: ActiveTab;
  onTabChange: (tabId: ActiveTab) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-700 bg-gray-900 shadow-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-4 px-6 text-lg font-semibold transition-all duration-200 ease-in-out
              ${activeTab === tab.id
                ? 'text-indigo-400 border-b-4 border-indigo-600 bg-gray-800'
                : 'text-gray-400 hover:text-indigo-200 hover:bg-gray-700 border-b-4 border-transparent'
              }
              focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-900
            `}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            className={`${activeTab === tab.id ? 'block animate-fade-in' : 'hidden'} h-full`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;