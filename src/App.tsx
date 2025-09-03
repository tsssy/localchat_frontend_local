import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Loading } from './components/pages/loading';
import { Messages } from './components/pages/messages';
import { Shop } from './components/pages/shop';
import { ChatScreen } from './components/pages/chat';
import { PurchaseHistory } from './components/pages/purchase-history/PurchaseHistory';
import { BottomNavigation } from './components/BottomNavigation';
import { DebugWidget } from './components/ui/DebugWidget';
import { ReconnectionIndicator } from './components/ui/ReconnectionIndicator';
import { UserSession } from './utils/userSession';
import { APIServices } from './api/http/v1/APIServices';
import { MessageToastService } from './services/MessageToastService.tsx';
import type { MessageCardData, ProductData } from './api/http/v1/APISchemes';

type AppPage = 'loading' | 'messages' | 'shop' | 'chat' | 'purchaseHistory';
type TabPage = 'messages' | 'shop';

interface InitializationData {
  userId: string; // Changed from number to string
  lastPage: string;
  meta: Record<string, any>;
  numberOfMatchRequests: number;
  userLocation: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('loading');
  const [activeTab, setActiveTab] = useState<TabPage>('messages');
  const [currentChatGirl, setCurrentChatGirl] = useState<any>(null);
  const [userSession, setUserSession] = useState<InitializationData | null>(null);
  const [pageStack, setPageStack] = useState<AppPage[]>([]); // Navigation stack for back button
  const [newMessageChatrooms, setNewMessageChatrooms] = useState<Set<string>>(new Set()); // Track chatrooms with new messages
  const [isMessagesPageMounted, setIsMessagesPageMounted] = useState(false); // Track if Messages page is mounted

  // Set up global message notification handling
  useEffect(() => {
    if (userSession) {
      console.log('🔧 [App] Setting up global message notification handler');
      
      // Define global handler for new chatroom messages
      const handleNewChatroomMessage = (notificationData: any) => {
        console.log('🍞 [App] Handling new chatroom message notification:', notificationData);
        
        try {
          const { name, agent_name, message_preview, metadata } = notificationData;
          const displayName = name || agent_name || 'Unknown User';
          const message = message_preview || 'New message';
          const chatroomId = metadata?.chatroom_id;
          
          console.log('🔍 [App] Parsed notification data:', {
            displayName,
            message,
            chatroomId,
            isMessagesPageMounted
          });
          
          if (!chatroomId) {
            console.warn('⚠️ [App] Missing chatroom_id in notification');
            return;
          }
          
          // Add to new message chatrooms for red dot indicator
          setNewMessageChatrooms(prev => {
            console.log('🔴 [App] Adding red dot for chatroom:', chatroomId);
            return new Set([...prev, chatroomId]);
          });
          
          // Show toast only if NOT on Messages page
          if (!isMessagesPageMounted) {
            console.log('🍞 [App] Showing toast notification (not on Messages page)');
            MessageToastService.showMessageToast({
              name: displayName,
              message: message,
              chatroomId: chatroomId,
              onNavigate: handleToastNavigation
            });
          } else {
            console.log('📝 [App] User on Messages page, not showing toast (will update UI instead)');
            
            // Call Messages component's global handler to update the UI
            if (typeof window !== 'undefined' && (window as any).messagesCardManager) {
              console.log('📬 [App] Calling Messages page card manager');
              (window as any).messagesCardManager.handleNewMessage(notificationData);
            } else {
              console.warn('⚠️ [App] Messages page card manager not found');
            }
          }
          
        } catch (error) {
          console.error('❌ [App] Error handling new chatroom message:', error);
        }
      };
      
      // Make handler globally available for Loading component to call
      (window as any).handleNewChatroomMessage = handleNewChatroomMessage;
      console.log('✅ [App] Global message handler registered on window');
      
      // Cleanup on unmount
      return () => {
        console.log('🧹 [App] Cleaning up global message handler');
        delete (window as any).handleNewChatroomMessage;
      };
    }
  }, [userSession, isMessagesPageMounted]);

