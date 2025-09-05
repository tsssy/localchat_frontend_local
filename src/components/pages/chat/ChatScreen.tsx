import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { GirlProfile } from '../new-girls/components/GirlProfile';
import { APIServices } from '@/api/http/v1/APIServices';
import { UserSession } from '@/utils/userSession';
import { PusherService, type PusherMessage } from '@/services/PusherService';
import type { ConversationMessage } from '@/api/http/v1/APISchemes';

interface ChatMessage {
  id: number | string; // Can be either number (from API) or string (for compatibility)
  text: string;
  sender: 'user' | 'girl';
  timestamp: Date;
  message_id: number | string; // Store original API message_id for debugging and API operations
}

interface ChatScreenProps {
  chatroomId: string; // Only chatroom ID needed
  userSession: {
    userId: string;
    meta: Record<string, any>;
    numberOfMatchRequests: number;
    userLocation: string;
  } | null;
  onClose: () => void;
  onNavigateToShop?: () => void; // New prop for navigation to shop
}

export function ChatScreen({ chatroomId, userSession, onClose, onNavigateToShop }: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDragInstruction, setShowDragInstruction] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [nextPage, setNextPage] = useState(1); // Start with page 1 for initial load
  const nextPageRef = useRef(1); // Keep ref in sync with state
  const [isJoiningChatroom, setIsJoiningChatroom] = useState(false);
  const [joinRetryCount, setJoinRetryCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [messageSendErrors, setMessageSendErrors] = useState<Record<string, string>>({});
  const [agentData, setAgentData] = useState<any | null>(null); // Store agent data from participants API
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [subAccountProfile, setSubAccountProfile] = useState<any | null>(null); // Store full profile from sub-account API
  const [isLoadingSubAccountProfile, setIsLoadingSubAccountProfile] = useState(true);
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  // Helper function to get display location with fallback to user location
  const getDisplayLocation = (profileLocation: string | undefined | null): string => {
    if (profileLocation) {
      return profileLocation;
    }
    
    // Fallback to authenticated user's location
    const userLocation = UserSession.getUserLocation();
    if (userLocation) {
      return userLocation;
    }
    
    return "Unknown";
  };

  // Get local diviner avatar based on display name
  const getDivinerAvatar = (displayName: string): string => {
    const avatarMap: Record<string, string> = {
      'Anya Greene': '/diviner_avatars/Anya_Greene.jpg',
      'Daniel Chen': '/diviner_avatars/Daniel_Chen.jpg',
      'Arjun Mehta': '/diviner_avatars/Arjun_Mehta.jpg',
      'Kavita Patel': '/diviner_avatars/Kavita_Patel.jpg',
      'Chronos [AI]': '/diviner_avatars/Chronos[AI].jpg',
    };
    
    // Do not use external stock fallback to avoid flashing random image
    return avatarMap[displayName] || '';
  };

  // Log nextPage initialization and changes + sync ref
  useEffect(() => {
    console.log('🔢 [ChatScreen] nextPage initialized/updated to:', nextPage);
    nextPageRef.current = nextPage; // Keep ref in sync
  }, [nextPage]);

  // Debug: Log agentData changes
  useEffect(() => {
    if (agentData) {
      console.log('📝 [ChatScreen] agentData updated:', {
        name: agentData.display_name || agentData.name,
        avatar_url: agentData.avatar_url,
        status: agentData.status
      });
    }
  }, [agentData]);

  // Use native DOM events to properly handle preventDefault
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let startY = 0;
    let isDragging = false;
    let draggedDown = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      draggedDown = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !container) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Check if at top and dragging down
      if (container.scrollTop <= 1 && deltaY > 0) {
        e.preventDefault(); // This will work with { passive: false }
        setDragDistance(Math.min(deltaY, 100)); // Cap at 100px
        
        if (deltaY > 20) {
          draggedDown = true;
        }
      }
    };

    const handleTouchEnd = () => {
      if (isDragging && draggedDown) {
        console.info("Drag down release event");
        // Load older messages when user drags down
        loadOlderMessages();
      }
      isDragging = false;
      draggedDown = false;
      setDragDistance(0); // Reset drag distance when touch ends
    };

    // Add event listeners with { passive: false } to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isLoadingMessages, error]); // Re-run when loading or error state changes

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !messagesContainerRef.current) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - startY;
    const container = messagesContainerRef.current;
    
    // Check if at top and dragging down
    if (container.scrollTop <= 1 && deltaY > 0) {
      // Don't call preventDefault here - it's handled by native events
      setDragDistance(Math.min(deltaY, 100)); // Cap at 100px
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragDistance(0); // Reset drag distance when touch ends
  };

  // Check scroll position to show/hide drag instruction
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      const shouldShow = scrollTop <= 10 && messages.length > 0;
      setShowDragInstruction(shouldShow);
    }
  };

  // Load initial data when component mounts - call both APIs simultaneously
  useEffect(() => {
    // Track page visit when component mounts - determine page type based on showProfile state
    const trackPageVisit = async () => {
      try {
        const pageType = showProfile ? 'profile' : 'chatroom';
        const pageName = `chatroom-${chatroomId}-${pageType}`;
        await APIServices.updateLastVisited({ page: pageName });
        console.log('✅ [ChatScreen] Page visit tracked:', pageName);
      } catch (error) {
        console.warn('⚠️ [ChatScreen] Failed to track page visit:', error);
      }
    };

    trackPageVisit();

    const loadInitialData = async () => {
      console.log('🚀 [ChatScreen] Starting to load chatroom data for:', chatroomId);
      
      if (!userSession || !chatroomId) {
        const missingParams = [];
        if (!userSession) missingParams.push('userSession');
        if (!chatroomId) missingParams.push('chatroomId');
        
        const errorMsg = `Missing required parameters: ${missingParams.join(', ')}`;
        console.error('❌ [ChatScreen]', errorMsg);
        setError(errorMsg);
        setIsLoadingMessages(false);
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingMessages(true);
        setIsLoadingProfile(true);
        setError(null);
        
        // Get user_id from UserSession
        const sessionData = UserSession.get();
        if (!sessionData) {
          throw new Error('User session not found');
        }
        
        console.log('🔍 [ChatScreen] Retrieved session data:', {
          user_id: sessionData.user_id,
          user_id_type: typeof sessionData.user_id,
        });

        // Load chatroom data using two APIs in parallel
        await loadChatroomData(chatroomId);

      } catch (error) {
        console.error('❌ [ChatScreen] Failed to load initial data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chat data');
      } finally {
        setIsLoadingMessages(false);
        setIsLoadingProfile(false);
      }
    };

    // Simple two-API approach: participants + messages in parallel
    const loadChatroomData = async (chatroomId: string) => {
      console.log('📡 [ChatScreen] Loading chatroom data for:', chatroomId);
      
      try {
        // Load participants and messages in parallel
        const [participantsResponse, messagesResponse] = await Promise.all([
          APIServices.getChatroomParticipants(chatroomId),
          APIServices.getChatroomMessages(chatroomId, { page: 1, page_size: 20 })
        ]);
        
        console.log('📥 [ChatScreen] Parallel loading completed');
        
        // Process participants data for agent info
        if (participantsResponse.code === 200 && participantsResponse.data) {
          const participantsData = participantsResponse.data;
          console.log('✅ [ChatScreen] Got chatroom participants:', participantsData);
          
          if (participantsData.agent) {
            // Store agent data for profile and UI (temporary until sub-account profile loads)
            const agentStatus = participantsData.agent.status || 'offline';
            setAgentData({
              id: participantsData.agent.id,
              name: participantsData.agent.name,
              display_name: participantsData.agent.display_name,
              avatar_url: participantsData.agent.avatar_url, // Temporary fallback
              bio: participantsData.agent.bio,
              status: agentStatus, // Use actual status field from API
              isOnline: agentStatus === 'available'
            });
            console.log('✅ [ChatScreen] Agent data set from participants (temporary)');
            console.log('🖼️ [ChatScreen] Temporary avatar URL (from participants):', participantsData.agent.avatar_url);
            console.log('🟢 [ChatScreen] Agent status from API:', participantsData.agent.status, '→ isOnline:', agentStatus === 'available');
            
            // Load sub-account profile in background to get photo_urls array
            loadSubAccountProfile(participantsData.agent.id);
          } else {
            console.warn('⚠️ [ChatScreen] No agent data in participants response');
            setAgentData({
              name: 'Unknown User',
              display_name: 'Unknown User',
              avatar_url: null,
              bio: 'No bio available',
              status: 'offline',
              isOnline: false
            });
            setIsLoadingSubAccountProfile(false);
          }
        } else {
          console.warn('⚠️ [ChatScreen] Failed to get chatroom participants:', participantsResponse.msg);
          setAgentData({
            name: 'Unknown User',
            display_name: 'Unknown User', 
            avatar_url: null,
            bio: 'No bio available',
            status: 'offline',
            isOnline: false
          });
          setIsLoadingSubAccountProfile(false);
        }
        
        // Process messages data
        if (messagesResponse.code === 200 && messagesResponse.data) {
          const loadedMessages = messagesResponse.data.items || [];
          console.log('✅ [ChatScreen] Loaded', loadedMessages.length, 'messages');
          
          const chatMessages = loadedMessages
            .filter((msg: any) => !msg.is_deleted)
            .map((msg: any) => ({
              id: msg.id,
              text: msg.message,
              sender: msg.sender_type === 'user' ? 'user' as const : 'girl' as const,
              timestamp: new Date(msg.created_at),
              message_id: msg.id
            }));
          
          setMessages(chatMessages.reverse());
          setHasMoreMessages(messagesResponse.data.has_next || false);
          setNextPage(2); // After loading page 1, set next page to 2
          console.log('📝 [ChatScreen] Initial load complete, nextPage set to 2');
          
          // Auto-scroll to bottom after loading initial messages with multiple attempts
          const scrollToBottom = () => {
            if (messagesContainerRef.current) {
              const container = messagesContainerRef.current;
              const scrollHeight = container.scrollHeight;
              const clientHeight = container.clientHeight;
              
              console.log('📜 [ChatScreen] Scroll attempt:', {
                scrollHeight,
                clientHeight,
                hasContent: scrollHeight > clientHeight,
                messageCount: chatMessages.length
              });
              
              if (scrollHeight > clientHeight) {
                container.scrollTop = scrollHeight;
                console.log('📜 [ChatScreen] Auto-scrolled to bottom after initial load');
                return true; // Success
              }
            }
            return false; // Failed
          };
          
          // Try immediate scroll
          if (!scrollToBottom()) {
            // Try after short delay
            setTimeout(() => {
              if (!scrollToBottom()) {
                // Try after longer delay
                setTimeout(scrollToBottom, 300);
              }
            }, 100);
          }
        } else {
          console.log('ℹ️ [ChatScreen] No messages found');
          setMessages([]);
          setHasMoreMessages(false);
        }
        
        // Scroll to bottom after loading
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            console.log('📜 [ChatScreen] Scrolled to bottom');
          }
        }, 100);
        
        // Set up real-time messaging
        try {
          await joinChatroomWithRetry(chatroomId);
          console.log('✅ [ChatScreen] Real-time messaging setup completed');
        } catch (error) {
          console.error('❌ [ChatScreen] Failed to set up real-time messaging:', error);
        }
        
      } catch (error) {
        console.error('💥 [ChatScreen] Exception during chatroom data loading:', error);
        throw error;
      }
    };

    // Load sub-account profile in background to get complete profile with photo_urls
    const loadSubAccountProfile = async (subAccountId: string) => {
      console.log('📡 [ChatScreen] Loading sub-account profile for photo_urls:', subAccountId);
      try {
        const profileResponse = await APIServices.getSubAccountProfile(subAccountId);
        if (profileResponse.code === 200) {
          console.log('✅ [ChatScreen] Sub-account profile loaded with photo_urls');
          console.log('🖼️ [ChatScreen] Photo URLs:', profileResponse.data.photo_urls);
          
          setSubAccountProfile(profileResponse.data);
          
          // Update agentData to use photo_urls[0] as the primary avatar
          if (profileResponse.data.photo_urls && profileResponse.data.photo_urls.length > 0) {
            setAgentData((prevAgentData: any) => ({
              ...prevAgentData,
              avatar_url: profileResponse.data.photo_urls[0], // Use first photo from photo_urls array
              photo_urls: profileResponse.data.photo_urls // Store full photo array for profile
            }));
            console.log('✅ [ChatScreen] Updated agentData with photo_urls[0]:', profileResponse.data.photo_urls[0]);
          }
        } else {
          console.warn('⚠️ [ChatScreen] Failed to load sub-account profile:', profileResponse.msg);
          setSubAccountProfile(null);
        }
      } catch (error) {
        console.error('❌ [ChatScreen] Error loading sub-account profile:', error);
        setSubAccountProfile(null);
      } finally {
        setIsLoadingSubAccountProfile(false);
      }
    };

    loadInitialData();
  }, [userSession, chatroomId]);

  // Track page visit when showProfile state changes
  useEffect(() => {
    const trackPageVisit = async () => {
      try {
        const pageType = showProfile ? 'profile' : 'chatroom';
        const pageName = `chatroom-${chatroomId}-${pageType}`;
        await APIServices.updateLastVisited({ page: pageName });
        console.log('✅ [ChatScreen] Profile state changed, page visit tracked:', pageName);
      } catch (error) {
        console.warn('⚠️ [ChatScreen] Failed to track page visit on profile state change:', error);
      }
    };

    // Only track if component has already mounted
    if (chatroomId) {
      trackPageVisit();
    }
  }, [showProfile, chatroomId]);

  // Ultra-simplified pagination logic - using ref to get current value
  function loadOlderMessages() {
    return new Promise<void>(async (resolve, reject) => {
      const currentNextPage = nextPageRef.current; // Get current value from ref
      
      console.log('🚀 [Pagination] Starting load older messages');
      console.log('📊 [Pagination] Current nextPage:', currentNextPage);

      // Basic validation
      if (!userSession || !chatroomId || !hasMoreMessages || isLoadingOlderMessages) {
        console.log('🚫 [Pagination] Cannot load - conditions not met');
        resolve();
        return;
      }

      try {
        setIsLoadingOlderMessages(true);
        
        console.log('📈 [Pagination] Requesting page:', currentNextPage);
        
        // Call API with current nextPage from ref
        const response = await APIServices.getChatroomMessages(chatroomId, { 
          page: currentNextPage, 
          page_size: 20 
        });
        
        console.log('📥 [Pagination] API response:', {
          code: response.code,
          messageCount: response.data?.items?.length || 0,
          hasNext: response.data?.has_next,
          requestedPage: currentNextPage
        });

        if (response.code === 200 && response.data && response.data.items && response.data.items.length > 0) {
          // Convert messages
          const newMessages: ChatMessage[] = response.data.items
            .filter((msg: any) => !msg.is_deleted)
            .map((msg: any) => ({
              id: msg.id,
              message_id: msg.id,
              text: msg.message,
              sender: msg.sender_type === 'user' ? 'user' as const : 'girl' as const,
              timestamp: new Date(msg.created_at)
            }));

          console.log('✅ [Pagination] Converted', newMessages.length, 'messages');

          // Add messages to UI with duplicate prevention
          setMessages(prevMessages => {
            console.log('📋 [Pagination] Adding', newMessages.length, 'messages');
            
            // Create set of existing message IDs to prevent duplicates
            const existingIds = new Set(prevMessages.map(m => m.message_id));
            const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.message_id));
            
            console.log('🚫 [Pagination] Duplicate prevention:', {
              totalNewMessages: newMessages.length,
              uniqueNewMessages: uniqueNewMessages.length,
              duplicatesFiltered: newMessages.length - uniqueNewMessages.length
            });
            
            return [...uniqueNewMessages.reverse(), ...prevMessages];
          });
          
          // Update pagination state
          const newNextPage = currentNextPage + 1;
          setNextPage(newNextPage); // This will trigger useEffect to update ref
          setHasMoreMessages(response.data.has_next);
          
          console.log('🔢 [Pagination] nextPage incremented to:', newNextPage);
          console.log('✅ [Pagination] Success - loaded page', currentNextPage, ', next will be', newNextPage);
          
        } else {
          console.log('ℹ️ [Pagination] No more messages available');
          setHasMoreMessages(false);
        }
        resolve();
      } catch (error) {
        console.error('❌ [Pagination] Error:', error);
        reject(error);
      } finally {
        setIsLoadingOlderMessages(false);
        console.log('🏁 [Pagination] Load complete');
      }
    });
  }

  // Join chatroom with retry logic
  const joinChatroomWithRetry = async (roomId: string, attempt: number = 1) => {
    console.log(`🚀 [ChatScreen] Attempting to join chatroom ${roomId}, attempt ${attempt}`);
    
    if (attempt === 1) {
      setIsJoiningChatroom(true);
      setJoinRetryCount(0);
    }
    
    try {
      const response = await APIServices.joinChatroom(roomId);
      
      if (response.code === 200) {
        console.log('✅ [ChatScreen] Successfully joined chatroom');
        setIsJoined(true);
        setIsJoiningChatroom(false);
        setJoinRetryCount(0);
        
        // Subscribe to Pusher channel for real-time messages
        try {
          const pusherService = PusherService.getInstance();
          if (pusherService.isConnected()) {
            console.log('📡 [ChatScreen] Subscribing to Pusher channel for chatroom:', roomId);
            
            // Set up message handler for this chatroom
            pusherService.setMessageHandler(roomId, (pusherMessage: PusherMessage) => {
              console.log('📨 [ChatScreen] Received real-time message:', pusherMessage);
              
              // Skip messages sent by the current user to avoid duplicates
              // (we already show them immediately when sending)
              if (pusherMessage.sender_id === UserSession.get()?.user_id) {
                console.log('📨 [ChatScreen] Skipping own message from Pusher to avoid duplicate');
                return;
              }
              
              // Add the new message to the UI (handle both new_message and system_message)
              const newMessage: ChatMessage = {
                id: pusherMessage.id,
                message_id: pusherMessage.id,
                text: pusherMessage.message,
                sender: pusherMessage.sender_type === 'user' ? 'user' : 
                       pusherMessage.sender_type === 'system' ? 'girl' : // System messages show as girl for now
                       pusherMessage.sender_id === UserSession.get()?.user_id ? 'user' : 'girl',
                timestamp: new Date(pusherMessage.timestamp)
              };
              
              // Check if message already exists to avoid duplicates
              setMessages(prev => {
                const existingMessage = prev.find(m => m.message_id === newMessage.message_id);
                if (existingMessage) {
                  console.log('📨 [ChatScreen] Duplicate message ignored:', newMessage.message_id);
                  return prev;
                }
                return [...prev, newMessage];
              });
              
              // Scroll to bottom when new message arrives
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
              }, 100);
            });
            
            // Subscribe to the channel
            await pusherService.subscribeToChannel(roomId);
            console.log('✅ [ChatScreen] Successfully subscribed to Pusher channel');
          } else {
            console.warn('⚠️ [ChatScreen] Pusher not connected - real-time messages will not work');
          }
        } catch (pusherError) {
          console.error('❌ [ChatScreen] Failed to subscribe to Pusher channel:', pusherError);
          // Don't block the chat - user can still send messages manually
        }
      } else {
        throw new Error(response.msg || 'Failed to join chatroom');
      }
    } catch (error) {
      console.error(`❌ [ChatScreen] Failed to join chatroom (attempt ${attempt}):`, error);
      setJoinRetryCount(attempt);
      
      // Retry after delay if we haven't reached max attempts
      if (attempt < 10) { // Retry up to 10 times
        setTimeout(() => {
          joinChatroomWithRetry(roomId, attempt + 1);
        }, Math.min(1000 * attempt, 5000)); // Exponential backoff, max 5 seconds
      } else {
        console.error('💥 [ChatScreen] Max join attempts reached, stopping retries');
        setIsJoiningChatroom(false);
      }
    }
  };

  // Leave chatroom when component unmounts or user navigates away
  const leaveChatroom = async () => {
    if (chatroomId && isJoined) {
      console.log('🚀 [ChatScreen] Leaving chatroom:', chatroomId);
      
      // Unsubscribe from Pusher channel first
      try {
        const pusherService = PusherService.getInstance();
        pusherService.unsubscribeFromChannel(chatroomId);
        pusherService.removeMessageHandler(chatroomId);
        console.log('✅ [ChatScreen] Unsubscribed from Pusher channel');
      } catch (pusherError) {
        console.error('❌ [ChatScreen] Failed to unsubscribe from Pusher:', pusherError);
      }
      
      // Leave chatroom via API
      try {
        const response = await APIServices.leaveChatroom(chatroomId);
        if (response.code === 200) {
          console.log('✅ [ChatScreen] Successfully left chatroom');
        } else {
          console.error('❌ [ChatScreen] Failed to leave chatroom:', response.msg);
        }
      } catch (error) {
        console.error('❌ [ChatScreen] Failed to leave chatroom:', error);
        // Don't prevent navigation even if leave fails
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Check if user has joined the chatroom
    if (!isJoined) {
      console.log('🚫 [ChatScreen] Cannot send message - user has not joined chatroom yet');
      return;
    }
    
    if (!chatroomId) {
      console.error('❌ [ChatScreen] Cannot send message - no chatroom ID');
      return;
    }
    
    const messageContent = inputMessage;
    
    // Create message for immediate UI feedback
    const newMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      message_id: `temp_${Date.now()}`,
      text: messageContent,
      sender: 'user',
      timestamp: new Date()
    };
    
    // Add message to UI immediately
    setMessages(prev => [...prev, newMessage]);
    setInputMessage(''); // Clear input
    
    // Scroll to bottom after adding message
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
    
    // Send message via API
    try {
      console.log('🚀 [ChatScreen] Sending message via API');
      const response = await APIServices.sendMessage(chatroomId, { message: messageContent });
      
      if (response.code === 400 && response.msg?.includes('Insufficient credits')) {
        console.log('💰 [ChatScreen] Insufficient funds detected');
        setInsufficientFunds(true);
        
        // After 0.2 seconds, navigate to shop and then show toast
        setTimeout(() => {
          if (onNavigateToShop) {
            onNavigateToShop();
            
            // Show toast notification after navigation
            setTimeout(() => {
              toast.error('Insufficient Funds', {
                description: 'You need more credits to send messages. Please purchase credits below.',
                duration: 4000,
              });
            }, 100); // Small delay to ensure shop page is rendered
          }
        }, 200);
        
        return; // Exit early, don't show error in message
      }
      
      if (response.code !== 200) {
        throw new Error(response.msg || 'Failed to send message');
      }
      
      console.log('✅ [ChatScreen] Message sent successfully');
      setInsufficientFunds(false); // Reset insufficient funds state on successful send
      
    } catch (error) {
      console.error('❌ [ChatScreen] Failed to send message:', error);
      
      // Store error for this message
      setMessageSendErrors(prev => ({
        ...prev,
        [newMessage.message_id]: error instanceof Error ? error.message : 'Failed to send message'
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };
  
  // Handle close with chatroom cleanup
  const handleClose = async () => {
    await leaveChatroom();
    onClose();
  };
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (chatroomId && isJoined) {
        // Unsubscribe from Pusher channel
        try {
          const pusherService = PusherService.getInstance();
          pusherService.unsubscribeFromChannel(chatroomId);
          pusherService.removeMessageHandler(chatroomId);
          console.log('✅ [ChatScreen] Cleaned up Pusher subscription on unmount');
        } catch (pusherError) {
          console.error('❌ [ChatScreen] Failed to cleanup Pusher on unmount:', pusherError);
        }
        
        // Fire and forget - don't wait for response
        APIServices.leaveChatroom(chatroomId).then(response => {
          if (response.code === 200) {
            console.log('✅ [ChatScreen] Successfully left chatroom on unmount');
          } else {
            console.error('❌ [ChatScreen] Failed to leave chatroom on unmount:', response.msg);
          }
        }).catch(error => {
          console.error('❌ [ChatScreen] Failed to leave chatroom on unmount:', error);
        });
      }
    };
  }, [chatroomId, isJoined]);
  
  // Retry failed profile loading
  const retryProfileLoading = async (attempt: number = 1) => {
    if (attempt > 3 || !agentData?.id) {
      console.error('💥 [ChatScreen] Max profile retry attempts reached or no agent ID');
      return;
    }
    
    console.log(`🔄 [ChatScreen] Retrying profile loading, attempt ${attempt}`);
    
    try {
      const profileResponse = await APIServices.getSubAccountProfile(agentData.id);
      
      if (profileResponse.code === 200 && profileResponse.data) {
        console.log('✅ [ChatScreen] Profile retry successful');
        setSubAccountProfile(profileResponse.data);
        setIsLoadingSubAccountProfile(false);
      } else {
        throw new Error(profileResponse.msg || 'Failed to load profile');
      }
    } catch (error) {
      console.error(`❌ [ChatScreen] Profile retry ${attempt} failed:`, error);
      
      // If we have existing agent profile data, stop retrying and use fallback
      if (agentData?.name && agentData?.display_name) {
        console.log('📋 [ChatScreen] Using existing agent profile as fallback');
        setIsLoadingSubAccountProfile(false);
        return;
      }
      
      // If no existing profile data, continue retrying
      if (attempt < 3) {
        setTimeout(() => {
          retryProfileLoading(attempt + 1);
        }, 1000 * attempt); // Exponential backoff
      } else {
        setIsLoadingSubAccountProfile(false);
      }
    }
  };
  const retryMessageSend = async (messageId: string) => {
    const message = messages.find(m => m.message_id === messageId);
    if (!message || !chatroomId) return;
    
    // Clear the error first
    setMessageSendErrors(prev => {
      const { [messageId]: removed, ...rest } = prev;
      return rest;
    });
    
    try {
      console.log('🔄 [ChatScreen] Retrying message send');
      const response = await APIServices.sendMessage(chatroomId, { message: message.text });
      
      if (response.code !== 200) {
        throw new Error(response.msg || 'Failed to send message');
      }
      
      console.log('✅ [ChatScreen] Message retry successful');
      
    } catch (error) {
      console.error('❌ [ChatScreen] Message retry failed:', error);
      
      // Restore error
      setMessageSendErrors(prev => ({
        ...prev,
        [messageId]: error instanceof Error ? error.message : 'Failed to send message'
      }));
    }
  };

  // If showing profile, render the profile component
  if (showProfile) {
    // If profile data is still loading, show loading spinner
    if (isLoadingProfile) {
      return (
        <div className="flex flex-col h-full bg-slate-900">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-pink-400 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Loading profile...</p>
            </div>
          </div>
        </div>
      );
    }

    // Use profile data from API if available, otherwise fall back to agent data or defaults
    const profileToShow = subAccountProfile ? {
      id: subAccountProfile.id,
      name: subAccountProfile.display_name,
      age: subAccountProfile.age || 25,
      location: getDisplayLocation(subAccountProfile.location),
      isOnline: subAccountProfile.status === 'available',
      photos: subAccountProfile.photo_urls && subAccountProfile.photo_urls.length > 0 
        ? subAccountProfile.photo_urls 
        : [],
      tags: subAccountProfile.tags || [],
      bio: subAccountProfile.bio || 'No bio available'
    } : {
      id: agentData?.id || chatroomId || 'unknown',
      name: agentData?.display_name || agentData?.name || 'Loading...',
      age: 25,
      location: getDisplayLocation(null),
      isOnline: agentData?.isOnline || false,
      photos: agentData?.avatar_url ? [agentData.avatar_url] : [],
      tags: [],
      bio: agentData?.bio || 'Loading profile...'
    };

    return (
      <GirlProfile
        girl={profileToShow}
        onClose={handleCloseProfile}
      />
    );
  }

  // Show loading spinner while loading initial messages
  if (isLoadingMessages) {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src={getDivinerAvatar(agentData?.display_name || agentData?.name || 'Loading...')}
            alt={agentData?.display_name || agentData?.name || 'Loading...'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/10">
          <button onClick={handleClose} className="text-white/90 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-white font-medium text-lg">{agentData?.display_name || agentData?.name || 'Loading...'}</h2>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${agentData?.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span className="text-white/70 text-base">{agentData?.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <button 
            onClick={handleShowProfile}
            disabled={isLoadingSubAccountProfile}
            className={`p-1 ${
              isLoadingSubAccountProfile 
                ? 'text-white/50 cursor-not-allowed' 
                : 'text-white/90 hover:text-white'
            }`}
            title={isLoadingSubAccountProfile ? 'Loading profile...' : 'View profile'}
          >
            <User className="w-6 h-6" />
          </button>
        </div>

        {/* Loading Spinner */}
        <div className="flex-1 relative z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading chat history...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if loading failed
  if (error) {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src={getDivinerAvatar(agentData?.display_name || agentData?.name || 'Loading...')}
            alt={agentData?.display_name || agentData?.name || 'Loading...'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/10">
          <button onClick={handleClose} className="text-white/90 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center">
            <h2 className="text-white font-medium text-lg">{agentData?.display_name || agentData?.name || 'Loading...'}</h2>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${agentData?.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span className="text-white/70 text-base">{agentData?.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <button 
            onClick={handleShowProfile}
            disabled={isLoadingSubAccountProfile}
            className={`p-1 ${
              isLoadingSubAccountProfile 
                ? 'text-white/50 cursor-not-allowed' 
                : 'text-white/90 hover:text-white'
            }`}
            title={isLoadingSubAccountProfile ? 'Loading profile...' : 'View profile'}
          >
            <User className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        <div className="flex-1 relative z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">Failed to Load Chat</h3>
            <p className="text-white/70 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={getDivinerAvatar(agentData?.display_name || agentData?.name || 'Chat')}
          alt={agentData?.display_name || agentData?.name || 'Chat'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/10">
        <button onClick={onClose} className="text-white/90 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <h2 className="text-white font-medium text-lg">
            {agentData?.display_name || agentData?.name || 'Loading...'}
          </h2>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              agentData?.status === 'available' ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
            <span className="text-white/70 text-base">
              {agentData?.status === 'available' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleShowProfile}
          className="text-white/90 hover:text-white p-1"
        >
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 relative z-10 p-4 overflow-y-auto overscroll-none"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Instruction Text */}
        {showDragInstruction && (
          <div className="flex justify-center mb-4">
            {isLoadingOlderMessages ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-white/70 text-sm">Loading older messages...</p>
              </div>
            ) : hasMoreMessages ? (
              <p className="text-white/70 text-sm">Drag down to load more messages</p>
            ) : (
              <p className="text-white/50 text-sm">No more messages to load</p>
            )}
          </div>
        )}
        
        {/* Visual Drag Space */}
        {dragDistance > 0 && (
          <div 
            className="transition-all duration-200"
            style={{ height: `${dragDistance}px` }}
          >
            <div className="flex justify-center items-center h-full">
              {isLoadingOlderMessages ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <p className="text-white/50 text-xs">Loading older messages...</p>
                </div>
              ) : (
                <p className="text-white/50 text-xs">Release to load more messages</p>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {messages.map((message, index) => {
            const hasError = messageSendErrors[message.message_id];
            return (
              <div
                key={`${message.message_id}-${index}`}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex flex-col items-end max-w-xs lg:max-w-md">
                  <div
                    className={`px-4 py-3 rounded-2xl backdrop-blur-sm ${
                      message.sender === 'user'
                        ? 'bg-blue-500/90 text-white rounded-br-md'
                        : 'bg-white/90 text-gray-800 rounded-bl-md'
                    } ${hasError ? 'border-2 border-red-400' : ''}`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Error message and retry button */}
                  {hasError && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-red-400">{hasError}</span>
                      <button
                        onClick={() => retryMessageSend(String(message.message_id))}
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area - With join status */}
      <div className="relative z-10 p-4 bg-black/20 backdrop-blur-md border-t border-white/10">
        {/* Show join status if not yet joined */}
        {!isJoined && isJoiningChatroom && (
          <div className="mb-3 flex items-center gap-2 text-sm">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-white/70">
              {joinRetryCount > 0 ? `Joining chatroom (attempt ${joinRetryCount + 1})...` : 'Joining chatroom...'}
            </span>
          </div>
        )}
        
        {!isJoined && !isJoiningChatroom && joinRetryCount > 0 && (
          <div className="mb-3 text-sm text-red-400">
            Failed to join chatroom. Retrying...
          </div>
        )}
        
        {/* Show insufficient funds status */}
        {insufficientFunds && (
          <div className="mb-3 text-sm text-red-400 text-center">
            Insufficient funds to send messages
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={!isJoined ? "Joining chatroom..." : insufficientFunds ? "Insufficient funds" : "Type a message..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isJoined || insufficientFunds}
              className={`w-full bg-white/90 backdrop-blur-sm border-none rounded-full px-6 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-400 focus:bg-white ${
                !isJoined || insufficientFunds ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isJoined || insufficientFunds}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-0"
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}