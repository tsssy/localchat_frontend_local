import { APIConfig, TelegramConfig } from '../../../../config/config';
import { httpRequester } from '../http_requester';
import { UserSession } from '../../../utils/userSession';
import type { 
  APIRequest, 
  APIResponse, 
  TelegramAuthRequest, 
  TelegramAuthResponse,
  ChatroomsResponse,
  ChatroomParticipantsResponse,
  UserCreditsResponse,
  MatchingRequest,
  MatchingResponse,
  ProductsResponse,
  CreateChatroomRequest,
  CreateChatroomResponse,
  ConversationHistoryResponse,
  SettingsResponse,
  UserSettingsResponse,
  CreatePaymentInvoiceRequest,
  CreatePaymentInvoiceResponse
} from './APISchemes';

/**
 * Centralized API service methods for all HTTP requests.
 * Each method follows the pattern: endpoint_url, request_method, try/catch with return ResponseBody
 * 
 * Usage Examples:
 * - GET: APIServices.getExample()
 * - POST: APIServices.postExample(requestBody)
 * - PUT: APIServices.putExample(requestBody) 
 * - DELETE: APIServices.deleteExample(id)
 * - PATCH: APIServices.patchExample(requestBody)
 */

export class APIServices {
  
  // Telegram Authentication API - POST /api/v1/auth/telegram
  static async authenticateTelegram(requestBody: TelegramAuthRequest): Promise<TelegramAuthResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/auth/telegram`;
    const request_method = "POST";
    
    console.log('🚀 [Telegram Auth API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      hasInitData: !!requestBody.telegram_init_data,
      initDataLength: requestBody.telegram_init_data?.length
    });
    
    try {
      // Backend only expects telegram_init_data field (as per TelegramAuthRequest schema)
      const payload: any = {
        telegram_init_data: requestBody.telegram_init_data
      };

      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Telegram Auth API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Telegram Auth API] Error:', error);
      throw error;
    }
  }
  
  // GET /api/v1/chatrooms/
  static async getChatrooms(limit: number = 20): Promise<ChatroomsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/`;
    const request_method = "GET";
    
    console.log('🚀 [Chatrooms API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      limit
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?limit=${limit}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Chatrooms API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Chatrooms API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/matching/chat - Create or Get Chatroom (for consistency with other APIs)
  static async createChatroom(requestBody: { user_id: string; sub_account_id: string }): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/matching/chat`;
    const request_method = "POST";
    
    console.log('🚀 [Create Chatroom API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      user_id: requestBody.user_id,
      sub_account_id: requestBody.sub_account_id
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Create Chatroom API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Create Chatroom API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/chatrooms/{chatroom_id}/participants
  static async getChatroomParticipants(chatroomId: string): Promise<ChatroomParticipantsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}/participants`;
    const request_method = "GET";
    
    console.log('🚀 [Chatroom Participants API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Chatroom Participants API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Chatroom Participants API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/credits/users/{user_id}
  static async getUserCredits(userId: string): Promise<UserCreditsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/credits/users/${userId}`;
    const request_method = "GET";
    
    console.log('🚀 [User Credits API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      userId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [User Credits API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [User Credits API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/matching/matches - Check for unused candidates
  static async getCurrentMatches(): Promise<MatchingResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/matching/matches`;
    const request_method = "GET";
    
    console.log('🚀 [Current Matches API] Request:', {
      endpoint: endpoint_url,
      method: request_method
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Current Matches API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Current Matches API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/matching/matches - Create new matches
  static async getMatches(usePaidMatch: boolean = false): Promise<MatchingResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/matching/matches`;
    const request_method = "POST";
    
    console.log('🚀 [Matching API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      use_paid_match: usePaidMatch
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?use_paid_match=${usePaidMatch}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Matching API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Matching API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/products/
  static async getProducts(limit: number = 50, offset: number = 0): Promise<ProductsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/products/active/list`;
    const request_method = "GET";
    
    console.log('🚀 [Products API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      limit,
      offset
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?limit=${limit}&offset=${offset}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Products API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Products API] Error:', error);
      throw error;
    }
  }
  
  // GET Example - Fetch data without request body
  static async getExample(): Promise<APIResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/example`;
    const request_method = "GET";
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      return responseBody;
    } catch (error) {
      console.error('GET Example API error:', error);
      throw error;
    }
  }

  // POST Example - Create new resource
  static async postExample(requestBody: APIRequest): Promise<APIResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/example`;
    const request_method = "POST";
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      return responseBody;
    } catch (error) {
      console.error('POST Example API error:', error);
      throw error;
    }
  }