  // Handle initialization completion from Loading page
  const handleInitializationComplete = (data: InitializationData) => {
    setUserSession(data);
    
    // Parse last_page and route accordingly
    const { lastPage } = data;
    
    console.log('🚀 [App] Handling initialization complete, routing to:', lastPage);
    
    if (lastPage === 'shop' || lastPage === 'new_match' || lastPage === 'messages') {
      // Direct routing to main pages
      if (lastPage === 'shop') {
        setActiveTab('shop');
        setCurrentPage('shop');
              } else if (lastPage === 'new_match') {
          setActiveTab('messages');
          setCurrentPage('messages');
      } else if (lastPage === 'messages') {
        setActiveTab('messages');
        setCurrentPage('messages');
        
        // Check if this is a chatroom routing from start_param
        const chatroomId = data.meta?.chatroomId;
        if (chatroomId) {
          console.log('🚀 [App] Detected chatroom routing from start_param, auto-opening chatroom:', chatroomId);
          
          // Auto-open the chatroom after a brief delay to ensure Messages page is loaded
          setTimeout(async () => {
            try {
              // Create chat girl object with chatroomId for navigation
              setCurrentChatGirl({
                chatroomId: chatroomId, // Use chatroomId property for ChatScreen
                id: chatroomId, // Keep id for backward compatibility
                name: `Chatroom ${chatroomId}`,
                photo: 'https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300',
                photos: ['https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300'],
                isOnline: true,
                age: 25,
                location: 'Unknown',
                tags: ['Chat'],
                bio: 'Loading chat...',
                showProfile: false // Default to chatroom view
              });
              
              console.log('✅ [App] Opening chat with chatroomId:', chatroomId);
              setCurrentPage('chat');
              
            } catch (error) {
              console.error('❌ [App] Failed to setup chat:', error);
              setCurrentPage('chat');
            }
          }, 500);
        }
      }
    } else if (lastPage.startsWith('chatroom-')) {
      // Parse chatroom page format: chatroom-{chatroomId} or chatroom-{chatroomId}-{chatroom|profile}
      const parts = lastPage.split('-');
      if (parts.length >= 2) {
        const chatroomId = parts[1];
        const section = parts.length >= 3 ? parts[2] : 'chatroom'; // Default to 'chatroom' if no section specified
        
        console.log('🚀 [App] Parsing chatroom route:', { chatroomId, section });
        
        // First go to messages page
        setActiveTab('messages');
        setCurrentPage('messages');
        
        // Then automatically open the chat after a brief delay
        setTimeout(async () => {
          try {
            // Create chat girl object with chatroomId for navigation
            setCurrentChatGirl({
              chatroomId: chatroomId, // Use chatroomId property for ChatScreen
              id: chatroomId, // Keep id for backward compatibility
              name: `Chatroom ${chatroomId}`,
              photo: 'https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300',
              photos: ['https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300'],
              isOnline: true,
              age: 25,
              location: 'Unknown',
              tags: ['Chat'],
              bio: 'Loading chat...',
              showProfile: section === 'profile'
            });
            
            console.log('✅ [App] Opening chat with chatroomId:', chatroomId);
            
            setCurrentPage('chat');
            
          } catch (error) {
            console.error('❌ [App] Failed to load chat profile:', error);
            // Still open chat with minimal data
            setCurrentChatGirl({
              id: chatroomId,
              name: `User_${chatroomId}`,
              photo: 'https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300',
              photos: ['https://images.unsplash.com/photo-1603258339703-9c33e0733e4b?w=300'],
              isOnline: true,
              age: 25,
              location: 'Unknown',
              tags: ['Chat'],
              bio: 'Continuing previous conversation...',
              showProfile: section === 'profile'
            });
            setCurrentPage('chat');
          }
        }, 500);
      } else {
        // Invalid chatroom format (less than 2 parts), fallback to messages
        console.warn('⚠️ [App] Invalid chatroom format, falling back to messages');
        setActiveTab('messages');
        setCurrentPage('messages');
      }
    } else {
      // Default fallback - go to messages page
      console.log('🎯 [App] Using default fallback route: messages');
      setActiveTab('messages');
      setCurrentPage('messages');
    }
  };



  // Handle clearing red dot when chatroom is clicked
  const handleChatroomRedDotClear = (chatroomId: string) => {
    console.log(`🔴 [App] Clearing red dot for chatroom: ${chatroomId}`);
    setNewMessageChatrooms(prev => {
      const updated = new Set(prev);
      updated.delete(chatroomId);
      return updated;
    });
  };

  // Handle setting red dot when new message arrives
  const handleChatroomRedDotSet = (chatroomId: string) => {
    console.log(`🔴 [App] Clearing red dot for chatroom: ${chatroomId}`);
    setNewMessageChatrooms(prev => {
      const updated = new Set(prev);
      updated.add(chatroomId);
      return updated;
    });
  };

  // Handle Messages page mount state changes
  const handleMessagesPageMountChange = (isMounted: boolean) => {
    console.log(`📝 [App] Messages page mount state changed: ${isMounted}`);
    setIsMessagesPageMounted(isMounted);
  };

