/**
 * Telegram WebApp utilities for handling Mini App features
 * Including payment invoice opening functionality
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready(): void;
        close(): void;
        expand(): void;
        isVersionAtLeast(version: string): boolean;
        openInvoice(url: string, callback?: (status: string) => void): void;
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id?: string;
            type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
            text: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        showAlert(message: string, callback?: () => void): void;
        openLink(url: string, options?: { try_instant_view?: boolean }): void;
        initDataUnsafe?: any;
        initData?: string;
      };
    };
  }
}

export class TelegramWebApp {
  
  /**
   * Check if Telegram WebApp is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           window.Telegram?.WebApp !== undefined;
  }

  /**
   * Initialize Telegram WebApp
   */
  static init(): void {
    if (this.isAvailable()) {
      window.Telegram!.WebApp!.ready();
      console.log('✅ [TelegramWebApp] Initialized successfully');
    } else {
      console.warn('⚠️ [TelegramWebApp] Not available in current environment');
    }
  }

  /**
   * Open payment invoice using Telegram WebApp API
   * @param invoiceUrl - The Telegram invoice URL
   * @returns Promise that resolves with payment status
   */
  static openInvoice(invoiceUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        console.error('❌ [TelegramWebApp] WebApp not available for invoice opening');
        reject(new Error('Telegram WebApp not available'));
        return;
      }

      const webApp = window.Telegram!.WebApp!;

      // Check if openInvoice method is available (requires Telegram WebApp v6.1+)
      if (!webApp.openInvoice) {
        console.error('❌ [TelegramWebApp] openInvoice method not available');
        reject(new Error('Payment method not supported in this version'));
        return;
      }

      console.log('💳 [TelegramWebApp] Opening payment invoice:', invoiceUrl);

      webApp.openInvoice(invoiceUrl, (status: string) => {
        console.log('✅ [TelegramWebApp] Payment result:', status);
        
        switch (status) {
          case 'paid':
            resolve('paid');
            break;
          case 'cancelled':
            resolve('cancelled');
            break;
          case 'failed':
            resolve('failed');
            break;
          case 'pending':
            resolve('pending');
            break;
          default:
            resolve(status);
            break;
        }
      });
    });
  }

  /**
   * Show popup message using Telegram WebApp API
   * @param params - Popup parameters
   * @returns Promise that resolves with button ID clicked
   */
  static showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }): Promise<string> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        console.error('❌ [TelegramWebApp] WebApp not available for popup');
        resolve('unavailable');
        return;
      }

      const webApp = window.Telegram!.WebApp!;

      if (!webApp.showPopup) {
        console.error('❌ [TelegramWebApp] showPopup method not available');
        resolve('unavailable');
        return;
      }

      webApp.showPopup(params, (buttonId: string) => {
        resolve(buttonId);
      });
    });
  }

  /**
   * Show alert message using Telegram WebApp API
   * @param message - Alert message
   * @returns Promise that resolves when alert is closed
   */
  static showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        console.error('❌ [TelegramWebApp] WebApp not available for alert');
        resolve();
        return;
      }

      const webApp = window.Telegram!.WebApp!;

      if (!webApp.showAlert) {
        console.error('❌ [TelegramWebApp] showAlert method not available');
        resolve();
        return;
      }

      webApp.showAlert(message, () => {
        resolve();
      });
    });
  }

  /**
   * Get Telegram user ID from WebApp init data
   * @returns Telegram user ID or null if not available
   */
  static getTelegramUserId(): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    const webApp = window.Telegram!.WebApp!;
    const user = webApp.initDataUnsafe?.user;
    
    if (user?.id) {
      return user.id.toString();
    }

    return null;
  }

  /**
   * Get raw Telegram init data string
   * @returns Telegram init data string or null if not available
   */
  static getInitData(): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    return window.Telegram!.WebApp!.initData || null;
  }

  /**
   * Close the Telegram WebApp
   */
  static close(): void {
    if (this.isAvailable()) {
      window.Telegram!.WebApp!.close();
    }
  }

  /**
   * Expand the Telegram WebApp to full height
   */
  static expand(): void {
    if (this.isAvailable()) {
      window.Telegram!.WebApp!.expand();
    }
  }
}