  // PUT Example - Update entire resource
  static async putExample(requestBody: APIRequest): Promise<APIResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/example/${requestBody.id}`;
    const request_method = "PUT";
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      return responseBody;
    } catch (error) {
      console.error('PUT Example API error:', error);
      throw error;
    }
  }

  // DELETE Example - Remove resource
  static async deleteExample(id: string): Promise<APIResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/example/${id}`;
    const request_method = "DELETE";
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      return responseBody;
    } catch (error) {
      console.error('DELETE Example API error:', error);
      throw error;
    }
  }

  // PATCH Example - Partial update
  static async patchExample(requestBody: Partial<APIRequest>): Promise<APIResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/example/${requestBody.id}`;
    const request_method = "PATCH";
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      return responseBody;
    } catch (error) {
      console.error('PATCH Example API error:', error);
      throw error;
    }
  }

  // GET /api/v1/chatrooms/{chatroom_id} - Get comprehensive chatroom information
  static async getChatroomInfo(chatroomId: string): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}`;
    const request_method = "GET";
    
    console.log('🚀 [Chatroom Info API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Chatroom Info API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Chatroom Info API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/loadChatroom - Load comprehensive chatroom information (legacy match-based API)
  static async loadChatroom(requestBody: { 
    user_id: string; 
    match_id: number; 
    last_message_id?: number; 
    page_size: number;
    target_user_id?: string;
    target_user_name?: string; 
    target_user_age?: number;
    target_user_location?: string;
    target_user_tags?: string[];
    target_user_photo_urls?: string[];
  }): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/loadChatroom`;
    const request_method = "POST";
    
    console.log('🚀 [Load Chatroom API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      userId: requestBody.user_id,
      matchId: requestBody.match_id,
      lastMessageId: requestBody.last_message_id,
      pageSize: requestBody.page_size,
      isInitialLoad: !requestBody.last_message_id
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Load Chatroom API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Load Chatroom API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/chatrooms/{chatroom_id}/messages - Get chatroom messages
  static async getChatroomMessages(chatroomId: string, params?: { page?: number, page_size?: number }): Promise<{ code: number; msg: string; data: any }> {
    const page = params?.page || 1;
    const page_size = params?.page_size || 20;
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}/messages`;
    const request_method = "GET";
    
    console.log('🚀 [Chatroom Messages API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId,
      page,
      page_size
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?page=${page}&page_size=${page_size}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Chatroom Messages API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Chatroom Messages API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/chatrooms/{chatroom_id}/join - Join chatroom
  static async joinChatroom(chatroomId: string): Promise<{ code: number; msg: string; data?: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}/join`;
    const request_method = "POST";
    
    console.log('🚀 [Join Chatroom API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Join Chatroom API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Join Chatroom API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/chatrooms/{chatroom_id}/leave - Leave chatroom
  static async leaveChatroom(chatroomId: string): Promise<{ code: number; msg: string; data?: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}/leave`;
    const request_method = "POST";
    
    console.log('🚀 [Leave Chatroom API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Leave Chatroom API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Leave Chatroom API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/chatrooms/{chatroom_id}/messages - Send message
  static async sendMessage(chatroomId: string, requestBody: { message: string; message_type?: string; metadata?: any }): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/chatrooms/${chatroomId}/messages`;
    const request_method = "POST";
    
    console.log('🚀 [Send Message API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      chatroomId,
      messageLength: requestBody.message?.length,
      messageType: requestBody.message_type || 'text'
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: {
          message: requestBody.message,
          message_type: requestBody.message_type || 'text',
          metadata: requestBody.metadata || {}
        },
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Send Message API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Send Message API] Error:', error);
      
      // For 400 errors, try to get the response body to check for insufficient funds
      if (error instanceof Error && error.message.includes('HTTP 400:')) {
        try {
          // Make a raw request to get the response body for 400 errors
          const response = await httpRequester.makeRequest({
            url: endpoint_url,
            method: request_method,
            data: {
              message: requestBody.message,
              message_type: requestBody.message_type || 'text',
              metadata: requestBody.metadata || {}
            },
            headers: {
              'Authorization': `Bearer ${UserSession.getAccessToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Return the response body for 400 errors so ChatScreen can handle insufficient funds
          if (response.status === 400) {
            console.log('💰 [Send Message API] Returning 400 response for insufficient funds handling:', response.data);
            return response.data;
          }
        } catch (rawError) {
          console.error('❌ [Send Message API] Failed to get 400 response body:', rawError);
        }
      }
      
      throw error;
    }
  }

  // GET /api/v1/pusher/config - Get Pusher configuration
  static async getPusherConfig(): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/pusher/config`;
    const request_method = "GET";
    
    console.log('🚀 [Pusher Config API] Request:', {
      endpoint: endpoint_url,
      method: request_method
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Pusher Config API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Pusher Config API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/pusher/auth - Pusher authentication endpoint
  static async authenticatePusher(requestBody: { socket_id: string; channel_name: string }): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/pusher/auth`;
    const request_method = "POST";
    
    console.log('🚀 [Pusher Auth API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      socketId: requestBody.socket_id,
      channel: requestBody.channel_name
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Pusher Auth API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Pusher Auth API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/payments/user/{user_id} - Get user's payment history
  static async getUserPaymentHistory(userId: string, limit: number = 50): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/payments/user/${userId}`;
    const request_method = "GET";
    
    console.log('🚀 [User Payment History API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      userId,
      limit
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?limit=${limit}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [User Payment History API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [User Payment History API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/agents/sub-accounts/{sub_account_id} - Get sub-account profile
  static async getSubAccountProfile(subAccountId: string): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/agents/sub-accounts/${subAccountId}`;
    const request_method = "GET";
    
    console.log('🚀 [Sub-Account Profile API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      subAccountId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Sub-Account Profile API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Sub-Account Profile API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/auth/update-last-visited - Update last visited location
  static async updateLastVisited(requestBody: { url?: string; page?: string }): Promise<{ code: number; msg: string; data: any }> {
    const endpoint_url = `${APIConfig.getApiUrl()}/auth/update-last-visited`;
    const request_method = "POST";
    
    console.log('🚀 [Update Last Visited API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      url: requestBody.url,
      page: requestBody.page
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        data: requestBody,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Update Last Visited API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Update Last Visited API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/settings/active - Get active application settings
  static async getActiveSettings(): Promise<SettingsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/settings/active`;
    const request_method = "GET";
    
    console.log('🚀 [Active Settings API] Request:', {
      endpoint: endpoint_url,
      method: request_method
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [Active Settings API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Active Settings API] Error:', error);
      throw error;
    }
  }

  // GET /api/v1/settings/user - Get user-specific settings
  static async getUserSettings(): Promise<UserSettingsResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/settings/user`;
    const request_method = "GET";
    
    console.log('🚀 [User Settings API] Request:', {
      endpoint: endpoint_url,
      method: request_method
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: endpoint_url,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`
        }
      });
      
      console.log('✅ [User Settings API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [User Settings API] Error:', error);
      throw error;
    }
  }

  // POST /api/v1/payments/invoice/create - Create payment invoice
  static async createPaymentInvoice(telegramUserId: string, productId: string): Promise<CreatePaymentInvoiceResponse> {
    const endpoint_url = `${APIConfig.getApiUrl()}/payments/invoice/create`;
    const request_method = "POST";
    
    console.log('🚀 [Payment Invoice API] Request:', {
      endpoint: endpoint_url,
      method: request_method,
      telegramUserId,
      productId
    });
    
    try {
      const responseBody = await httpRequester.request({
        url: `${endpoint_url}?telegram_user_id=${telegramUserId}&product_id=${productId}`,
        method: request_method,
        headers: {
          'Authorization': `Bearer ${UserSession.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ [Payment Invoice API] Response:', responseBody.code, responseBody.msg, responseBody.data);
      
      return responseBody;
    } catch (error) {
      console.error('❌ [Payment Invoice API] Error:', error);
      throw error;
    }
  }
}