/**
 * API Request and Response type definitions
 * Define all request and response bodies used in APIServices
 */

// =============================================================================
// BASE INTERFACES - Use these as foundation for all API schemas
// =============================================================================

/**
 * Base interface for all API requests
 * Extend this for specific request types
 */
export interface APIRequest {
  id?: string;
  [key: string]: any;
}

/**
 * Base interface for all API responses
 * All API responses should extend this interface
 */
export interface APIResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * Standard error response format
 * Use this for consistent error handling across all APIs
 */
export interface ErrorResponse {
  code: number;
  msg: string;
  data: {
    error_details?: Record<string, any>;
    timestamp?: string;
  };
}

/**
 * Base pagination response structure
 * Use this for APIs that return paginated data
 */
export interface PaginatedResponse<T> extends APIResponse {
  data: {
    items: T[];
    has_more: boolean;
    next_cursor?: string;
    total_count?: number;
  };
}

// =============================================================================
// PROJECT-SPECIFIC SCHEMAS - Telegram Authentication
// =============================================================================

/**
 * Telegram Authentication Request - POST /api/v1/auth/telegram
 */
export interface TelegramAuthRequest extends APIRequest {
  telegram_init_data: string; // The initData string from Telegram Web App
  start_param?: string; // Optional start parameter from Telegram Mini App launch
}

/**
 * User data structure returned from authentication
 */
export interface UserData {
  id: string;
  email: string | null;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
  telegram_id: string;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  deleted_at: string | null;
}

/**
 * Telegram user data structure returned from authentication
 */
export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  language_code: string;
  allows_write_to_pm: boolean;
  photo_url: string;
}

/**
 * Telegram Authentication Response - POST /api/v1/auth/telegram
 */
export interface TelegramAuthResponse extends APIResponse<{
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserData;
  telegram_user_data: TelegramUserData;
}> {
}

// =============================================================================
// CHATROOMS API - GET /api/v1/chatrooms/
// =============================================================================

