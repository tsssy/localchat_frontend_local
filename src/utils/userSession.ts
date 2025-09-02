/**
 * User Session Management
 * Handles storing and retrieving authentication data from localStorage
 */

export interface UserSessionData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  username: string;
  telegram_id: string;
  location?: string | null;
  number_of_match_requests?: number;
}

const USER_SESSION_KEY = 'lovechat_user_session';

export class UserSession {
  /**
   * Save user session data to localStorage
   */
  static save(sessionData: UserSessionData): void {
    try {
      const dataToStore = JSON.stringify(sessionData);
      localStorage.setItem(USER_SESSION_KEY, dataToStore);
      console.log('✅ [UserSession] Session data saved to localStorage');
    } catch (error) {
      console.error('❌ [UserSession] Failed to save session data:', error);
      throw new Error('Failed to save user session');
    }
  }

  /**
   * Get user session data from localStorage
   */
  static get(): UserSessionData | null {
    try {
      const storedData = localStorage.getItem(USER_SESSION_KEY);
      if (!storedData) {
        console.log('ℹ️ [UserSession] No session data found');
        return null;
      }
      
      const sessionData = JSON.parse(storedData) as UserSessionData;
      console.log('✅ [UserSession] Session data retrieved from localStorage');
      return sessionData;
    } catch (error) {
      console.error('❌ [UserSession] Failed to retrieve session data:', error);
      return null;
    }
  }

  /**
   * Clear user session data from localStorage
   */
  static clear(): void {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
      console.log('✅ [UserSession] Session data cleared from localStorage');
    } catch (error) {
      console.error('❌ [UserSession] Failed to clear session data:', error);
    }
  }

  /**
   * Check if user session exists
   */
  static exists(): boolean {
    return localStorage.getItem(USER_SESSION_KEY) !== null;
  }

  /**
   * Get access token for API requests
   */
  static getAccessToken(): string | null {
    const sessionData = this.get();
    return sessionData?.access_token || null;
  }

  /**
   * Check if current session is valid (has required fields)
   */
  static isValid(): boolean {
    const sessionData = this.get();
    if (!sessionData) return false;
    
    return !!(
      sessionData.access_token &&
      sessionData.refresh_token &&
      sessionData.token_type &&
      sessionData.user_id &&
      sessionData.username &&
      sessionData.telegram_id
    );
  }

  /**
   * Get number of match requests from session
   */
  static getNumberOfMatchRequests(): number {
    const sessionData = this.get();
    return sessionData?.number_of_match_requests || 0;
  }

  /**
   * Update number of match requests in session
   */
  static updateNumberOfMatchRequests(count: number): void {
    const sessionData = this.get();
    if (sessionData) {
      const updatedData = { ...sessionData, number_of_match_requests: count };
      this.save(updatedData);
      console.log('✅ [UserSession] Match requests count updated:', count);
    }
  }

  /**
   * Get user location from session
   */
  static getUserLocation(): string | null {
    const sessionData = this.get();
    return sessionData?.location || null;
  }
}