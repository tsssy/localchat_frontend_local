/**
 * Centralized Pusher/Soketi service for real-time messaging
 * Replicates the exact workflow from the HTML test interface
 */

import { PusherConfig, APIConfig } from '../../config/config';
import { UserSession } from '../utils/userSession';
import { APIServices } from '../api/http/v1/APIServices';
// @ts-ignore
import Pusher from 'pusher-js';

// Pusher client interface to avoid importing the full library in service
interface PusherClient {
  connect(): void;
  disconnect(): void;
  subscribe(channelName: string): PusherChannel;
  unsubscribe(channelName: string): void;
  bind(eventName: string, callback: (data: any) => void): void;
  unbind(eventName?: string, callback?: (data: any) => void): void;
  connection: {
    state: string;
    bind(eventName: string, callback: (data?: any) => void): void;
    unbind(eventName?: string, callback?: (data?: any) => void): void;
  };
}

interface PusherChannel {
  bind(eventName: string, callback: (data: any) => void): void;
  unbind(eventName?: string, callback?: (data: any) => void): void;
  trigger?(eventName: string, data: any): void;
  name: string;
}

export interface PusherMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_type: 'user' | 'agent' | 'system';
  chatroom_id: string;
  timestamp: string;
  message_type: string;
  metadata: Record<string, any>;
}

export interface PusherConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: string;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
}

export class PusherService {
  private static instance: PusherService | null = null;
  private pusher: PusherClient | null = null;
  private channels: Map<string, PusherChannel> = new Map();
  private messageHandlers: Map<string, (message: PusherMessage) => void> = new Map();
  private userNotificationHandlers: Map<string, (notification: any) => void> = new Map();
  private pusherConfig: any = null; // Store config for use in handlers
  private connectionState: PusherConnectionState = {
    isConnected: false,
    isConnecting: false,
    connectionState: 'disconnected',
    lastHeartbeat: null,
    reconnectAttempts: 0
  };
  
  // Persistent subscription tracking
  private persistentUserChannel: string | null = null; // Track user channel that must always be subscribed
  private activeChatroomChannels: Set<string> = new Set(); // Track active chatroom channels
  private shouldMaintainConnections = true; // Control reconnection behavior
  
  // Heartbeat and reconnection
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStateCallbacks: ((state: PusherConnectionState) => void)[] = [];
  private isReconnecting = false;

  private constructor() {}

  /**
   * Build WebSocket URL in the exact format specified
   * wss://lovetapoversea.xyz/ws/app/53d7969464ff4606bd10efb8d8f074fa?protocol=7&client=js&version=8.4.0&flash=false
   */
  private buildWebSocketUrl(config: any): string {
    const protocol = config.forceTLS ? 'wss' : 'ws';
    const path = config.forceTLS ? config.wssPath : config.wsPath;
    
    return `${protocol}://${config.wsHost}${path}/app/${config.key}?protocol=7&client=js&version=8.4.0&flash=false`;
  }

  static getInstance(): PusherService {
    if (!PusherService.instance) {
      PusherService.instance = new PusherService();
    }
    return PusherService.instance;
  }

