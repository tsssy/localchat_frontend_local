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
      activeColor: 'text-purple-300',
      inactiveColor: 'text-slate-400'
    },
    {
      id: 'shop' as const,
      label: 'Shop',
      icon: ShoppingBag,
      activeColor: 'text-purple-300',
      inactiveColor: 'text-slate-400'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-purple-500/30 relative z-20" style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)'
    }}>
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-4 min-h-[70px] relative transition-all duration-300 ${
                isActive ? 'transform scale-105' : 'hover:scale-102'
              }`}
            >
              <Icon 
                className={`w-6 h-6 mb-1 transition-all duration-300 ${
                  isActive ? `${tab.activeColor} drop-shadow-lg` : tab.inactiveColor
                }`}
                fill={isActive && tab.id !== 'shop' ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 2.5 : 2}
                style={isActive ? {
                  filter: 'drop-shadow(0 0 8px rgba(196, 181, 253, 0.6))',
                } : {}}
              />
              <span className={`text-xs transition-all duration-300 font-medium ${
                isActive ? `${tab.activeColor} drop-shadow-sm` : tab.inactiveColor
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 rounded-t-full shadow-lg" style={{
                  boxShadow: '0 0 15px rgba(196, 181, 253, 0.7)'
                }}></div>
              )}
              {isActive && (
                <div className="absolute inset-2 rounded-lg bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-purple-500/15 backdrop-blur-sm border border-purple-400/20"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}