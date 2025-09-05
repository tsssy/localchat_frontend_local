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
      activeColor: 'text-blue-300',
      inactiveColor: 'text-slate-400'
    },
    {
      id: 'shop' as const,
      label: 'Shop',
      icon: ShoppingBag,
      activeColor: 'text-blue-300',
      inactiveColor: 'text-slate-400'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 glassmorphism-card border-t border-blue-500/20 relative z-20">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-4 min-h-[60px] relative transition-all duration-300 ${
                isActive ? 'transform scale-105' : 'hover:scale-102'
              }`}
            >
              <Icon 
                className={`w-6 h-6 mb-1 transition-all duration-300 ${
                  isActive ? `${tab.activeColor} pulse-glow` : tab.inactiveColor
                }`}
                fill={isActive && tab.id !== 'shop' ? 'currentColor' : 'none'}
                strokeWidth={isActive && tab.id === 'shop' ? 2.5 : 2}
              />
              <span className={`text-xs transition-all duration-300 ${
                isActive ? `${tab.activeColor} font-medium` : tab.inactiveColor
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-full pulse-glow"></div>
              )}
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}