  // Handle clearing cache when Get Another Match is clicked
  const handleClearCache = (cacheTypes: string[]) => {
    console.log(`🗑️ [App] Clearing caches:`, cacheTypes);
    
    if (userSession && userSession.meta) {
      // Create a copy of userSession with cleared caches
      const updatedUserSession = { ...userSession };
      const updatedMeta = { ...updatedUserSession.meta };
      
      cacheTypes.forEach(cacheType => {
        if (updatedMeta[cacheType]) {
          console.log(`🗑️ [App] Clearing ${cacheType} cache`);
          updatedMeta[cacheType] = null;
        }
      });
      
      updatedUserSession.meta = updatedMeta;
      setUserSession(updatedUserSession);
      
      console.log(`✅ [App] Caches cleared successfully:`, cacheTypes);
    } else {
      console.warn('⚠️ [App] No userSession or meta available for cache clearing');
    }
  };

  // Handle updating cache after fresh API calls
  const handleUpdateCache = (cacheType: string, cacheData: any) => {
    console.log(`📦 [App] Updating cache: ${cacheType}`, cacheData);
    
    if (userSession && userSession.meta) {
      // Create a copy of userSession with updated cache
      const updatedUserSession = { ...userSession };
      const updatedMeta = { ...updatedUserSession.meta };
      
      updatedMeta[cacheType] = cacheData;
      updatedUserSession.meta = updatedMeta;
      setUserSession(updatedUserSession);
      
      console.log(`✅ [App] Cache updated successfully: ${cacheType}`);
    } else {
      console.warn('⚠️ [App] No userSession or meta available for cache updating');
    }
  };

  // Simple test function for debugging (can be removed in production)
  const testDirectToast = () => {
    console.log('🍞 [App] Testing direct toast notification');
    toast('Test notification', {
      description: 'This is a test message',
      duration: 5000,
    });
  };

  // Test function to manually trigger notification (for debugging)
  const triggerTestNotification = () => {
    console.log('🧪 [App] Triggering test notification');
    
    const testNotification = {
      type: 'message.new_in_chatroom',
      name: 'Test User',
      message_preview: 'This is a test message',
      metadata: {
        chatroom_id: 'test-chatroom-123'
      }
    };
    
    if ((window as any).handleNewChatroomMessage) {
      console.log('🧪 [App] Global handler found, calling...');
      (window as any).handleNewChatroomMessage(testNotification);
    } else {
      console.error('❌ [App] Global handler not found on window');
    }
  };

  // Handle toast navigation - switch to Messages tab first, then open chatroom
  const handleToastNavigation = async (chatroomId: string) => {
    console.log(`🍞 [App] Toast navigation to chatroom: ${chatroomId}`);
    
    // Step 1: Switch to messages tab and page first
    setActiveTab('messages');
    setCurrentPage('messages');
    
    // Remove the red dot for this chatroom
    setNewMessageChatrooms(prev => {
      const updated = new Set(prev);
      updated.delete(chatroomId);
      return updated;
    });
    
    // Step 2: Wait for Messages page to mount, then navigate to chatroom
    setTimeout(() => {
      console.log(`🎯 [App] Opening chatroom: ${chatroomId}`);
      
      // Push current page to stack before navigating to chat
      setPageStack(prev => [...prev, currentPage]);
      setCurrentChatGirl({ chatroomId }); // Only pass chatroomId
      setCurrentPage('chat');
      
    }, 300); // Small delay to ensure Messages page is loaded
  };

  // Handle navigation to shop from chat (for insufficient funds)
  const handleNavigateToShop = () => {
    console.log('💰 [App] Navigating to shop due to insufficient funds');
    
    // Close chat first
    setCurrentChatGirl(null);
    
    // Navigate to shop
    setActiveTab('shop');
    setCurrentPage('shop');
    
    // Clear navigation stack 
    setPageStack([]);
  };





  const handlePurchaseHistory = () => {
    // Push current page to stack before navigating to purchase history
    setPageStack(prev => [...prev, currentPage]);
    setCurrentPage('purchaseHistory');
  };

  const handleClosePurchaseHistory = () => {
    // Pop from stack - return to previous page
    if (pageStack.length > 0) {
      const previousPage = pageStack[pageStack.length - 1];
      setPageStack(prev => prev.slice(0, -1)); // Remove last item from stack
      setCurrentPage(previousPage);
    } else {
      // Fallback - shouldn't happen, but go to shop if stack is empty
      setCurrentPage('shop');
      setActiveTab('shop');
    }
  };