  /**
   * Initialize Pusher connection - replicates HTML workflow exactly
   */
  async initialize(): Promise<void> {
    console.log('🚀 [PusherService] Initializing Pusher connection using HTML workflow...');
    
    try {
      // Step 1: Check authentication (uses existing JWT from Telegram auth)
      const userSession = UserSession.get();
      if (!userSession || !userSession.access_token) {
        throw new Error('User session not found - cannot initialize Pusher');
      }

      console.log('✅ [PusherService] Step 1: JWT token found from Telegram auth');

      // Step 2: Get Pusher configuration from backend (like HTML example)
      console.log('📡 [PusherService] Step 2: Getting Pusher configuration from backend...');
      let pusherConfig;
      
      try {
        const configResponse = await APIServices.getPusherConfig();
        if (configResponse.code === 200 && configResponse.data) {
          this.pusherConfig = configResponse.data;
          console.log('✅ [PusherService] Backend Pusher config received:', {
            hasKey: !!this.pusherConfig.key,
            wsHost: this.pusherConfig.wsHost,
            wsPort: this.pusherConfig.wsPort,
            forceTLS: this.pusherConfig.forceTLS
          });
        } else {
          throw new Error('Invalid config response from backend');
        }
      } catch (configError) {
        console.error('❌ [PusherService] Failed to get Pusher config from backend:', configError);
        throw new Error('Cannot initialize Pusher without backend configuration');
      }

      // Import Pusher (now static import)
      console.log('🔌 [PusherService] Step 3: Using Pusher client...');

      this.connectionState.isConnecting = true;
      this.notifyConnectionStateChange();

      console.log('🔌 [PusherService] Step 3: Initializing Pusher client...');

      // Debug Pusher constructor
      console.log('🔍 [PusherService] Pusher object:', Pusher);
      console.log('🔍 [PusherService] Pusher constructor:', typeof Pusher);
      console.log('🔍 [PusherService] Pusher keys:', Object.keys(Pusher));

      // Step 3: Initialize Pusher with configuration (using exact WebSocket URL format)
      const websocketUrl = this.buildWebSocketUrl(this.pusherConfig);
      
      const pusherInitConfig = {
        wsHost: this.pusherConfig.wsHost,
        wsPort: this.pusherConfig.wsPort,
        wssPort: this.pusherConfig.wssPort,
        wsPath: this.pusherConfig.wsPath,
        wssPath: this.pusherConfig.wssPath,
        forceTLS: this.pusherConfig.forceTLS,
        cluster: this.pusherConfig.cluster,
        auth: {
          headers: {
            'Authorization': `Bearer ${userSession.access_token}`
          }
        },
        authEndpoint: `${APIConfig.getApiUrl()}/pusher/auth`
      };

      console.log('📡 [PusherService] PUSHER CONNECTION CONFIG:', {
        app_key: this.pusherConfig.key,
        websocketUrl: websocketUrl,
        wsHost: pusherInitConfig.wsHost,
        wsPort: pusherInitConfig.wsPort,
        wssPort: pusherInitConfig.wssPort,
        wsPath: pusherInitConfig.wsPath,
        wssPath: pusherInitConfig.wssPath,
        forceTLS: pusherInitConfig.forceTLS,
        cluster: pusherInitConfig.cluster,
        authEndpoint: pusherInitConfig.authEndpoint,
        hasJWTToken: !!userSession.access_token,
        jwtTokenLength: userSession.access_token?.length
      });

      console.log('🔗 [PusherService] Using WebSocket URL:', websocketUrl);

      console.log('🔑 [PusherService] JWT TOKEN BEING USED:', userSession.access_token?.substring(0, 50) + '...');

      this.pusher = new Pusher(this.pusherConfig.key, pusherInitConfig) as PusherClient;

      // Step 4: Setup connection event handlers (like HTML)
      this.setupConnectionHandlers();

      console.log('🔗 [PusherService] Step 4: Connecting to Pusher...');
      
      // Step 5: Connect to Pusher
      this.pusher.connect();
      
      // Step 6: Start heartbeat monitoring
      this.startHeartbeat();

      console.log('✅ [PusherService] Pusher initialization completed using HTML workflow');
      
    } catch (error) {
      console.error('❌ [PusherService] Failed to initialize Pusher:', error);
      this.connectionState.isConnecting = false;
      this.connectionState.connectionState = 'failed';
      this.notifyConnectionStateChange();
      throw error;
    }
  }


