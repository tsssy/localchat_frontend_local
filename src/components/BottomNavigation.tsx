import { MessageSquare, ShoppingBag } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'messages' | 'shop';
  onTabChange: (tab: 'messages' | 'shop') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    {
      id: 'messages' as const,
      label: 'Message',
      icon: MessageSquare,
      activeColor: 'text-blue-400',
      inactiveColor: 'text-slate-500'
    },
    {
      id: 'shop' as const,
      label: 'Shop',
      icon: ShoppingBag,
      activeColor: 'text-blue-400',
      inactiveColor: 'text-slate-500'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 px-4 min-h-[60px]"
            >
              <Icon 
                className={`w-6 h-6 mb-1 ${isActive ? tab.activeColor : tab.inactiveColor}`}
                fill={isActive && tab.id !== 'shop' ? 'currentColor' : 'none'}
                strokeWidth={isActive && tab.id === 'shop' ? 2.5 : 2}
              />
              <span className={`text-xs ${isActive ? tab.activeColor : tab.inactiveColor}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-current rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}