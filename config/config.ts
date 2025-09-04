/**
 * Configuration for API services and application settings.
 * Alll backend endpoints and other configurations are centralized here.
 */

export class APIConfig {
  // Environment settings
  static readonly DEBUG = true; // Set to false in production
  
  // Backend server configuration - Make this configurable
  // Use relative path and dev proxy to avoid CORS in development
  static readonly BACKEND_BASE_URL = "http://localhost:8000";
  
  // API versioning
  static readonly API_VERSION = "v1";
  
  // Timeout settings (in milliseconds)
  static readonly REQUEST_TIMEOUT = 30000;
  static readonly CONNECTION_TIMEOUT = 10000;
  
  // Retry settings
  static readonly MAX_RETRIES = 3;
  static readonly RETRY_DELAY = 1000; // milliseconds
  
  static getApiUrl(): string {
    return `${this.BACKEND_BASE_URL}/api/${this.API_VERSION}`;
  }
}

export class TelegramConfig {
  // Use example JSON data instead of actual Telegram data collection
  static readonly USE_EXAMPLE_JSON = true; // Set to true to use example_full_telegram_data.json
  
  // Telegram Web App API settings
  static readonly TELEGRAM_BOT_TOKEN = "8378758545:AAEopP2oA8rPr2II4NWyiqkvQcVZTdT-GCw"; // Optional: set your bot token for local auth
  static readonly TELEGRAM_APP_NAME = "lovechat_app";
}

export class AppConfig {
  // Environment settings
  static readonly DEBUG = true; // Set to false in production
  static readonly ENVIRONMENT = "development"; // development, staging, production
  
  // Debug info display on UI
  static readonly SHOW_DEBUG_INFO = false; // Set to false to hide debug information
  
  // Security settings
  static readonly ENABLE_CORS = true;
  static readonly ALLOWED_ORIGINS = ["*"]; // Configure appropriately for production
  
  // App routing
  static readonly DEFAULT_PAGE = "new-girls"; // Default page if no last_page from API
  
  // Shop UI configuration
  static readonly SHOP_PRODUCTS_PER_ROW = 2; // Number of product cards per row (1, 2, 3, etc.)
}

export class PusherConfig {
  // Connection management
  static readonly CONNECTION_TIMEOUT = 10000; // milliseconds
  static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  static readonly MAX_RECONNECT_ATTEMPTS = 10;
  static readonly RECONNECT_DELAY_BASE = 1000; // Base delay for exponential backoff
  static readonly RECONNECT_DELAY_MAX = 30000; // Maximum delay between reconnection attempts
}