export interface ChatroomData {
  id: string;
  user_id: string;
  sub_account_id: string;
  agent_id: string;
  chatroom_type: "initial_match" | "paid_match";
  status: "active" | "ended" | "abandoned";
  channel_name: string;
  metadata: Record<string, any>;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatroomsResponse extends APIResponse {
  success: true;
  data: ChatroomData[];
  message: string;
}

// =============================================================================
// CHATROOM PARTICIPANTS API - GET /api/v1/chatrooms/{chatroom_id}/participants
// =============================================================================

export interface ChatroomParticipantsData {
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
  };
  agent: {
    id: string;
    name: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
  sub_account: {
    id: string;
    name: string;
    display_name: string;
    agent_id: string;
  };
}

export interface ChatroomParticipantsResponse extends APIResponse {
  success: true;
  data: ChatroomParticipantsData;
  message: string;
}

// =============================================================================
// CREDITS API - GET /api/v1/credits/users/{user_id}
// =============================================================================

export interface UserCreditsData {
  id: string;
  user_id: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  free_matches_used: number;
  max_free_matches: number;
  free_matches_remaining: number;
  has_free_matches: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreditsResponse extends APIResponse {
  success: true;
  data: UserCreditsData;
  message: string;
}

// =============================================================================
// MATCHING API - POST /api/v1/matching/matches
// =============================================================================

export interface MatchingRequest extends APIRequest {
  user_id: string;
  match_type: "initial" | "new";
}

export interface MatchCandidate {
  id: string;
  sub_account_id: string;
  agent_id: string;
  name: string;
  display_name: string;
  bio: string | null;
  age: number;
  location: string;
  gender: string;
  photo_urls: string[];
  avatar_url?: string | null; // Keep for backward compatibility
  tags: string[];
  max_concurrent_chats: number;
  is_active: boolean;
}

export interface MatchingData {
  candidates: MatchCandidate[];
  credits_consumed: number;
  remaining_credits: number;
  match_type: "free_match" | "paid_match";
  has_remaining_matches: boolean;
  free_matches_remaining: number;
  metadata?: {
    last_match: {
      id: string;
      match_type: string;
      created_at: string;
      total_candidates: number;
      unused_count: number;
      used_count: number;
      credits_consumed: number;
    };
  };
}

export interface MatchingResponse extends APIResponse {
  code: number;
  msg: string;
  data: MatchingData;
}

// =============================================================================
// PRODUCTS API - GET /api/v1/products/
// =============================================================================

export interface ProductData {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: "XTR" | "USD" | "CNY";
  credits: number;
  category: "credits" | "subscription" | "feature";
  photo_url: string | null;
  feature_text: string | null;
  show_feature: boolean;
  stock_limit: number;
  meta: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductsData {
  products?: ProductData[]; // Optional for compatibility
  active_products: ProductData[]; // Main field used by your API
  count: number;
  limit: number;
  offset: number;
}

export interface ProductsResponse extends APIResponse {
  success: true;
  data: ProductsData;
  message: string;
}

// =============================================================================
// CHAT CREATION API - POST /api/v1/matching/chat
// =============================================================================

export interface CreateChatroomRequest extends APIRequest {
  user_id: string; // MongoDB ObjectId string
  sub_account_id: string; // MongoDB ObjectId string
  chatroom_type: "initial_match" | "paid_match";
}

export interface CreateChatroomResponse extends APIResponse {
  code: number;
  msg: string;
  data: {
    id: string; // The actual chatroom ID returned by the API
    user_id: string; // MongoDB ObjectId string
    sub_account_id: string; // MongoDB ObjectId string
    agent_id: string; // MongoDB ObjectId string
    chatroom_type: "initial_match" | "paid_match";
    status: "active";
    channel_name: string; // Long channel name for Pusher/WebSocket
    metadata: Record<string, any>;
    started_at: string;
    ended_at: string | null;
    last_activity_at: string | null;
    created_at: string;
    updated_at: string;
  };
}

// =============================================================================
// CONVERSATION HISTORY API - GET /api/v1/messages/conversations/{other_user_id}
// =============================================================================

export interface ConversationMessage {
  id: number;
  content: string;
  sender_id: string; // MongoDB ObjectId string
  recipient_id: string; // MongoDB ObjectId string
  message_type: "text" | "image" | "gift";
  sent_at: string;
  read_at: string | null;
  metadata: Record<string, any>;
}

export interface ConversationHistoryResponse extends APIResponse {
  code: number;
  msg: string;
  data: {
    messages: ConversationMessage[];
    has_more: boolean;
    current_page: number;
    total_pages: number;
    total_messages: number;
  };
}

// =============================================================================
// SETTINGS API - GET /api/v1/settings/active
// =============================================================================

export interface SettingsData {
  id: string;
  name: string;
  description: string;
  coin_config: {
    initial_free_coins: number;
  };
  message_config: {
    cost_per_message: number;
    initial_free_messages: number;
  };
  match_config: {
    cost_per_match: number;
    initial_free_matches: number;
    daily_free_matches: number;
  };
  is_active: boolean;
  is_default: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SettingsResponse extends APIResponse {
  success: true;
  message: string;
  data: SettingsData;
}

// =============================================================================
// USER SETTINGS API - GET /api/v1/settings/user
// =============================================================================

export interface UserSettingsData {
  id: string;
  user_id: string;
  cost_per_message: number;
  cost_per_match: number;
  max_free_matches_per_day: number;
  max_free_messages_per_day: number;
  subscription_type: string | null;
  subscription_expires_at: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsResponse extends APIResponse {
  code: number;
  msg: string;
  data: UserSettingsData;
}

// =============================================================================
// PAYMENT INVOICE API - POST /api/v1/payments/invoice/create
// =============================================================================

export interface CreatePaymentInvoiceRequest extends APIRequest {
  telegram_user_id: string;
  product_id: string;
}

export interface PaymentInvoiceData {
  payment_id: string;
  invoice_payload: string;
  status: "pending";
  expires_at: string;
  amount: number;
  currency: "XTR" | "USD" | "CNY";
  invoice_url?: string;
}

export interface CreatePaymentInvoiceResponse extends APIResponse {
  success: true;
  message: string;
  data: PaymentInvoiceData;
}

/**
 * EXAMPLE: Authentication Request
 * Copy and modify this pattern for your authentication endpoints
 */
export interface ExampleLoginRequest extends APIRequest {
  email: string;
  password: string;
}

/**
 * EXAMPLE: Authentication Response
 * Copy and modify this pattern for your authentication responses
 */
export interface ExampleLoginResponse extends APIResponse<{
  token: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    avatar?: string;
  };
  expiresIn: number;
}> {
}

/**
 * EXAMPLE: Data Model
 * Define your core data models here
 */
export interface ExampleUserProfile {
  id: string;
  email: string;
  nickname: string;
  age?: number;
  location?: string;
  avatar?: string;
  bio?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FRONTEND COMPATIBILITY INTERFACES - Based on existing frontend usage
// =============================================================================

/**
 * Message Card Data for Messages page
 * FRONTEND USAGE ANALYSIS: Used in Messages component and App.tsx
 */
export interface MessageCardData {
  chatroom_id: string;                 // ✅ Available: chatroom.id
  target_user_id: string;              // ✅ Available: agent.id (now correctly as string)
  target_user_name: string;            // ✅ Available: agent.display_name  
  target_user_photo_url: string;       // ✅ Available: agent.avatar_url
  last_message: string;                // ❌ Default: "NEED TO IMPLEMENT"
  last_message_timestamp: string;      // ❌ Default: "NEED TO IMPLEMENT"
  unread_count: number;                // ❌ Default: 0
  is_online: boolean;                  // ❌ Default: false
}

/**
 * Match Information Response for NewGirls page  
 * FRONTEND USAGE ANALYSIS: Used in NewGirls component and App.tsx
 */
export interface GetMatchInformationResponse {
  code: number;
  msg: string;
  data: {
    number_of_match_requests: number;    // ✅ Available: credits.free_matches_used
    target_user: {
      id: number;                        // ✅ Available: candidate.agent_id
      name: string;                      // ✅ Available: candidate.display_name
      age: number;                       // ❌ Default: 25
      location: string;                  // ❌ Default: "NEED TO IMPLEMENT"
      photos: string[];                  // ❌ Default: [avatar_url || "NEED TO IMPLEMENT"]
      tags: string[];                    // ❌ Default: ["NEED TO IMPLEMENT"]
      bio: string;                       // ✅ Available: candidate.bio
    };
  };
}

/**
 * Load Chatroom Response for Chat functionality
 * FRONTEND USAGE ANALYSIS: Used in App.tsx
 */
export interface LoadChatroomResponse {
  code: number;
  msg: string;
  data: {
    chatroom_id: string;
    messages: Array<{
      id: string;
      content: string;
      sender_type: "user" | "agent";
      timestamp: string;
      message_type: "text" | "image" | "gift";
    }>;
    participants: {
      user: {
        id: string;
        name: string;
      };
      agent: {
        id: string;
        name: string;
        avatar_url: string;
      };
    };
  };
}