import React from 'react';
import { toast } from 'sonner';

interface MessageToastData {
  name: string;
  message: string;
  chatroomId: string;
  onNavigate: (chatroomId: string) => void;
}

export const showMessageToast = ({ name, message, chatroomId, onNavigate }: MessageToastData) => {
  console.log('🍞 [MessageToastService] Showing toast:', { name, message, chatroomId });
  
  // Create clickable toast content with horizontal alignment
  const toastContent = (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded transition-colors w-full"
      onClick={(e) => {
        console.log('🍞 [MessageToastService] Toast clicked');
        e.preventDefault();
        e.stopPropagation();
        onNavigate(chatroomId);
        toast.dismiss(); // Dismiss the current toast
      }}
    >
      {/* 水平对齐的内容：用户名、消息和"点击查看"都在一行 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-white text-sm font-medium flex-shrink-0">{name}</span>
        <span className="text-slate-300 text-sm truncate flex-1">{message}</span>
        <span className="text-blue-400 text-xs flex-shrink-0">Tap to view</span>
      </div>
    </div>
  );

  // Show toast with custom styling
  try {
    console.log('🍞 [MessageToastService] Calling toast() function...');
    const result = toast(toastContent, {
      duration: 5000, // Auto-dismiss after 5 seconds
      position: 'top-center',
      style: {
        background: 'rgb(30 41 59)', // slate-800
        border: '1px solid rgb(51 65 85)', // slate-600
        color: 'white',
        padding: '12px',
        borderRadius: '12px',
        maxWidth: '350px',
      },
      closeButton: true,
    });
    console.log('🍞 [MessageToastService] Toast result:', result);
  } catch (error) {
    console.error('❌ [MessageToastService] Error showing toast:', error);
  }
};

export const MessageToastService = {
  showMessageToast,
};