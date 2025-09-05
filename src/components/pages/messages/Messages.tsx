import { Avatar, AvatarImage, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { APIServices } from '@/api/http/v1/APIServices';
import { UserSession } from '@/utils/userSession';
import { PusherService } from '@/services/PusherService';
import { ParticleBackground } from '../../ui/ParticleBackground';
import type { ChatroomData } from '@/api/http/v1/APISchemes';

interface MessagesProps {
  userSession: {
    userId: string;
    userLocation: string;
  } | null;
  onMessageClick: (messageCard: {
    chatroom_id: string;
  }) => void;
  newMessageChatrooms?: Set<string>; // Chatrooms with new messages (red dot indicators)
  onMessagesPageMountChange?: (isMounted: boolean) => void;
  onChatroomRedDotClear?: (chatroomId: string) => void;
  onChatroomRedDotSet?: (chatroomId: string) => void;
}

export function Messages({ 
  userSession, 
  onMessageClick, 
  newMessageChatrooms = new Set(), 
  onMessagesPageMountChange,
  onChatroomRedDotClear,
  onChatroomRedDotSet
}: MessagesProps) {
  const [chatrooms, setChatrooms] = useState<ChatroomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // MessagesCards cache management
  const MESSAGES_CACHE_KEY = 'messagesCards_cache';
  
  const saveMessagesCache = (data: ChatroomData[]) => {
    try {
      const cacheData = {
        chatrooms: data,
        cachedAt: new Date().toISOString(),
        userId: userSession?.userId
      };
      localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 [Messages] Cache saved to localStorage');
    } catch (error) {
      console.warn('⚠️ [Messages] Failed to save cache:', error);
    }
  };

  const loadMessagesCache = (): ChatroomData[] | null => {
    try {
      const cached = localStorage.getItem(MESSAGES_CACHE_KEY);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      
      // Validate cache is for current user
      if (cacheData.userId !== userSession?.userId) {
        console.log('🗑️ [Messages] Cache is for different user, clearing');
        localStorage.removeItem(MESSAGES_CACHE_KEY);
        return null;
      }
      
      // Check if cache is not too old (optional - remove if you want permanent cache)
      const cacheAge = Date.now() - new Date(cacheData.cachedAt).getTime();
      if (cacheAge > 24 * 60 * 60 * 1000) { // 24 hours
        console.log('🗑️ [Messages] Cache is too old, clearing');
        localStorage.removeItem(MESSAGES_CACHE_KEY);
        return null;
      }
      
      console.log(`📦 [Messages] Loaded ${cacheData.chatrooms.length} chatrooms from cache`);
      return cacheData.chatrooms;
    } catch (error) {
      console.warn('⚠️ [Messages] Failed to load cache:', error);
      return null;
    }
  };

  // ==========================================
  // GLOBAL CHATROOM CARD MANAGER
  // ==========================================
  
  useEffect(() => {
    console.log('🎯 [Messages] Initializing Global Chatroom Card Manager');
    
    // Global Card Manager: Handles all message notifications and updates UI
    const globalChatroomCardManager = {
      
      // Handle new message notifications
      handleNewMessage: (notification: any) => {
        console.log('🎯 [Messages] Card Manager received notification:', notification);
        
        if (!notification.type === 'message.new_in_chatroom' || !notification.metadata?.chatroom_id) {
          console.log('🎯 [Messages] Card Manager: Invalid notification format, ignoring');
          return;
        }
        
        const chatroomId = notification.metadata.chatroom_id;
        const messagePreview = notification.metadata.message_preview || 'New message';
        const senderName = notification.name || notification.agent_name || 'Unknown User';
        
        console.log('🎯 [Messages] Card Manager: Processing message for chatroom:', chatroomId);
        console.log('🎯 [Messages] Card Manager: Message preview:', messagePreview);
        console.log('🎯 [Messages] Card Manager: Sender:', senderName);
        
        // 1. Set red dot via parent callback
        if (onChatroomRedDotSet) {
          console.log('🎯 [Messages] Card Manager: Setting red dot for chatroom:', chatroomId);
          onChatroomRedDotSet(chatroomId);
        }
        
        // 2. Update chatroom data and move to top
        setChatrooms(prevChatrooms => {
          console.log('🎯 [Messages] Card Manager: Current chatrooms count:', prevChatrooms.length);
          
          const updatedChatrooms = prevChatrooms.map(chatroom => {
            if (chatroom.id === chatroomId) {
              console.log('🎯 [Messages] Card Manager: Found matching chatroom, updating last message');
              return {
                ...chatroom,
                metadata: {
                  ...chatroom.metadata,
                  last_messages: [{
                    message: messagePreview,
                    created_at: notification.timestamp,
                    sender_id: notification.agent_id,
                    sender_type: 'agent'
                  }]
                }
              };
            }
            return chatroom;
          });
          
          // Move updated chatroom to top
          const targetChatroomIndex = updatedChatrooms.findIndex(c => c.id === chatroomId);
          
          if (targetChatroomIndex > 0) {
            // Chatroom found and not at top - move to top
            const targetChatroom = updatedChatrooms.splice(targetChatroomIndex, 1)[0];
            console.log('🎯 [Messages] Card Manager: Moved chatroom to top:', targetChatroom.id);
            return [targetChatroom, ...updatedChatrooms];
          } else if (targetChatroomIndex === 0) {
            // Chatroom already at top
            console.log('🎯 [Messages] Card Manager: Chatroom already at top:', chatroomId);
            return updatedChatrooms;
          } else {
            // Chatroom not found in current list
            console.log('🎯 [Messages] Card Manager: Chatroom not found in current list:', chatroomId);
            return updatedChatrooms;
          }
        });
      },
      
      // Subscribe to global user notifications via PusherService
      subscribeToGlobalNotifications: () => {
        console.log('🎯 [Messages] Card Manager: Subscribing to global notifications');
        
        // Subscribe to user channel for global notifications
        const pusherService = PusherService.getInstance();
        
        if (!pusherService.isConnected()) {
          console.warn('🎯 [Messages] Card Manager: Pusher not connected, cannot subscribe');
          return;
        }
        
        // Get user ID for user channel subscription
        const sessionData = UserSession.get();
        if (!sessionData?.user_id) {
          console.warn('🎯 [Messages] Card Manager: No user session, cannot subscribe');
          return;
        }
        
        const userChannelName = `private-user-${sessionData.user_id}`;
        console.log('🎯 [Messages] Card Manager: Subscribing to user channel:', userChannelName);
        
        try {
          // Set up handler for message notifications on user channel
          pusherService.setUserNotificationHandler((notification) => {
            console.log('🎯 [Messages] Card Manager: Received user notification:', notification);
            
            if (notification.type === 'message.new_in_chatroom') {
              globalChatroomCardManager.handleNewMessage(notification);
            }
          });
          
          console.log('🎯 [Messages] Card Manager: User notification handler set up successfully');
          
        } catch (error) {
          console.error('🎯 [Messages] Card Manager: Failed to set up user notifications:', error);
        }
      },
      
      // Cleanup subscriptions
      cleanup: () => {
        console.log('🎯 [Messages] Card Manager: Cleaning up subscriptions');
        // PusherService cleanup is handled elsewhere
      }
    };
    
    // Initialize the global card manager
    globalChatroomCardManager.subscribeToGlobalNotifications();
    
    // Make manager globally available for direct calls from App.tsx
    (window as any).messagesCardManager = globalChatroomCardManager;
    console.log('🎯 [Messages] Card Manager: Made globally available on window');
    
    // Cleanup on unmount
    return () => {
      globalChatroomCardManager.cleanup();
      delete (window as any).messagesCardManager;
      console.log('🎯 [Messages] Card Manager: Cleaned up');
    };
  }, [onChatroomRedDotSet]);

  // ==========================================
  // COMPONENT LIFECYCLE MANAGEMENT
  // ==========================================
  
  // Notify parent about mount/unmount
  useEffect(() => {
    onMessagesPageMountChange?.(true);
    return () => onMessagesPageMountChange?.(false);
  }, [onMessagesPageMountChange]);

  // Load initial chatrooms data
  useEffect(() => {
    const trackPageVisit = async () => {
      try {
        await APIServices.updateLastVisited({ page: 'messages' });
        console.log('✅ [Messages] Page visit tracked: messages');
      } catch (error) {
        console.warn('⚠️ [Messages] Failed to track page visit:', error);
      }
    };

    const loadChatrooms = async () => {
      if (!userSession) {
        setIsLoading(false);
        return;
      }

      // STEP 1: Load from cache first for instant rendering
      const cachedChatrooms = loadMessagesCache();
      if (cachedChatrooms) {
        console.log('📦 [Messages] Rendering cached chatrooms instantly');
        setChatrooms(cachedChatrooms);
        setIsLoading(false);
      } else {
        console.log('📡 [Messages] No cache found, showing loading state');
        setIsLoading(true);
      }

      // STEP 2: Always fetch fresh data in background
      try {
        console.log('📡 [Messages] Fetching fresh chatrooms data');
        setIsUpdating(true);
        
        const response = await APIServices.getChatrooms(20);

        if (response.code === 200 && response.data && response.data.chatrooms) {
          console.log(`✅ [Messages] Got ${response.data.chatrooms.length} fresh chatrooms from API`);
          
          // STEP 3: Update UI with fresh data
          setChatrooms(response.data.chatrooms);
          
          // STEP 4: Update cache with fresh data
          saveMessagesCache(response.data.chatrooms);
          
          console.log('🔄 [Messages] UI and cache updated with fresh data');
        } else {
          // Only show error if no cached data was available
          if (!cachedChatrooms) {
            throw new Error(response.msg || 'Failed to load chatrooms');
          } else {
            console.warn('⚠️ [Messages] Fresh API failed, keeping cached data:', response.msg);
          }
        }
      } catch (error) {
        console.error('❌ [Messages] Failed to fetch fresh chatrooms:', error);
        
        // Only show error if no cached data was available
        if (!cachedChatrooms) {
          setError(error instanceof Error ? error.message : 'Failed to load messages');
        } else {
          console.log('📦 [Messages] API failed, keeping cached data');
        }
      } finally {
        setIsLoading(false);
        setIsUpdating(false);
      }
    };

    trackPageVisit();
    loadChatrooms();
  }, [userSession]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleChatroomClick = async (messageCard: any) => {
    const chatroomId = messageCard.chatroom_id;
    
    console.log('🎯 [Messages] Chatroom clicked:', chatroomId);
    
    // Clear red dot indicator for this chatroom
    onChatroomRedDotClear?.(chatroomId);
    
    // Navigate to chat screen
    onMessageClick(messageCard);
  };

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================
  
  // Get local diviner avatar based on display name
  const getDivinerAvatar = (displayName: string): string => {
    const avatarMap: Record<string, string> = {
      'Anya Greene': '/diviner_avatars/Anya_Greene.jpg',
      'Daniel Chen': '/diviner_avatars/Daniel_Chen.jpg',
      'Arjun Mehta': '/diviner_avatars/Arjun_Mehta.jpg',
      'Kavita Patel': '/diviner_avatars/Kavita_Patel.jpg',
      'Chronos [AI]': '/diviner_avatars/Chronos[AI].jpg',
    };
    
    return avatarMap[displayName] || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=600&fit=crop&crop=face";
  };

  // Get diviner tags based on display name
  const getDivinerTags = (displayName: string): string[] => {
    const tagsMap: Record<string, string[]> = {
      'Anya Greene': ['Tarot', 'Love', 'Career'],
      'Daniel Chen': ['Numerology', 'Life Path', 'Success'],
      'Arjun Mehta': ['Astrology', 'Relationships', 'Future'],
      'Kavita Patel': ['Spiritual Guidance', 'Healing', 'Wisdom'],
      'Chronos [AI]': ['Master of diverse divinatory arts'],
    };
    
    return tagsMap[displayName] || ['Divination'];
  };
  
  const mapChatroomToMessageCard = (chatroom: ChatroomData) => {
    return {
      chatroom_id: chatroom.id
    };
  };

  const getDisplayData = (chatroom: ChatroomData) => {
    const agent = chatroom.metadata?.participants?.agent;
    const lastMessage = chatroom.metadata?.last_messages?.[0];
    const displayName = agent?.display_name || agent?.name || "Unknown User";
    
    // Check if the last message is a fake greeting or a real message
    const isGreeting = lastMessage?.is_greeting === true;
    const hasRealMessage = lastMessage && !isGreeting;
    
    return {
      target_user_name: displayName,
      target_user_photo_url: getDivinerAvatar(displayName), // Use local diviner avatar
      last_message: hasRealMessage ? lastMessage.message : "No messages yet",
      last_message_timestamp: lastMessage?.created_at ? new Date(lastMessage.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
      unread_count: 0,
      is_online: agent?.is_active,
      tags: getDivinerTags(displayName) // Always show tags
    };
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================

  if (isLoading) {
    return (
      <div className="flex flex-col h-full mystical-background relative">
        <ParticleBackground particleCount={10} />
        <div className="p-6 relative z-10">
          <h2 className="text-white text-2xl title-glow">Messages</h2>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-4 pulse-glow"></div>
            <p className="text-slate-400">Loading your messages...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full mystical-background relative">
        <ParticleBackground particleCount={8} />
        <div className="p-6 relative z-10">
          <h2 className="text-white text-2xl title-glow">Messages</h2>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2 pulse-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">Failed to Load Messages</h3>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full mystical-background relative">
      <ParticleBackground particleCount={12} />
      
      {/* Messages Title */}
      <div className="p-6 relative z-10">
        <h2 className="text-white text-2xl title-glow">Messages</h2>
      </div>

      {/* Updating Banner - shown when fetching fresh data in background */}
      {isUpdating && (
        <div className="mx-4 mb-4 glassmorphism-card rounded-lg px-4 py-2 flex items-center gap-3 relative z-10">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin pulse-glow"></div>
          <span className="text-blue-300 text-sm">Updating latest messages...</span>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 px-4 pb-20 overflow-y-auto mystical-scrollbar relative z-10">
        {chatrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 pulse-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">No messages yet</h3>
            <p className="text-slate-400 text-sm">
              Go to New Match page to find someone to chat with!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatrooms.map((chatroom, index) => {
              const messageCard = mapChatroomToMessageCard(chatroom);
              const displayData = getDisplayData(chatroom);
              const hasRedDot = newMessageChatrooms.has(chatroom.id);
              
              return (
                <div
                  key={chatroom.id}
                  onClick={() => handleChatroomClick(messageCard)}
                  className="relative glassmorphism-card rounded-2xl p-4 cursor-pointer fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* New message red dot indicator - positioned on top right corner of card */}
                  {hasRedDot && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full border-2 border-slate-900 z-20 flex items-center justify-center shadow-lg new-message-dot">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="relative mystical-avatar">
                        <Avatar className="w-12 h-12 pulse-glow">
                          <AvatarImage 
                            src={displayData.target_user_photo_url} 
                            alt={displayData.target_user_name}
                            className="object-cover object-top w-full h-full rounded-full"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                            {displayData.target_user_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Online status indicator */}
                        {displayData.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 online-mystical"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">{displayData.target_user_name}</h3>
                          {displayData.is_online && (
                            <span className="text-green-400 text-xs font-medium">online</span>
                          )}
                          {/* Debug: Show red dot status */}
                          {hasRedDot && (
                            <span className="text-red-400 text-xs font-medium">[New Message]</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mb-3">
                          {displayData.last_message}
                        </p>
                        
                        {/* Bottom row: timestamp and tags */}
                        <div className="flex items-center justify-between">
                          <p className="text-slate-500 text-xs">{displayData.last_message_timestamp}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {displayData.tags.map((tag, tagIndex) => (
                              <span 
                                key={tagIndex}
                                className="px-2 py-1 mystical-tag text-purple-300 text-xs rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {displayData.unread_count > 0 && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white min-w-[20px] h-5 text-xs rounded-full flex items-center justify-center pulse-glow"
                        style={{
                          boxShadow: '0 0 15px rgba(196, 181, 253, 0.5)'
                        }}>
                          {displayData.unread_count}
                        </Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}