  /**
   * Setup connection event handlers - exactly like HTML example
   */
  private setupConnectionHandlers(): void {
    if (!this.pusher) return;

    console.log('🔧 [PusherService] Setting up Pusher connection event handlers...');

    // Connection events (exactly like HTML)
    this.pusher.connection.bind('connecting', () => {
      console.log('🔄 [PusherService] CONNECTION EVENT: connecting');
      console.log('   Status: Attempting to connect to Pusher');
      if (this.pusherConfig) {
        console.log(`   Target: ${this.pusherConfig.forceTLS ? 'wss' : 'ws'}://${this.pusherConfig.wsHost}:${this.pusherConfig.wsPort}`);
      }
      this.connectionState.connectionState = 'connecting';
      this.connectionState.isConnecting = true;
      this.notifyConnectionStateChange();
    });

    this.pusher.connection.bind('connected', () => {
      console.log('✅ [PusherService] CONNECTION EVENT: connected');
      console.log('   Status: Successfully connected to Pusher');
      console.log('   Socket ID:', (this.pusher?.connection as any)?.socket_id || 'unknown');
      console.log('   Connection established at:', new Date().toISOString());
      console.log('   Ready to subscribe to channels');
      
      this.connectionState.isConnected = true;
      this.connectionState.isConnecting = false;
      this.connectionState.connectionState = 'connected';
      this.connectionState.lastHeartbeat = new Date();
      this.connectionState.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.notifyConnectionStateChange();
      
      // RULE 2 & 3: Re-subscribe to persistent channels after reconnection
      this.restorePersistentSubscriptions();
    });

    this.pusher.connection.bind('disconnected', () => {
      console.log('🔌 [PusherService] CONNECTION EVENT: disconnected');
      console.log('   Status: Lost connection to Pusher');
      console.log('   Will attempt IMMEDIATE reconnection');
      console.log('   Disconnected at:', new Date().toISOString());
      
      this.connectionState.isConnected = false;
      this.connectionState.isConnecting = false;
      this.connectionState.connectionState = 'disconnected';
      this.notifyConnectionStateChange();
      
      // RULE 1: Immediate reconnection on disconnect
      if (this.shouldMaintainConnections && !this.isReconnecting) {
        console.log('🔄 [PusherService] Starting IMMEDIATE reconnection process...');
        this.attemptImmediateReconnection();
      }
    });

    this.pusher.connection.bind('error', (error: any) => {
      console.error('❌ [PusherService] CONNECTION EVENT: error');
      console.error('   Error Type:', error?.type || 'unknown');
      console.error('   Error Code:', error?.error?.code || 'unknown');
      console.error('   Error Message:', error?.error?.message || 'unknown');
      console.error('   Full Error Object:', JSON.stringify(error, null, 2));
      console.error('   This usually indicates connection or authentication issues');
      
      this.connectionState.connectionState = 'error';
      this.notifyConnectionStateChange();
    });

    this.pusher.connection.bind('unavailable', () => {
      console.warn('⚠️ [PusherService] CONNECTION EVENT: unavailable');
      console.warn('   Status: Pusher service is unavailable');
      console.warn('   This could be due to server issues or network problems');
      console.warn('   Will attempt to reconnect');
      
      this.connectionState.connectionState = 'unavailable';
      this.notifyConnectionStateChange();
      this.scheduleReconnection();
    });

    console.log('✅ [PusherService] All connection event handlers set up');
  }

