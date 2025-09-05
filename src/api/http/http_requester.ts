import { APIConfig } from '../../../config/config';

/**
 * HTTP Request configuration interface
 */
interface HTTPRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * HTTP Response interface
 */
interface HTTPResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

/**
 * Logger utility for request/response logging
 */
class APILogger {
  private static formatLog(type: 'REQUEST' | 'RESPONSE', data: any): void {
    const timestamp = new Date().toISOString();
    console.group(`🌐 ${type} [${timestamp}]`);
    console.log(JSON.stringify(data, null, 2));
    console.groupEnd();
  }

  static logRequest(config: HTTPRequestConfig): void {
    this.formatLog('REQUEST', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      params: config.params,
      body: config.data
    });
  }

  static logResponse(config: HTTPRequestConfig, response: HTTPResponse): void {
    this.formatLog('RESPONSE', {
      url: config.url,
      method: config.method,
      status: response.status,
      statusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody: response.data
    });
  }

  static logError(config: HTTPRequestConfig, error: Error): void {
    const timestamp = new Date().toISOString();
    console.group(`❌ ERROR [${timestamp}]`);
    console.log(JSON.stringify({
      url: config.url,
      method: config.method,
      error: error.message,
      stack: error.stack
    }, null, 2));
    console.groupEnd();
  }
}

/**
 * Centralized HTTP requester with structured logging
 */
class HTTPRequester {
  private async makeRequest<T>(config: HTTPRequestConfig): Promise<HTTPResponse<T>> {
    // Build URL with query parameters
    let url = config.url;
    if (config.params) {
      const queryString = new URLSearchParams(config.params).toString();
      url += `?${queryString}`;
    }

    // Default headers
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      // Avoid ngrok interstitial in Telegram WebView and other embedded browsers
      'ngrok-skip-browser-warning': 'true',
    };

    // Merge headers
    const headers = { ...defaultHeaders, ...config.headers };

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      signal: AbortSignal.timeout(APIConfig.REQUEST_TIMEOUT),
    };

    // Add body for non-GET requests
    if (config.data && config.method !== 'GET') {
      fetchOptions.body = JSON.stringify(config.data);
    }

    // Make the request
    const response = await fetch(url, fetchOptions);
    
    // Parse response
    let responseData: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text() as T;
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }

  async request<T = any>(config: HTTPRequestConfig): Promise<T> {
    // Log the request
    APILogger.logRequest(config);

    try {
      const response = await this.makeRequest<T>(config);
      
      // Log the response
      APILogger.logResponse(config, response);
      
      // Check if request was successful
      if (!response.status.toString().startsWith('2')) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      // Log the error
      APILogger.logError(config, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const httpRequester = new HTTPRequester();