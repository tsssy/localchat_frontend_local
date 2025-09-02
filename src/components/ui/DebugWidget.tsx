import { AppConfig } from '../../../config/config';

interface DebugWidgetProps {
  debugInfo: any;
  title?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  testActions?: Array<{ label: string; action: () => void }>; // Add test actions
}

export function DebugWidget({ 
  debugInfo, 
  title = "Debug Information",
  position = 'top-right',
  testActions = []
}: DebugWidgetProps) {
  // Don't render if debug is disabled or no debug info
  if (!AppConfig.SHOW_DEBUG_INFO || !debugInfo) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}
         style={{
           width: 'min(90vw, 400px)',
           height: 'min(60vh, 500px)'
         }}>
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-3 h-full flex flex-col">
        <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2 flex-shrink-0">
          <span>🔍</span>
          {title}
        </h3>
        
        {/* Test Actions */}
        {testActions.length > 0 && (
          <div className="mb-3 flex flex-col gap-1 flex-shrink-0">
            {testActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all overflow-auto flex-1">
          {JSON.stringify(debugInfo, null, 2)}
        </div>
      </div>
    </div>
  );
}