  /**
   * Subscribe to a chatroom channel - uses exact format from HTML: presence-chatroom-{id}
   */
  async subscribeToChannel(chatroomId: string): Promise<void> {
    if (!this.pusher || !this.connectionState.isConnected) {
      console.warn('⚠️ [PusherService] Cannot subscribe - not connected');
      console.log('🔍 [PusherService] Connection state:', {
        hasPusher: !!this.pusher,
        isConnected: this.connectionState.isConnected,
        connectionState: this.connectionState.connectionState
      });
      return;
    }

    try {
      // Use exact format from HTML example: presence-chatroom-{id}
      const channelName = `presence-chatroom-${chatroomId}`;
      console.log(`📡 [PusherService] SUBSCRIBING TO CHANNEL:`);
      console.log(`   Channel Name: ${channelName}`);
      console.log(`   Chatroom ID: ${chatroomId}`);
      console.log(`   Auth Endpoint: ${APIConfig.getApiUrl()}/pusher/auth`);
      console.log(`   Connection State: ${this.connectionState.connectionState}`);
      
      const channel = this.pusher.subscribe(channelName);
      this.channels.set(chatroomId, channel);
      
      // RULE 3: Track this as an active chatroom channel
      this.activeChatroomChannels.add(chatroomId);
      
      console.log(`✅ [PusherService] Channel subscription initiated for: ${channelName}`);
      console.log(`📊 [PusherService] Active chatroom channels: ${this.activeChatroomChannels.size}`);

      // Subscription events (like HTML)
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ [PusherService] SUBSCRIPTION SUCCEEDED for channel: ${channelName}`);
        console.log(`🎯 [PusherService] Now listening for events on: ${channelName}`);
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`❌ [PusherService] SUBSCRIPTION ERROR for ${channelName}:`);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        console.error('   This usually means authentication failed for the private channel');
      });

      // Message events (exactly like HTML)
      channel.bind('new_message', (data: PusherMessage) => {
        console.log('📨 [PusherService] RECEIVED NEW_MESSAGE EVENT:');
        console.log('   Channel:', channelName);
        console.log('   Message ID:', data.id);
        console.log('   Message Text:', data.message);
        console.log('   Sender ID:', data.sender_id);
        console.log('   Sender Type:', data.sender_type);
        console.log('   Timestamp:', data.timestamp);
        console.log('   Full Data:', JSON.stringify(data, null, 2));
        
        const handler = this.messageHandlers.get(chatroomId);
        if (handler) {
          console.log('🔧 [PusherService] Calling message handler for chatroom:', chatroomId);
          handler(data);
        } else {
          console.warn('⚠️ [PusherService] No message handler found for chatroom:', chatroomId);
        }
      });

      channel.bind('system_message', (data: PusherMessage) => {
        console.log('🔔 [PusherService] RECEIVED SYSTEM_MESSAGE EVENT:');
        console.log('   Channel:', channelName);
        console.log('   Message:', data.message);
        console.log('   Full Data:', JSON.stringify(data, null, 2));
        
        const handler = this.messageHandlers.get(chatroomId);
        if (handler) {
          handler(data);
        }
      });

      channel.bind('typing_indicator', (data: any) => {
        console.log('⌨️ [PusherService] RECEIVED TYPING_INDICATOR EVENT:');
        console.log('   Channel:', channelName);
        console.log('   Data:', JSON.stringify(data, null, 2));
      });

      channel.bind('status_change', (data: any) => {
        console.log('🔄 [PusherService] RECEIVED STATUS_CHANGE EVENT:');
        console.log('   Channel:', channelName);
        console.log('   New Status:', data.status);
        console.log('   Full Data:', JSON.stringify(data, null, 2));
        
        if (data.status === 'ended') {
          console.log(`🛑 [PusherService] Chatroom ${chatroomId} ended - unsubscribing`);
          this.unsubscribeFromChannel(chatroomId);
        }
      });

    } catch (error) {
      console.error(`❌ [PusherService] FAILED TO SUBSCRIBE to channel ${chatroomId}:`);
      console.error('   Error:', error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Unsubscribe from a chatroom channel
   */
  unsubscribeFromChannel(chatroomId: string): void {
    if (!this.pusher) return;

    try {
      const channelName = `presence-chatroom-${chatroomId}`;
      console.log(`📡 [PusherService] Unsubscribing from channel: ${channelName}`);
      
      this.pusher.unsubscribe(channelName);
      this.channels.delete(chatroomId);
      this.messageHandlers.delete(chatroomId);
      
      // RULE 3: Remove from active chatroom channels
      this.activeChatroomChannels.delete(chatroomId);
      
      console.log(`✅ [PusherService] Unsubscribed from channel: ${channelName}`);
      console.log(`📊 [PusherService] Active chatroom channels: ${this.activeChatroomChannels.size}`);
    } catch (error) {
      console.error(`❌ [PusherService] Failed to unsubscribe from channel ${chatroomId}:`, error);
    }
  }

  /**
   * Set message handler for a specific chatroom
   */
  setMessageHandler(chatroomId: string, handler: (message: PusherMessage) => void): void {
    this.messageHandlers.set(chatroomId, handler);
    console.log(`🔧 [PusherService] Message handler set for chatroom: ${chatroomId}`);
  }

  /**
   * Remove message handler for a specific chatroom
   */
  removeMessageHandler(chatroomId: string): void {
    this.messageHandlers.delete(chatroomId);
    console.log(`🗑️ [PusherService] Message handler removed for chatroom: ${chatroomId}`);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.connectionState.lastHeartbeat = new Date();
        console.log('💓 [PusherService] Heartbeat - connection alive');
      } else {
        console.warn('💔 [PusherService] Heartbeat failed - connection dead');
        this.scheduleReconnection();
      }
    }, PusherConfig.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt immediate reconnection (RULE 1)
   */
  private attemptImmediateReconnection(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.connectionState.connectionState = 'reconnecting';
    this.connectionState.isConnecting = true;
    this.notifyConnectionStateChange();
    
    console.log('🔄 [PusherService] Attempting immediate reconnection...');
    
    // Disconnect existing connection
    if (this.pusher) {
      try {
        this.pusher.disconnect();
      } catch (error) {
        console.warn('⚠️ [PusherService] Error during disconnect before reconnection:', error);
      }
    }
    
    // Immediate reconnection attempt
    setTimeout(async () => {
      try {
        await this.reconnect();
        console.log('✅ [PusherService] Immediate reconnection successful');
      } catch (error) {
        console.error('❌ [PusherService] Immediate reconnection failed:', error);
        this.isReconnecting = false;
        // Fall back to scheduled reconnection with backoff
        this.scheduleReconnection();
      }
    }, 100); // Almost immediate, but allow current call stack to complete
  }

  /**
   * Restore persistent subscriptions after reconnection (RULE 2 & 3)
   */
  private async restorePersistentSubscriptions(): Promise<void> {
    console.log('🔄 [PusherService] Restoring persistent subscriptions...');
    
    try {
      // RULE 2: Always re-subscribe to user channel
      if (this.persistentUserChannel) {
        console.log(`📡 [PusherService] Restoring user channel: ${this.persistentUserChannel}`);
        const userId = this.persistentUserChannel.replace('private-user-', '');
        
        // Restore user notification handler
        const userHandler = this.userNotificationHandlers.get(userId);
        if (userHandler) {
          await this.subscribeToUserChannel(userId);
          console.log(`✅ [PusherService] User channel restored: ${this.persistentUserChannel}`);
        }
      }
      
      // RULE 3: Re-subscribe to active chatroom channels
      if (this.activeChatroomChannels.size > 0) {
        console.log(`📡 [PusherService] Restoring ${this.activeChatroomChannels.size} chatroom channels`);
        
        for (const chatroomId of this.activeChatroomChannels) {
          try {
            // Restore message handler
            const messageHandler = this.messageHandlers.get(chatroomId);
            if (messageHandler) {
              await this.subscribeToChannel(chatroomId);
              console.log(`✅ [PusherService] Chatroom channel restored: ${chatroomId}`);
            }
          } catch (error) {
            console.error(`❌ [PusherService] Failed to restore chatroom ${chatroomId}:`, error);
          }
        }
      }
      
      console.log('✅ [PusherService] All persistent subscriptions restored');
      
    } catch (error) {
      console.error('❌ [PusherService] Error restoring persistent subscriptions:', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff (fallback method)
   */
  private scheduleReconnection(): void {
    if (this.isReconnecting || this.connectionState.reconnectAttempts >= PusherConfig.MAX_RECONNECT_ATTEMPTS) {
      if (this.connectionState.reconnectAttempts >= PusherConfig.MAX_RECONNECT_ATTEMPTS) {
        console.error('💥 [PusherService] Max reconnection attempts reached');
        this.connectionState.connectionState = 'failed';
        this.notifyConnectionStateChange();
      }
      return;
    }

    this.isReconnecting = true;
    this.connectionState.reconnectAttempts++;
    this.connectionState.connectionState = 'reconnecting';
    this.notifyConnectionStateChange();
    
    const delay = Math.min(
      PusherConfig.RECONNECT_DELAY_BASE * Math.pow(2, this.connectionState.reconnectAttempts - 1),
      PusherConfig.RECONNECT_DELAY_MAX
    );

    console.log(`🔄 [PusherService] Scheduling reconnection attempt ${this.connectionState.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        console.log(`🔄 [PusherService] Reconnection attempt ${this.connectionState.reconnectAttempts}`);
        await this.reconnect();
      } catch (error) {
        console.error('❌ [PusherService] Reconnection failed:', error);
        this.isReconnecting = false;
        this.scheduleReconnection();
      }
    }, delay);
  }

  /**
   * Reconnect to Pusher
   */
  private async reconnect(): Promise<void> {
    console.log('🔄 [PusherService] Attempting to reconnect...');
    
    try {
      if (this.pusher) {
        this.pusher.disconnect();
      }
      
      // Re-initialize connection using the same workflow
      await this.initialize();
      
      console.log('✅ [PusherService] Reconnection successful');
    } catch (error) {
      console.error('❌ [PusherService] Reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): PusherConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Add connection state change callback
   */
  onConnectionStateChange(callback: (state: PusherConnectionState) => void): void {
    this.connectionStateCallbacks.push(callback);
  }

  /**
   * Remove connection state change callback
   */
  removeConnectionStateCallback(callback: (state: PusherConnectionState) => void): void {
    const index = this.connectionStateCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionStateCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks about connection state change
   */
  private notifyConnectionStateChange(): void {
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(this.getConnectionState());
      } catch (error) {
        console.error('❌ [PusherService] Error in connection state callback:', error);
      }
    });
  }

  /**
   * Disconnect from Pusher and cleanup
   */
  disconnect(): void {
    console.log('🔌 [PusherService] Disconnecting from Pusher...');
    
    // Stop maintaining connections (prevents reconnection)
    this.shouldMaintainConnections = false;
    this.isReconnecting = false;
    
    // Clear timers
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Disconnect from Pusher
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    // Clear channels and handlers
    this.channels.clear();
    this.messageHandlers.clear();
    this.userNotificationHandlers.clear();

    // Clear persistent tracking
    this.persistentUserChannel = null;
    this.activeChatroomChannels.clear();

    // Reset connection state
    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      connectionState: 'disconnected',
      lastHeartbeat: null,
      reconnectAttempts: 0
    };

    this.notifyConnectionStateChange();
    console.log('✅ [PusherService] Disconnected from Pusher');
  }

  /**
   * Enable connection maintenance (allows reconnection)
   */
  enableMaintenance(): void {
    this.shouldMaintainConnections = true;
    console.log('✅ [PusherService] Connection maintenance enabled');
  }

  /**
   * Disable connection maintenance (prevents reconnection)
   */
  disableMaintenance(): void {
    this.shouldMaintainConnections = false;
    console.log('⏹️ [PusherService] Connection maintenance disabled');
  }

  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Get subscribed channels count
   */
  getChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get channels Map for subscription checking
   */
  getChannels(): Map<string, PusherChannel> {
    return this.channels;
  }

  /**
   * Subscribe to private user channel for notifications - follows same pattern as chatroom channels
   */
  async subscribeToUserChannel(userId: string): Promise<void> {
    if (!this.pusher || !this.connectionState.isConnected) {
      console.warn('⚠️ [PusherService] Cannot subscribe to user channel - not connected');
      console.log('🔍 [PusherService] Connection state:', {
        hasPusher: !!this.pusher,
        isConnected: this.connectionState.isConnected,
        connectionState: this.connectionState.connectionState
      });
      return;
    }

    try {
      // Use format: private-user-{userId} (following the pattern requested)
      const channelName = `private-user-${userId}`;
      console.log(`📡 [PusherService] SUBSCRIBING TO USER CHANNEL:`);
      console.log(`   Channel Name: ${channelName}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Auth Endpoint: ${APIConfig.getApiUrl()}/pusher/auth`);
      console.log(`   Connection State: ${this.connectionState.connectionState}`);
      
      const channel = this.pusher.subscribe(channelName);
      this.channels.set(`user-${userId}`, channel);
      
      // RULE 2: Track this as the persistent user channel
      this.persistentUserChannel = channelName;
      
      console.log(`✅ [PusherService] User channel subscription initiated for: ${channelName}`);
      console.log(`📊 [PusherService] Persistent user channel set: ${this.persistentUserChannel}`);

      // Subscription events (same as chatroom pattern)
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`✅ [PusherService] USER SUBSCRIPTION SUCCEEDED for channel: ${channelName}`);
        console.log(`🎯 [PusherService] Now listening for user notifications on: ${channelName}`);
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`❌ [PusherService] USER SUBSCRIPTION ERROR for ${channelName}:`);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        console.error('   This usually means authentication failed for the private user channel');
      });

      // Notification events - handle different notification types
      channel.bind('notification', (data: any) => {
        console.log('🔔 [PusherService] RECEIVED USER NOTIFICATION EVENT:');
        console.log('   Channel:', channelName);
        console.log('   Notification Type:', data.type);
        console.log('   Notification Data:', JSON.stringify(data, null, 2));
        
        const handler = this.userNotificationHandlers.get(userId);
        if (handler) {
          console.log('🔧 [PusherService] Calling user notification handler for user:', userId);
          handler(data);
        } else {
          console.warn('⚠️ [PusherService] No user notification handler found for user:', userId);
        }
      });

      // Handle specific notification types as separate events
      channel.bind('new_match', (data: any) => {
        console.log('💕 [PusherService] RECEIVED NEW_MATCH NOTIFICATION:');
        console.log('   Channel:', channelName);
        console.log('   Match Data:', JSON.stringify(data, null, 2));
        
        const handler = this.userNotificationHandlers.get(userId);
        if (handler) {
          handler({ type: 'new_match', ...data });
        }
      });

      channel.bind('new_message_notification', (data: any) => {
        console.log('💬 [PusherService] RECEIVED NEW_MESSAGE NOTIFICATION:');
        console.log('   Channel:', channelName);
        console.log('   Message Notification Data:', JSON.stringify(data, null, 2));
        
        const handler = this.userNotificationHandlers.get(userId);
        if (handler) {
          handler({ type: 'new_message', ...data });
        }
      });

      // Handle new message in chatroom events (message.new_in_chatroom)
      channel.bind('message.new_in_chatroom', (data: any) => {
        console.log('💬 [PusherService] RECEIVED MESSAGE.NEW_IN_CHATROOM EVENT:');
        console.log('   Channel:', channelName);
        console.log('   Raw Event Data:', JSON.stringify(data, null, 2));
        
        try {
          // Parse the data if it's a string
          let parsedData = data;
          if (typeof data === 'string') {
            parsedData = JSON.parse(data);
          }
          
          console.log('   Parsed Data:', JSON.stringify(parsedData, null, 2));
          
          const handler = this.userNotificationHandlers.get(userId);
          if (handler) {
            handler({ 
              type: 'message.new_in_chatroom',
              ...parsedData 
            });
          }
        } catch (error) {
          console.error('❌ [PusherService] Failed to parse message.new_in_chatroom data:', error);
        }
      });

      channel.bind('payment_completed', (data: any) => {
        console.log('💰 [PusherService] RECEIVED PAYMENT_COMPLETED NOTIFICATION:');
        console.log('   Channel:', channelName);
        console.log('   Payment Data:', JSON.stringify(data, null, 2));
        
        const handler = this.userNotificationHandlers.get(userId);
        if (handler) {
          handler({ type: 'payment_completed', ...data });
        }
      });

      channel.bind('system_announcement', (data: any) => {
        console.log('📢 [PusherService] RECEIVED SYSTEM_ANNOUNCEMENT:');
        console.log('   Channel:', channelName);
        console.log('   Announcement Data:', JSON.stringify(data, null, 2));
        
        const handler = this.userNotificationHandlers.get(userId);
        if (handler) {
          handler({ type: 'system_announcement', ...data });
        }
      });

    } catch (error) {
      console.error(`❌ [PusherService] FAILED TO SUBSCRIBE to user channel ${userId}:`);
      console.error('   Error:', error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Unsubscribe from user channel
   */
  unsubscribeFromUserChannel(userId: string): void {
    if (!this.pusher) return;

    try {
      const channelName = `private-user-${userId}`;
      console.log(`📡 [PusherService] Unsubscribing from user channel: ${channelName}`);
      
      this.pusher.unsubscribe(channelName);
      this.channels.delete(`user-${userId}`);
      this.userNotificationHandlers.delete(userId);
      
      console.log(`✅ [PusherService] Unsubscribed from user channel: ${channelName}`);
    } catch (error) {
      console.error(`❌ [PusherService] Failed to unsubscribe from user channel ${userId}:`, error);
    }
  }

  /**
   * Set user notification handler for a specific user
   */
  setUserNotificationHandler(userId: string, handler: (notification: any) => void): void {
    this.userNotificationHandlers.set(userId, handler);
    console.log(`🔧 [PusherService] User notification handler set for user: ${userId}`);
  }

  /**
   * Remove user notification handler for a specific user
   */
  removeUserNotificationHandler(userId: string): void {
    this.userNotificationHandlers.delete(userId);
    console.log(`🗑️ [PusherService] User notification handler removed for user: ${userId}`);
  }
}