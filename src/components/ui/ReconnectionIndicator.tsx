import { useState, useEffect } from 'react';
import { PusherService } from '@/services/PusherService';
import type { PusherConnectionState } from '@/services/PusherService';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';

interface ReconnectionIndicatorProps {
  className?: string;
}

export function ReconnectionIndicator({ className = '' }: ReconnectionIndicatorProps) {
  const [connectionState, setConnectionState] = useState<PusherConnectionState>({
    isConnected: false,
    isConnecting: false,
    connectionState: 'disconnected',
    lastHeartbeat: null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const pusherService = PusherService.getInstance();
    
    // Get initial state
    setConnectionState(pusherService.getConnectionState());
    
    // Listen for connection state changes
    const handleConnectionStateChange = (newState: PusherConnectionState) => {
      setConnectionState(newState);
    };
    
    pusherService.onConnectionStateChange(handleConnectionStateChange);
    
    // Cleanup
    return () => {
      pusherService.removeConnectionStateCallback(handleConnectionStateChange);
    };
  }, []);

  // Only show indicator when there are connection issues
  if (connectionState.isConnected && connectionState.connectionState === 'connected') {
    return null; // Hide when everything is working fine
  }

  // Determine indicator appearance based on connection state
  const getIndicatorConfig = () => {
    switch (connectionState.connectionState) {
      case 'connecting':
        return {
          icon: RotateCcw,
          text: 'Connecting...',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          iconClass: 'animate-spin'
        };
      case 'reconnecting':
        return {
          icon: RotateCcw,
          text: `Reconnecting... (${connectionState.reconnectAttempts})`,
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          iconClass: 'animate-spin'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Connection lost',
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          iconClass: ''
        };
      case 'failed':
        return {
          icon: WifiOff,
          text: 'Connection failed',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          iconClass: ''
        };
      case 'error':
        return {
          icon: WifiOff,
          text: 'Connection error',
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          iconClass: ''
        };
      case 'unavailable':
        return {
          icon: WifiOff,
          text: 'Service unavailable',
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          iconClass: ''
        };
      default:
        return {
          icon: Wifi,
          text: 'Connected',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          iconClass: ''
        };
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className={`${config.bgColor} ${config.textColor} px-4 py-2 text-center text-sm font-medium shadow-lg`}>
        <div className="flex items-center justify-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconClass}`} />
          <span>{config.text}</span>
        </div>
      </div>
    </div>
  );
}