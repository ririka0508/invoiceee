import React, { useState } from 'react';
import {
  HomeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const App = () => {
  const [activeNav, setActiveNav] = useState('home');

  const navigationItems = [
    { id: 'home', name: 'ホーム', icon: HomeIcon },
    { id: 'billing', name: '請求・入金', icon: DocumentTextIcon },
    { id: 'purchase', name: '発注・支払', icon: CreditCardIcon },
    { id: 'reports', name: 'レポート', icon: ChartBarIcon },
    { id: 'settings', name: '設定', icon: CogIcon }
  ];

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-blue-50 border-r border-blue-100 flex flex-col">
        {/* Logo Area */}
        <div className="p-6 border-b border-blue-100">
          <h1 className="text-xl font-bold text-blue-900">Billbox</h1>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-150 ${
                  activeNav === item.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Bottom User Info */}
        <div className="p-4 border-t border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">山田太郎</p>
              <p className="text-xs text-blue-600 truncate">管理者</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {navigationItems.find(item => item.id === activeNav)?.name || 'ホーム'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('ja-JP', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            
            {/* Right Side Header Info */}
            <div className="flex items-center space-x-6">
              {/* Plan Info */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      プロプラン
                    </span>
                    <span className="text-gray-600">残り28日</span>
                  </div>
                  <div className="text-gray-900 font-medium mt-1">
                    株式会社サンプル
                  </div>
                </div>
              </div>
              
              {/* Notification Bell */}
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <BellIcon className="w-5 h-5" />
              </button>
              
              {/* Help Icon */}
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>
              
              {/* User Avatar */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">山田太郎</p>
                  <p className="text-xs text-gray-500">管理者</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Placeholder for main content */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-medium mb-2">
                  {navigationItems.find(item => item.id === activeNav)?.name}画面
                </h3>
                <p>ここにメインコンテンツが表示されます</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;