  const handleMessageClick = (messageCard: { chatroom_id: string }) => {
    // Push current page to stack before navigating to chat
    setPageStack(prev => [...prev, currentPage]);
    
    // Only store chatroomId for the new simplified ChatScreen interface
    setCurrentChatGirl({ chatroomId: messageCard.chatroom_id });
    setCurrentPage('chat'); // Navigate to chat page
  };

  const handleCloseChat = () => {
    setCurrentChatGirl(null);
    
    // Pop from stack - return to previous page
    if (pageStack.length > 0) {
      const previousPage = pageStack[pageStack.length - 1];
      setPageStack(prev => prev.slice(0, -1)); // Remove last item from stack
      setCurrentPage(previousPage);
      
      // Update activeTab to match the page we're returning to
      if (previousPage === 'messages') {
        setActiveTab('messages');
      } else if (previousPage === 'shop') {
        setActiveTab('shop');
      }
    } else {
      // Fallback - shouldn't happen, but go to messages if stack is empty
      setCurrentPage('messages');
      setActiveTab('messages');
    }
  };

  // Handle tab navigation
  const handleTabChange = (tab: TabPage) => {
    setActiveTab(tab);
    if (tab === 'messages') {
      setCurrentPage('messages');
    } else if (tab === 'shop') {
      setCurrentPage('shop');
    }
    
    // Clear navigation stack when manually switching tabs
    setPageStack([]);
    
    // Close any open chat when switching tabs
    setCurrentChatGirl(null);
  };

  // Loading page
  if (currentPage === 'loading') {
    return <Loading onInitializationComplete={handleInitializationComplete} />;
  }

  // Chat page (full screen)
  if (currentPage === 'chat' && currentChatGirl) {
    return (
      <div className="h-screen bg-slate-900 text-white overflow-hidden">
        {/* Global Debug Widget for Chat Page */}
        <DebugWidget 
          debugInfo={{
            raw_telegram_info: userSession?.meta?.telegramData || null,
            userSession: UserSession.get(),
            start_param_info: {
              start_param: userSession?.meta?.startParam,
              routing_reason: userSession?.meta?.routingReason,
              last_visited_page: userSession?.meta?.lastVisitedPage,
              last_visited_url: userSession?.meta?.lastVisitedUrl,
              current_page: currentPage,
              chat_girl_id: currentChatGirl?.id
            }
          }}
          title="Debug Info"
          position="top-right"
        />
        
        <ChatScreen
          chatroomId={currentChatGirl?.chatroomId}
          userSession={userSession}
          onClose={handleCloseChat}
          onNavigateToShop={handleNavigateToShop}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* RULE 4: Top bar reconnection indicator */}
      <ReconnectionIndicator />
      
      {/* Global Debug Widget for Main App */}
      <DebugWidget 
        debugInfo={{
          raw_telegram_info: userSession?.meta?.telegramData || null,
          userSession: UserSession.get(),
          start_param_info: {
            start_param: userSession?.meta?.startParam,
            routing_reason: userSession?.meta?.routingReason,
            last_visited_page: userSession?.meta?.lastVisitedPage,
            last_visited_url: userSession?.meta?.lastVisitedUrl,
            current_page: currentPage,
            active_tab: activeTab
          },
          newMessageChatrooms: Array.from(newMessageChatrooms),
          isMessagesPageMounted
        }}
        title="Debug Info"
        position="top-right"
        testActions={[
          { 
            label: '🍞 Direct Toast Test', 
            action: testDirectToast 
          },
          { 
            label: '🧪 Test Full Notification', 
            action: triggerTestNotification 
          }
        ]}
      />
      
      <div className="flex-1 overflow-hidden">
        {currentPage === 'messages' && (
          <Messages
            userSession={userSession}
            onMessageClick={handleMessageClick}
            newMessageChatrooms={newMessageChatrooms}
            onMessagesPageMountChange={handleMessagesPageMountChange}
            onChatroomRedDotClear={handleChatroomRedDotClear}
            onChatroomRedDotSet={handleChatroomRedDotSet}
          />
        )}
        
        {currentPage === 'shop' && (
          <Shop
            userSession={userSession}
            onPurchaseHistory={handlePurchaseHistory}
          />
        )}
        
        {currentPage === 'purchaseHistory' && (
          <PurchaseHistory
            userSession={userSession}
            onClose={handleClosePurchaseHistory}
          />
        )}
      </div>
      
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-center"
        richColors
        closeButton
      />
    </div>
  );
}