import { useEffect, useState } from 'react';
import { TelegramConfig, AppConfig } from '../../../../config/config';
import { APIServices } from '../../../api/http/v1/APIServices';
import { UserSession, type UserSessionData } from '../../../utils/userSession';
import { DebugWidget } from '../../ui/DebugWidget';
import { PusherService } from '../../../services/PusherService';

interface LoadingProps {
  onInitializationComplete: (data: {
    userId: string; // Changed from number to string
    lastPage: string;
    meta: Record<string, any>;
    numberOfMatchRequests: number;
    userLocation: string;
  }) => void;
}

interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };
    chat?: any;
    receiver?: any;
    start_param?: string;
    can_send_after?: number;
    auth_date?: number;
    hash?: string;
  };
  ready: () => void;
  initData?: string;
  safeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  contentSafeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  viewportHeight?: number;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  colorScheme?: string;
  themeParams?: any;
  isClosingConfirmationEnabled?: boolean;
  isVerticalSwipesEnabled?: boolean;
  headerColor?: string;
  backgroundColor?: string;
  bottomBarColor?: string;
  version?: string;
  platform?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function Loading({ onInitializationComplete }: LoadingProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>('Starting initialization...');

  const addCheckpoint = (message: string) => {
    console.log(message);
    if (AppConfig.DEBUG) {
      setLoadingStatus(message);
    }
  };

  const updateStatus = (message: string) => {
    console.log(message);
    if (AppConfig.DEBUG) {
      setLoadingStatus(message);
    }
  };

  useEffect(() => {
    // Add global error handlers to catch any unhandled errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 [Loading] Unhandled Promise Rejection:', event.reason);
      updateStatus(`❌ Unhandled Promise Rejection: ${event.reason}`);
      setDebugInfo({
        timestamp: new Date().toISOString(),
        error: `Unhandled Promise Rejection: ${event.reason}`,
        errorType: 'unhandledrejection',
        config: {
          USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
          SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
        }
      });
    };

    const handleError = (event: ErrorEvent) => {
      console.error('🚨 [Loading] Global Error:', event.error, event.message);
      updateStatus(`❌ Global Error: ${event.message}`);
      setDebugInfo({
        timestamp: new Date().toISOString(),
        error: `Global Error: ${event.message}`,
        errorType: 'error',
        stack: event.error?.stack,
        config: {
          USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
          SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
        }
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Start initialization with comprehensive error tracking
    initializeAppWithTracking();

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const initializeAppWithTracking = async () => {
    console.log('🚀 [Loading] Starting initializeAppWithTracking...');
    addCheckpoint('🚀 Starting initialization with full error tracking...');
    
    try {
      await initializeApp();
    } catch (error) {
      console.error('🚨 [Loading] initializeAppWithTracking caught error:', error);
      console.error('🚨 [Loading] Error type:', typeof error);
      console.error('🚨 [Loading] Error instanceof Error:', error instanceof Error);
      console.error('🚨 [Loading] Error toString:', error?.toString());
      console.error('🚨 [Loading] Error stack:', error?.stack);
      console.error('🚨 [Loading] Error name:', error?.name);
      console.error('🚨 [Loading] Error message:', error?.message);
      console.error('🚨 [Loading] Error constructor:', error?.constructor?.name);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('🚨 [Loading] Final error message extracted:', errorMessage);
      
      addCheckpoint(`❌ Initialization failed (tracked): ${errorMessage}`);
      
      if (AppConfig.SHOW_DEBUG_INFO) {
        setDebugInfo(prevDebug => ({
          // Keep any existing telegram data
          ...prevDebug,
          // Add error info but don't overwrite telegram data
          error_info: {
            timestamp: new Date().toISOString(),
            error: errorMessage,
            errorType: typeof error,
            errorInstanceofError: error instanceof Error,
            errorToString: error?.toString(),
            errorStack: (error as any)?.stack,
            config: {
              USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
              SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
            }
          }
        }));
      }
    }
  };

  const performParallelCaching = async (userId: string) => {
    console.log('📦 [Loading] Starting parallel API caching for essential data...');
    updateStatus('Step 5/6: Caching essential data...');

    const cacheResults = {
      matchingCache: null as any,
      productsCache: null as any,
      settingsCache: null as any
    };

    // Start all API calls in parallel
    const cachePromises = [
      // Sequential matching cache (getCurrentMatches -> conditional getMatches)
      cacheMatchingData(userId),
      // Parallel products cache
      cacheProductsData(),
      // Parallel settings cache
      cacheUserSettingsData()
    ];

    // Wait for all to complete and collect results
    const results = await Promise.allSettled(cachePromises);

    // Process results and continue with partial caching on errors
    results.forEach((result, index) => {
      const cacheNames = ['MatchingCache', 'ProductsCache', 'SettingsCache'];
      const cacheKeys = ['matchingCache', 'productsCache', 'settingsCache'];
      
      if (result.status === 'fulfilled') {
        console.log(`✅ [Loading] ${cacheNames[index]} successful`);
        (cacheResults as any)[cacheKeys[index]] = result.value;
      } else {
        console.error(`❌ [Loading] ${cacheNames[index]} failed:`, result.reason);
        updateStatus(`Step 5/6: ${cacheNames[index]} failed, continuing...`);
        // Continue with null cache - components will fallback to API calls
        (cacheResults as any)[cacheKeys[index]] = null;
      }
    });

    console.log('📦 [Loading] Parallel caching complete:', {
      matchingCacheSuccess: !!cacheResults.matchingCache,
      productsCacheSuccess: !!cacheResults.productsCache,
      settingsCacheSuccess: !!cacheResults.settingsCache
    });

    updateStatus('Step 5/6: API caching complete');
    return cacheResults;
  };

  // Cache matching data (sequential: getCurrentMatches -> conditional getMatches)
  const cacheMatchingData = async (userId: string) => {
    console.log('📦 [Loading] Caching matching data...');
    
    try {
      // Step 1: Get current matches
      console.log('📡 [Loading] Calling getCurrentMatches for cache...');
      const currentMatchesResponse = await APIServices.getCurrentMatches();
      
      // ALWAYS update cache after GET call (unconditional) - only if code 200
      let matchingCache = {
        currentMatches: currentMatchesResponse,
        cachedAt: new Date().toISOString(),
        userId: userId
      };

      // Step 2: Conditional getMatches call - use metadata logic instead of lastMatch
      if (currentMatchesResponse.code === 200 && 
          currentMatchesResponse.data.candidates.length === 0) {
        
        const canGetFreeMatch = currentMatchesResponse.data.metadata?.match_summary?.has_initial_matches || 
                               currentMatchesResponse.data.metadata?.match_summary?.can_get_daily_free;
        
        if (canGetFreeMatch) {
          // No unused candidates but can get free match, get new free matches
          console.log('📡 [Loading] No current matches but can get free match, calling getMatches(false) for cache...');
          await APIServices.getMatches(false);
          
          // Always call getCurrentMatches after POST to get fresh data
          console.log('📡 [Loading] Getting current matches after POST for cache...');
          const updatedCurrentMatches = await APIServices.getCurrentMatches();
          
          // ALWAYS update cache after GET call (unconditional) - only if code 200
          if (updatedCurrentMatches.code === 200) {
            console.log('✅ [Loading] Second GET call successful, updating cache');
            matchingCache.currentMatches = updatedCurrentMatches;
            console.log('📦 [Loading] Cache updated with second GET response');
          }
        }
      }

      console.log('✅ [Loading] Matching data cached successfully');
      return matchingCache;
    } catch (error) {
      console.error('❌ [Loading] Failed to cache matching data:', error);
      throw new Error(`Matching cache failed: ${error instanceof Error ? error.message : error}`);
    }
  };

  // Cache products data
  const cacheProductsData = async () => {
    console.log('📦 [Loading] Caching products data...');
    
    try {
      console.log('📡 [Loading] Calling getProducts() for cache...');
      const productsResponse = await APIServices.getProducts();
      
      const productsCache = {
        products: productsResponse,
        cachedAt: new Date().toISOString()
      };

      console.log('✅ [Loading] Products data cached successfully');
      return productsCache;
    } catch (error) {
      console.error('❌ [Loading] Failed to cache products data:', error);
      throw new Error(`Products cache failed: ${error instanceof Error ? error.message : error}`);
    }
  };

  // Cache user settings data
  const cacheUserSettingsData = async () => {
    console.log('📦 [Loading] Caching user settings data...');
    
    try {
      console.log('📡 [Loading] Calling getUserSettings() for cache...');
      const settingsResponse = await APIServices.getUserSettings();
      
      const settingsCache = {
        settings: settingsResponse,
        cachedAt: new Date().toISOString()
      };

      console.log('✅ [Loading] User settings data cached successfully');
      return settingsCache;
    } catch (error) {
      console.error('❌ [Loading] Failed to cache user settings data:', error);
      throw new Error(`Settings cache failed: ${error instanceof Error ? error.message : error}`);
    }
  };

  const initializeApp = async () => {
    console.log('🚀 CHECKPOINT 1: initializeApp starting');
    addCheckpoint('CHECKPOINT 1: initializeApp starting');
    
    try {
      console.log('🚀 CHECKPOINT 2: About to collect Telegram data');
      addCheckpoint('CHECKPOINT 2: About to collect Telegram data');
      
      let telegramData: any;
      
      try {
        console.log('🚀 CHECKPOINT 3: Calling getAllTelegramInfo');
        addCheckpoint('CHECKPOINT 3: Calling getAllTelegramInfo');
        telegramData = await getAllTelegramInfo();
        console.log('🚀 CHECKPOINT 4: getAllTelegramInfo returned successfully');
        addCheckpoint('CHECKPOINT 4: getAllTelegramInfo returned successfully');
      } catch (telegramError) {
        console.error('❌ CHECKPOINT 3.1: getAllTelegramInfo failed:', telegramError);
        addCheckpoint(`CHECKPOINT 3.1: getAllTelegramInfo FAILED - ${telegramError instanceof Error ? telegramError.message : telegramError}`);
        throw telegramError; // Don't wrap the error, just pass it through
      }
      
      console.log('🚀 CHECKPOINT 5: Setting debug info with collected Telegram data');
      addCheckpoint('CHECKPOINT 5: Setting debug info with collected Telegram data');
      
      // IMMEDIATELY set debug info with the collected Telegram data
      if (AppConfig.SHOW_DEBUG_INFO) {
        console.log('✅ [Loading] Setting debug info with Telegram data:', telegramData);
        setDebugInfo({
          // Raw Telegram data first
          raw_telegram_data: telegramData,
          // Then processed info
          telegram_web_app_available: !!window.Telegram?.WebApp,
          telegram_init_data_raw: telegramData.telegram?.initData,
          telegram_user_data: telegramData.telegram?.user,
          start_param_info: {
            raw_start_param: telegramData.telegram?.rawStartParam,
            validated_start_param: telegramData.telegram?.validatedStartParam,
            is_start_param_valid: !!telegramData.telegram?.validatedStartParam,
            start_param_length: telegramData.telegram?.rawStartParam?.length || 0,
            routing_decision: {
              target_page: 'Will be determined after auth',
              routing_reason: 'Pending authentication'
            }
          },
          collection_info: {
            collected_at_checkpoint: '4 - After successful getAllTelegramInfo',
            timestamp: new Date().toISOString(),
            use_example_json: TelegramConfig.USE_EXAMPLE_JSON
          }
        });
        console.log('✅ [Loading] Debug info set successfully');
      }
      
      console.log('🚀 CHECKPOINT 6: Debug info completed');
      addCheckpoint('CHECKPOINT 6: Debug info completed');
      
      console.log('🚀 CHECKPOINT 7: About to call authentication API');
      addCheckpoint('CHECKPOINT 7: About to call authentication API');
      
      // Step 2: Call API and handle authentication
      console.log('📡 [Loading] Step 2: Calling Telegram authentication API...');
      updateStatus('Step 2/5: Authenticating with server...');
      
      // Extract initData for API call
      const initData = telegramData.telegram?.initData;
      if (!initData) {
        console.error('❌ [Loading] No initData found in telegramData:', telegramData);
        addCheckpoint('CHECKPOINT 7.1: ERROR - No initData available');
        throw new Error('No Telegram initData available for authentication');
      }
      
      console.log('🚀 CHECKPOINT 8: initData found, calling API');
      addCheckpoint('CHECKPOINT 8: initData found, calling API');
      
      // Call Telegram auth API
      let authResponse: any;
      try {
        console.log('🚀 CHECKPOINT 9: Calling APIServices.authenticateTelegram');
        addCheckpoint('CHECKPOINT 9: Calling APIServices.authenticateTelegram');
        authResponse = await APIServices.authenticateTelegram({
          telegram_init_data: initData,
          start_param: telegramData.telegram?.validatedStartParam || undefined
        });
        console.log('🚀 CHECKPOINT 10: API call successful');
        addCheckpoint('CHECKPOINT 10: API call successful');
      } catch (authError) {
        console.error('❌ [Loading] Authentication API failed:', authError);
        updateStatus(`❌ Step 2/5 Failed: ${authError instanceof Error ? authError.message : authError}`);
        throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : authError}`);
      }
      
      console.log('✅ [Loading] Authentication successful');
      updateStatus('Step 2/5: Authentication successful, saving session...');
      
      // Continue with rest of initialization...
      // [Rest of the function remains the same]
      
      // Step 3: Save authentication data to user session
      const sessionData: UserSessionData = {
        access_token: authResponse.data.access_token,
        refresh_token: authResponse.data.refresh_token,
        token_type: authResponse.data.token_type,
        user_id: authResponse.data.user.id,
        username: authResponse.data.user.username,
        telegram_id: authResponse.data.user.telegram_id,
        location: authResponse.data.user.location
      };
      
      console.log('🔍 [Loading] About to save session data:', {
        user_id: authResponse.data.user.id,
        user_id_type: typeof authResponse.data.user.id,
        user_id_value: JSON.stringify(authResponse.data.user.id)
      });
      
      updateStatus('Step 3/5: Saving user session data...');
      UserSession.save(sessionData);
      updateStatus('Step 3/5: Session saved, initializing Pusher...');
      
      // Step 4: Initialize Pusher connection for real-time messaging (BLOCKING)
      console.log('📡 [Loading] Step 4: Initializing Pusher connection (REQUIRED)...');
      updateStatus('Step 4/5: Connecting to real-time messaging...');
      
      const pusherService = PusherService.getInstance();
      updateStatus('Step 4/5: Pusher instance created, initializing...');
      
      await pusherService.initialize();
      updateStatus('Step 4/5: Pusher initialized, waiting for connection...');
      
      // Wait for connection with timeout
      const connectionTimeout = 10000; // 10 seconds
      const connectionStartTime = Date.now();
      
      while (!pusherService.isConnected() && (Date.now() - connectionStartTime) < connectionTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateStatus(`Step 4/5: Waiting for Pusher connection... (${Math.round((Date.now() - connectionStartTime) / 1000)}s)`);
      }
      
      if (!pusherService.isConnected()) {
        const errorMsg = 'Pusher connection failed - required for real-time messaging';
        console.error('❌ [Loading] ' + errorMsg);
        updateStatus('Step 4/5: ❌ ' + errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('✅ [Loading] Pusher connection established successfully');
      updateStatus('Step 4/5: Pusher connected, subscribing to user notifications...');
      
      // Subscribe to private user channel for notifications (REQUIRED)
      await subscribeToUserNotifications(authResponse.data.user.id, pusherService);
      
      console.log('✅ [Loading] Pusher setup complete - user channel subscribed');
      updateStatus('Step 4/5: Pusher setup complete');
      
      // Step 5: Cache essential API data in parallel
      console.log('🎉 [Loading] Step 5: Starting parallel API caching...');
      addCheckpoint('Step 5/6: Starting parallel API caching...');
      
      const cacheResults = await performParallelCaching(authResponse.data.user.id);
      
      // Step 6: Determine routing based on start_param (highest priority) or last visited location
      console.log('🎉 [Loading] Initialization complete - determining route...');
      addCheckpoint('Step 6/6: Determining app routing...');
      
      // Get routing information from auth response and start param
      const lastVisitedPage = authResponse.data.user.last_visited_page;
      const startParam = telegramData.telegram?.validatedStartParam;
      
      console.log('📍 [Loading] Routing data:', {
        lastVisitedPage,
        startParam,
        hasStartParam: !!startParam
      });
      
      addCheckpoint('Step 6/6: Processing routing data...');
      
      // TODO: improvement needed to allow generic query, because this is a shipping feature
      // Check if start param is for chatroom routing (format: chatroom-{subaccount_id})
      let chatroomId = null;
      let targetPage = 'new_match'; // Default fallback
      let routingReason = 'default_fallback';
      
      if (startParam && startParam.startsWith('chatroom-')) {
        // Extract subaccount_id from chatroom-{subaccount_id} format
        const parts = startParam.split('-');
        if (parts.length >= 2) {
          chatroomId = parts[1]; // This is the subaccount_id
          targetPage = 'messages'; // Always go to messages first for stacking
          routingReason = 'start_param_chatroom';
          console.log('🚀 [Loading] Chatroom routing detected:', {
            startParam,
            extractedChatroomId: chatroomId,
            targetPage
          });
          addCheckpoint(`Step 6/6: Chatroom routing - subaccount_id: ${chatroomId}`);
        }
      } else if (lastVisitedPage) {
        // Use last_visited_page if no start_param chatroom routing
        targetPage = lastVisitedPage;
        routingReason = 'last_visited_page';
        console.log('🔄 [Loading] Routing via last_visited_page:', targetPage);
        addCheckpoint(`Step 6/6: Routing via last_visited_page to ${targetPage}`);
      } else {
        addCheckpoint(`Step 6/6: Using default routing to ${targetPage}`);
      }
      
      console.log('🎯 [Loading] Final routing decision:', {
        targetPage,
        routingReason,
        chatroomId,
        startParam,
        lastVisitedPage
      });
      
      addCheckpoint('Step 6/6: Updating debug info...');
      
      // Update debug info with final routing decision
      if (AppConfig.SHOW_DEBUG_INFO) {
        setDebugInfo(prevDebug => ({
          ...prevDebug,
          start_param_info: {
            ...prevDebug.start_param_info,
            routing_decision: {
              target_page: targetPage,
              routing_reason: routingReason,
              chatroom_id: chatroomId,
              start_param: startParam,
              last_visited_page: lastVisitedPage
            }
          }
        }));
      }
      
      addCheckpoint('Step 6/6: Launching app...');
      
      // Small delay to show the final status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addCheckpoint('✅ Initialization complete, launching...');
      
      onInitializationComplete({
        userId: authResponse.data.user.id, // Keep as string
        lastPage: targetPage, // Use determined target page (messages for chatroom routing)
        meta: { 
          telegramData, // Keep Telegram data for debug
          lastVisitedPage,
          startParam,
          routingReason,
          chatroomId, // Pass the extracted chatroom ID for stacking navigation
          // Add cached API data
          MatchingCache: cacheResults.matchingCache,
          ProductsCache: cacheResults.productsCache,
          SettingsCache: cacheResults.settingsCache
        },
        numberOfMatchRequests: 0, // Will be fetched when needed
        userLocation: 'NEED TO IMPLEMENT' // Will be fetched when needed
      });
      
    } catch (error) {
      console.error('💥 [Loading] Initialization error:', error);
      updateStatus('❌ Initialization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      if (AppConfig.SHOW_DEBUG_INFO) {
        setDebugInfo(prevDebug => ({
          // Keep any existing telegram data
          ...prevDebug,
          // Add final error info
          final_error: {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            config: {
              USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
              SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
            }
          }
        }));
      }
      
      // TODO: Handle error appropriately - maybe show error screen or retry
      // For now, just log the error
    }
  };

  const getAllTelegramInfo = async (): Promise<any> => {
    console.log('🚀 CHECKPOINT A: getAllTelegramInfo starting');
    addCheckpoint('CHECKPOINT A: getAllTelegramInfo starting');
    
    try {
      return new Promise((resolve, reject) => {
        console.log('🚀 CHECKPOINT B: Inside Promise constructor');
        addCheckpoint('CHECKPOINT B: Inside Promise constructor');
        
        try {
          // Check if USE_EXAMPLE_JSON is enabled - return example data if so
          if (TelegramConfig.USE_EXAMPLE_JSON) {
            console.log('🚀 CHECKPOINT C: USE_EXAMPLE_JSON enabled');
            addCheckpoint('CHECKPOINT C: USE_EXAMPLE_JSON enabled');
            
            // Load example data from the JSON file
            fetch('/example_full_telegram_data.json')
              .then(response => {
                console.log('🔍 [Loading] Fetch response received:', response.status, response.statusText);
                updateStatus(`Step 1/5: Fetch response status: ${response.status}`);
                if (!response.ok) {
                  const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                  console.error('❌ [Loading] Fetch not ok:', errorMsg);
                  updateStatus(`Step 1/5: Fetch failed: ${errorMsg}`);
                  throw new Error(errorMsg);
                }
                updateStatus('Step 1/5: Parsing example JSON...');
                return response.json();
              })
              .then(exampleData => {
                console.log('✅ [Loading] Example JSON data loaded:', exampleData);
                updateStatus('Step 1/5: Example JSON loaded successfully');
                resolve(exampleData);
              })
              .catch(error => {
                console.error('❌ [Loading] Failed to load example JSON:', error);
                updateStatus(`Step 1/5: Example JSON load error: ${error.message}`);
                const errorObj = {
                  timestamp: new Date().toISOString(),
                  error: 'Failed to load example_full_telegram_data.json: ' + error.message,
                  errorDetails: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    toString: error.toString()
                  },
                  config: {
                    USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
                    SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
                  }
                };
                console.log('🔍 [Loading] Resolving with error object:', errorObj);
                resolve(errorObj);
              });
            return;
          }

          // If not using example JSON, proceed with real Telegram data collection
          console.log('🚀 CHECKPOINT D: USE_EXAMPLE_JSON disabled - collecting real data');
          addCheckpoint('CHECKPOINT D: USE_EXAMPLE_JSON disabled - collecting real data');
          
          console.log('🚀 CHECKPOINT E: Checking navigator object');
          addCheckpoint('CHECKPOINT E: Checking navigator object');
          if (!navigator) {
            const error = 'Navigator object not available';
            console.error('❌ [Loading]', error);
            addCheckpoint(`CHECKPOINT E: ERROR - ${error}`);
            throw new Error(error);
          }
          
          console.log('🚀 CHECKPOINT F: Creating telegram data object');
          addCheckpoint('CHECKPOINT F: Creating telegram data object');
          // Initialize telegram data collection with real data
          const telegramData: any = {
            timestamp: new Date().toISOString(),
            config: {
              USE_EXAMPLE_JSON: TelegramConfig.USE_EXAMPLE_JSON,
              SHOW_DEBUG_INFO: AppConfig.SHOW_DEBUG_INFO
            },
            browser: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              languages: navigator.languages,
              cookieEnabled: navigator.cookieEnabled,
              onLine: navigator.onLine,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            telegram: {
              webAppAvailable: !!window.Telegram?.WebApp
            }
          };

          console.log('🚀 CHECKPOINT G: telegramData base object created');
          updateStatus('CHECKPOINT G: telegramData base object created');

          // Always try to collect Telegram information
          console.log('🚀 CHECKPOINT H: Checking for Telegram Web App');
          updateStatus('CHECKPOINT H: Checking for Telegram Web App');
          console.log('🔍 [Loading] window exists:', !!window);
          console.log('🔍 [Loading] window.Telegram exists:', !!window.Telegram);
          console.log('🔍 [Loading] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
          
          if (window.Telegram?.WebApp) {
            console.log('🚀 CHECKPOINT I: Telegram Web App found');
            updateStatus('CHECKPOINT I: Telegram Web App found');
            
            const tg = window.Telegram.WebApp;
            
            // Initialize Telegram Web App
            console.log('🚀 CHECKPOINT J: Initializing Telegram Web App');
            updateStatus('CHECKPOINT J: Initializing Telegram Web App');
            
            try {
              console.log('🚀 CHECKPOINT K: Calling tg.ready()');
              updateStatus('CHECKPOINT K: Calling tg.ready()');
              tg.ready();
              console.log('🚀 CHECKPOINT L: tg.ready() successful');
              updateStatus('CHECKPOINT L: tg.ready() successful');
            } catch (readyError) {
              console.error('❌ [Loading] Error calling tg.ready():', readyError);
              updateStatus(`CHECKPOINT K ERROR: tg.ready() failed: ${readyError}`);
              // Don't throw, continue anyway
            }
            
            console.log('🚀 CHECKPOINT M: About to collect Telegram properties');
            updateStatus('CHECKPOINT M: About to collect Telegram properties');
            
            console.log('🔍 [Loading] Collecting Telegram properties...');
            
            // Collect ALL available Telegram information
            try {
              updateStatus('Step 1/5: Building telegram properties object...');
              telegramData.telegram = {
                webAppAvailable: true,
                // Safe data (validated by Telegram servers)
                initData: tg.initData, // Cryptographically signed data
                safeAreaInset: {
                  top: tg.safeAreaInset?.top,
                  bottom: tg.safeAreaInset?.bottom,
                  left: tg.safeAreaInset?.left,
                  right: tg.safeAreaInset?.right
                },
                contentSafeAreaInset: {
                  top: tg.contentSafeAreaInset?.top,
                  bottom: tg.contentSafeAreaInset?.bottom,
                  left: tg.contentSafeAreaInset?.left,
                  right: tg.contentSafeAreaInset?.right
                },
                viewportHeight: tg.viewportHeight,
                viewportStableHeight: tg.viewportStableHeight,
                isExpanded: tg.isExpanded,
                colorScheme: tg.colorScheme,
                themeParams: tg.themeParams,
                isClosingConfirmationEnabled: tg.isClosingConfirmationEnabled,
                isVerticalSwipesEnabled: tg.isVerticalSwipesEnabled,
                headerColor: tg.headerColor,
                backgroundColor: tg.backgroundColor,
                bottomBarColor: tg.bottomBarColor,
                version: tg.version,
                platform: tg.platform,
                
                // Unsafe data (unvalidated, from client)
                initDataUnsafe: tg.initDataUnsafe,
                user: tg.initDataUnsafe?.user,
                chat: tg.initDataUnsafe?.chat,
                receiver: tg.initDataUnsafe?.receiver,
                startParam: tg.initDataUnsafe?.start_param,
                canSendAfter: tg.initDataUnsafe?.can_send_after,
                authDate: tg.initDataUnsafe?.auth_date,
                hash: tg.initDataUnsafe?.hash,
                
                // Processed start_param data
                rawStartParam: tg.initDataUnsafe?.start_param,
                validatedStartParam: validateStartParam(tg.initDataUnsafe?.start_param)
              };
              
              console.log('✅ [Loading] Telegram properties collected successfully');
              updateStatus('Step 1/5: Telegram properties collected, processing params...');
            } catch (collectError) {
              console.error('❌ [Loading] Error collecting Telegram properties:', collectError);
              updateStatus(`Step 1/5: Property collection error: ${collectError}`);
              throw new Error(`Failed to collect Telegram properties: ${collectError.message}`);
            }
            
            updateStatus('Step 1/5: Processing start parameters...');
            
            console.log('📱 [Loading] Telegram start_param data:', {
              rawStartParam: tg.initDataUnsafe?.start_param,
              validatedStartParam: telegramData.telegram.validatedStartParam,
              isValid: !!telegramData.telegram.validatedStartParam
            });
            
            updateStatus('Step 1/5: Processing user data...');
            
            const user = tg.initDataUnsafe?.user;
            console.log('🔍 [Loading] Telegram user object:', user);
            
            if (user?.id) {
              // Use real Telegram user data
              const telegramUserId = user.id;
              console.log('📱 [Loading] Telegram user ID loaded:', telegramUserId);
              updateStatus(`Step 1/5: User ID found: ${telegramUserId}`);
              
              telegramData.auth = {
                method: 'telegram',
                userId: telegramUserId,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                languageCode: user.language_code,
                isPremium: user.is_premium,
                photoUrl: user.photo_url
              };
              updateStatus('Step 1/5: User auth data built successfully');
            } else {
              console.error('❌ [Loading] No Telegram user data available');
              updateStatus('Step 1/5: ERROR - No Telegram user data available');
              telegramData.auth = {
                method: 'telegram',
                error: 'No Telegram user data available'
              };
            }
            
            console.log('✅ [Loading] Successfully collected Telegram data');
            updateStatus('Step 1/5: Telegram data collection complete - resolving');
            resolve(telegramData);
            return;
          }

          // If Telegram Web App is not available, return error information
          console.error('❌ [Loading] Telegram Web App not available');
          updateStatus('Step 1/5: Telegram Web App not available, using fallback...');
          
          telegramData.auth = {
            method: 'telegram',
            error: 'Telegram Web App not available'
          };
          telegramData.telegram.errorReason = 'window.Telegram.WebApp not found';
          
          console.log('⚠️ [Loading] Returning Telegram data with error info');
          updateStatus('Step 1/5: Fallback data prepared - resolving');
          resolve(telegramData);
          
        } catch (promiseError) {
          console.error('❌ [Loading] Error in getAllTelegramInfo Promise:', promiseError);
          console.error('❌ [Loading] Promise error type:', typeof promiseError);
          console.error('❌ [Loading] Promise error toString:', promiseError?.toString());
          console.error('❌ [Loading] Promise error stack:', promiseError?.stack);
          console.error('❌ [Loading] Promise error name:', promiseError?.name);
          console.error('❌ [Loading] Promise error message:', promiseError?.message);
          updateStatus(`Step 1/5: PROMISE ERROR: ${promiseError instanceof Error ? promiseError.message : String(promiseError)}`);
          const rejectError = new Error('Promise execution failed: ' + (promiseError instanceof Error ? promiseError.message : promiseError));
          console.error('❌ [Loading] About to reject with:', rejectError);
          reject(rejectError);
        }
      });
      
    } catch (outerError) {
      console.error('❌ [Loading] Outer error in getAllTelegramInfo:', outerError);
      console.error('❌ [Loading] Outer error type:', typeof outerError);
      console.error('❌ [Loading] Outer error toString:', outerError?.toString());
      console.error('❌ [Loading] Outer error stack:', outerError?.stack);
      console.error('❌ [Loading] Outer error name:', outerError?.name);
      console.error('❌ [Loading] Outer error message:', outerError?.message);
      updateStatus(`Step 1/5: OUTER ERROR: ${outerError instanceof Error ? outerError.message : String(outerError)}`);
      const throwError = new Error('getAllTelegramInfo failed: ' + (outerError instanceof Error ? outerError.message : outerError));
      console.error('❌ [Loading] About to throw outer error:', throwError);
      throw throwError;
    }
  };

  // Helper function to validate start_param according to Telegram specs
  const validateStartParam = (startParam: string | undefined): string | null => {
    if (!startParam) return null;
    
    // Telegram start_param validation: max 512 chars, only A-Z, a-z, 0-9, underscore, minus
    const startParamRegex = /^[\w-]{0,512}$/;
    
    if (!startParamRegex.test(startParam)) {
      console.warn('⚠️ [Loading] Invalid start_param format:', startParam);
      return null;
    }
    
    if (startParam.length > 512) {
      console.warn('⚠️ [Loading] start_param exceeds 512 character limit:', startParam.length);
      return null;
    }
    
    console.log('✅ [Loading] Valid start_param:', startParam);
    return startParam;
  };

  // Helper function to parse start_param to page name
  const parseStartParamToPage = (startParam: string): string => {
    console.log('🔍 [Loading] Parsing start_param:', startParam);
    
    // You can customize this logic based on your app's start_param conventions
    // Examples of start_param formats you might use:
    
    // Direct page routing
    if (startParam === 'new_match' || startParam === 'newmatch') {
      return 'new_match';
    }
    if (startParam === 'messages' || startParam === 'chat') {
      return 'messages';  
    }
    if (startParam === 'shop' || startParam === 'store') {
      return 'shop';
    }
    
    // Base64 encoded routing data (if you need to pass complex data)
    try {
      // Attempt to decode base64url-encoded routing info
      const decoded = atob(startParam.replace(/-/g, '+').replace(/_/g, '/'));
      const routingData = JSON.parse(decoded);
      
      console.log('🔍 [Loading] Decoded start_param routing data:', routingData);
      
      if (routingData.page) {
        return routingData.page;
      }
      if (routingData.chatroom && routingData.subaccount_id) {
        const section = routingData.section || 'chatroom';
        return `chatroom-${routingData.subaccount_id}-${section}`;
      }
    } catch (error) {
      // Not base64 encoded or invalid JSON, continue with other parsing
      console.log('🔍 [Loading] start_param is not base64 encoded JSON, trying other formats');
    }
    
    // Pattern-based routing (e.g., "chat_12345" or "profile_67890")
    if (startParam.includes('_')) {
      const [action, id] = startParam.split('_', 2);
      
      if (action === 'chat' && id) {
        return `chatroom-${id}-chatroom`;
      }
      if (action === 'profile' && id) {
        return `chatroom-${id}-profile`;
      }
      if (action === 'user' && id) {
        return `chatroom-${id}-chatroom`;
      }
    }
    
    // Hyphen-based routing (e.g., "chat-12345" or "profile-67890")
    if (startParam.includes('-')) {
      const [action, id] = startParam.split('-', 2);
      
      if (action === 'chat' && id) {
        return `chatroom-${id}-chatroom`;
      }
      if (action === 'profile' && id) {
        return `chatroom-${id}-profile`;
      }
    }
    
    // If no pattern matches, log and use default
    console.warn('⚠️ [Loading] Unrecognized start_param format, using default routing:', startParam);
    return 'new_match';
  };

  // Helper function to parse URL to page name (for backward compatibility)
  const parseUrlToPage = (url: string): string => {
    // This is a simple URL to page mapping
    // You can enhance this logic based on your URL structure
    if (url.includes('/new-match') || url.includes('/new-girls')) {
      return 'new_match';
    } else if (url.includes('/messages')) {
      return 'messages';
    } else if (url.includes('/shop')) {
      return 'shop';
    } else if (url.includes('/chatroom')) {
      // Extract subaccount_id and determine if it's profile or chatroom
      const chatroomMatch = url.match(/chatroom[/-]([^/-]+)[/-]?(profile|chatroom)?/);
      if (chatroomMatch) {
        const subAccountId = chatroomMatch[1];
        const section = chatroomMatch[2] || 'chatroom'; // default to chatroom if not specified
        return `chatroom-${subAccountId}-${section}`;
      }
      return 'messages'; // fallback to messages if parsing fails
    }
    
    return 'new_match'; // default fallback
  };

  // Subscribe to private user channel for notifications with retry logic (BLOCKING)
  const subscribeToUserNotifications = async (userId: string, pusherService: any, attempt: number = 1): Promise<void> => {
    const maxAttempts = 3;
    const channelName = `private-user-${userId}`;
    
    console.log(`🚀 [Loading] Attempting to subscribe to user notifications channel: ${channelName} (attempt ${attempt})`);
    
    try {
      // Set up notification message handler - this will handle ALL user notifications globally
      pusherService.setUserNotificationHandler(userId, (notificationData: any) => {
        console.log('🔔 [Loading] Received user notification:', notificationData);
        
        // Handle different types of notifications
        switch (notificationData.type) {
          case 'new_match':
            console.log('💕 [Loading] New match notification received');
            // Could show a toast notification or update UI
            break;
          case 'new_message':
            console.log('💬 [Loading] New message notification received');
            // Could update unread message count
            break;
          case 'message.new_in_chatroom':
            console.log('💬 [Loading] New message in chatroom notification received');
            console.log('💬 [Loading] Notification data:', notificationData);
            console.log('💬 [Loading] Window handler available:', !!(typeof window !== 'undefined' && window.handleNewChatroomMessage));
            
            // Extract message details and show toast (handled by App component)
            if (typeof window !== 'undefined' && (window as any).handleNewChatroomMessage) {
              console.log('💬 [Loading] Calling global handler...');
              (window as any).handleNewChatroomMessage(notificationData);
            } else {
              console.error('❌ [Loading] Global handler not found on window!');
            }
            break;
          case 'payment_completed':
            console.log('💰 [Loading] Payment completed notification received');
            // Could refresh user credits
            break;
          case 'system_announcement':
            console.log('📢 [Loading] System announcement received');
            // Could show system message
            break;
          default:
            console.log('❓ [Loading] Unknown notification type:', notificationData.type);
        }
      });
      
      // Subscribe to the private user channel and wait for success
      await pusherService.subscribeToUserChannel(userId);
      
      // Wait for subscription confirmation with timeout
      const subscriptionTimeout = 5000; // 5 seconds
      const subscriptionStartTime = Date.now();
      let subscriptionConfirmed = false;
      
      // Check if channel subscription succeeded
      const checkSubscription = () => {
        const channels = pusherService.getChannels();
        return channels.has(`user-${userId}`);
      };
      
      while (!subscriptionConfirmed && (Date.now() - subscriptionStartTime) < subscriptionTimeout) {
        subscriptionConfirmed = checkSubscription();
        if (!subscriptionConfirmed) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (!subscriptionConfirmed) {
        throw new Error(`Subscription to ${channelName} timed out after ${subscriptionTimeout}ms`);
      }
      
      console.log('✅ [Loading] Successfully subscribed to user notifications channel');
      
    } catch (error) {
      console.error(`❌ [Loading] Failed to subscribe to user notifications (attempt ${attempt}):`, error);
      
      // Retry with exponential backoff
      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * attempt, 5000); // Max 5 second delay
        console.log(`🔄 [Loading] Retrying user notification subscription in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        await subscribeToUserNotifications(userId, pusherService, attempt + 1);
      } else {
        const errorMsg = `Failed to subscribe to user notifications after ${maxAttempts} attempts`;
        console.error('💥 [Loading] ' + errorMsg);
        throw new Error(errorMsg);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50">
      {/* Global Debug Widget */}
      <DebugWidget 
        debugInfo={{
          raw_telegram_info: debugInfo,
          userSession: UserSession.get()
        }}
        title="Debug Info"
        position="top-right"
      />
      
      {/* Main Loading Spinner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div 
          className="w-8 h-8 border-2 border-slate-700 border-t-pink-400 rounded-full mb-4"
          style={{
            animation: 'spin 1s linear infinite'
          }}
        ></div>
        <p className="text-white text-lg mb-2">Initializing...</p>
        <p className="text-white/60 text-sm text-center max-w-xs">{AppConfig.DEBUG ? loadingStatus : ''}</p>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}