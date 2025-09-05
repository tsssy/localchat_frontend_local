import { Card, CardContent } from '../../ui/card';
import { User, MapPin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { APIServices } from '@/api/http/v1/APIServices';
import { UserSession } from '@/utils/userSession';
import { TelegramWebApp } from '@/utils/telegramWebApp';
import { AppConfig } from '../../../../config/config';
import { ParticleBackground } from '../../ui/ParticleBackground';
import type { ProductData } from '@/api/http/v1/APISchemes';

interface ProductCard extends ProductData {
  // Store all the product data needed for purchase
}

interface ShopProps {
  userSession: {
    userId: string; // Changed from number to string
    meta: Record<string, any>;
    numberOfMatchRequests: number;
  } | null;
  onPurchaseGift?: (product: ProductCard) => void;
  onPurchaseHistory: () => void;
}

export function Shop({ userSession, onPurchaseGift, onPurchaseHistory }: ShopProps) {
  const [clickedProduct, setClickedProduct] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [costPerMessage, setCostPerMessage] = useState<number>(0);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Define loadUserCredits outside useEffect so it can be called from handleProductClick
  const loadUserCredits = async () => {
    if (!userSession) {
      setIsLoadingCredits(false);
      return;
    }

    try {
      setIsLoadingCredits(true);
      setCreditsError(null);
      
      // Get user_id from UserSession directly
      const sessionData = UserSession.get();
      if (!sessionData) {
        throw new Error('User session not found');
      }
      
      const response = await APIServices.getUserCredits(sessionData.user_id);

      if (response.code === 200 && response.data) {
        setUserCredits(response.data.current_balance);
      } else {
        throw new Error(response.msg || 'Failed to load user credits');
      }
    } catch (error) {
      console.error('Failed to load user credits:', error);
      setCreditsError(error instanceof Error ? error.message : 'Failed to load user credits');
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    // Initialize Telegram WebApp
    TelegramWebApp.init();
    
    // Track page visit when component mounts
    const trackPageVisit = async () => {
      try {
        await APIServices.updateLastVisited({ page: 'shop' });
        console.log('✅ [Shop] Page visit tracked: shop');
      } catch (error) {
        console.warn('⚠️ [Shop] Failed to track page visit:', error);
      }
    };

    trackPageVisit();

    // Load user settings (FRESH API CALL - as requested, rerun API each time entering Shop)
    const loadUserSettings = async () => {
      console.log('📡 [Shop] Loading user settings...');
      try {
        setIsLoadingSettings(true);
        setSettingsError(null);
        
        // CACHE-FIRST APPROACH: Check if SettingsCache is available
        const settingsCache = userSession?.meta?.SettingsCache;
        if (settingsCache && settingsCache.settings) {
          console.log('📦 [Shop] Using SettingsCache from meta:', settingsCache);
          
          const response = settingsCache.settings;
          if (response.code === 200 && response.data?.cost_per_message) {
            const apiCostPerMessage = response.data.cost_per_message;
            setCostPerMessage(apiCostPerMessage);
            console.log('✅ [Shop] Cost per message from Settings Cache:', apiCostPerMessage);
            setIsLoadingSettings(false);
            return;
          }
        }

        // FALLBACK: Make fresh API call
        console.log('📡 [Shop] No settings cache available, making fresh API call');
        const response = await APIServices.getUserSettings();
        
        if (response.code === 200 && response.data?.cost_per_message) {
          const apiCostPerMessage = response.data.cost_per_message;
          setCostPerMessage(apiCostPerMessage);
          console.log('✅ [Shop] Cost per message from User Settings API:', apiCostPerMessage);
        } else {
          throw new Error(response.msg || 'Invalid user settings response');
        }
      } catch (error) {
        console.error('❌ [Shop] User Settings API failed, using hardcoded default:', error);
        setSettingsError(error instanceof Error ? error.message : 'Failed to load user settings');
        
        // SIMPLIFIED: Only hardcoded fallback (no cache)
        setCostPerMessage(5);
        console.log('⚠️ [Shop] FALLBACK: Using default cost per message: 5');
      } finally {
        setIsLoadingSettings(false);
      }
    };

    const loadProducts = async () => {
      // ENHANCED CACHE-FIRST APPROACH: Check for ProductsCache in meta
      const productsCache = userSession?.meta?.ProductsCache;
      if (productsCache && productsCache.products) {
        console.log('📦 [Shop] Using ProductsCache from meta:', productsCache);
        
        const response = productsCache.products;
        console.log('📋 [Shop] ProductsCache response structure:', response);
        if (response.code === 200 && response.data) {
          // Your API uses active_products as the main field
          const productsList = response.data.active_products || response.data.products || [];
          setProducts(productsList.filter((p: any) => p.is_active));
          console.log(`✅ [Shop] Loaded ${productsList.length} products from ProductsCache`);
          setIsLoadingProducts(false);
          return;
        }
      }
      
      // FALLBACK 1: Check if legacy ShopCache is available in userSession meta
      if (userSession?.meta?.ShopCache) {
        console.log('📦 [Shop] Using legacy ShopCache from initialization, skipping API call');
        const cachedProducts = userSession.meta.ShopCache.active_products || userSession.meta.ShopCache.products || [];
        setProducts(cachedProducts.filter((p: any) => p.is_active));
        console.log(`Using cached products list with ${cachedProducts.length} products`);
        setIsLoadingProducts(false);
        return;
      }

      // FALLBACK 2: Make fresh API call
      console.log('📡 [Shop] No cache available, making fresh API call');
      try {
        setIsLoadingProducts(true);
        setProductsError(null);
        const response = await APIServices.getProducts();

        if (response.code === 200 && response.data) {
          // Your API uses active_products as the main field
          const productsList = response.data.active_products || response.data.products || [];
          setProducts(productsList.filter((p: any) => p.is_active));
        } else {
          throw new Error(response.msg || 'Failed to load products');
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        setProductsError(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    // Load all APIs asynchronously
    loadUserSettings(); // NEW: Load user settings first for cost_per_message
    loadProducts();
    loadUserCredits();
    
    // Scroll to products section after a short delay to ensure content is loaded
    const scrollTimer = setTimeout(() => {
      if (productsRef.current) {
        productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('📜 [Shop] Scrolled to products section');
      }
    }, 500); // Small delay to ensure content is rendered
    
    return () => {
      clearTimeout(scrollTimer);
    };
  }, [userSession]);

  const handleProductClick = async (product: ProductCard) => {
    setClickedProduct(product.id);
    setPaymentError(null);
    
    try {
      setIsProcessingPayment(product.id);
      
      // Get Telegram user ID
      const telegramUserId = TelegramWebApp.getTelegramUserId();
      if (!telegramUserId) {
        throw new Error('Telegram user ID not available. Please ensure you are using this app within Telegram.');
      }
      
      console.log('💳 [Shop] Starting payment process for product:', {
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        telegramUserId
      });
      
      // Step 1: Create payment invoice
      const invoiceResponse = await APIServices.createPaymentInvoice(telegramUserId, product.id);
      
      if (invoiceResponse.code !== 201 || !invoiceResponse.data?.invoice_url) {
        throw new Error(invoiceResponse.msg || 'Failed to create payment invoice');
      }
      
      console.log('📋 [Shop] Payment invoice created:', {
        paymentId: invoiceResponse.data.payment_id,
        invoiceUrl: invoiceResponse.data.invoice_url,
        amount: invoiceResponse.data.amount,
        currency: invoiceResponse.data.currency
      });
      
      // Step 2: Open payment invoice using Telegram WebApp
      const paymentResult = await TelegramWebApp.openInvoice(invoiceResponse.data.invoice_url);
      
      console.log('💰 [Shop] Payment completed with result:', paymentResult);
      
      // Handle payment result
      switch (paymentResult) {
        case 'paid':
          console.log('✅ [Shop] Payment successful! Refreshing user credits...');
          
          // Show success message
          await TelegramWebApp.showAlert(`Payment successful! You have purchased ${product.title} for ${product.price} ⭐️`);
          
          // Refresh user credits to show updated balance
          loadUserCredits();
          
          // Call the original onPurchaseGift callback for any additional handling (if provided)
          onPurchaseGift?.(product);
          
          break;
          
        case 'cancelled':
          console.log('⚠️ [Shop] Payment cancelled by user');
          await TelegramWebApp.showAlert('Payment was cancelled. No charges were made.');
          break;
          
        case 'failed':
          console.log('❌ [Shop] Payment failed');
          await TelegramWebApp.showAlert('Payment failed. Please try again or contact support.');
          break;
          
        case 'pending':
          console.log('⏳ [Shop] Payment is pending');
          await TelegramWebApp.showAlert('Payment is being processed. You will receive your credits once the payment is confirmed.');
          break;
          
        default:
          console.log('❓ [Shop] Unknown payment result:', paymentResult);
          await TelegramWebApp.showAlert('Payment status unknown. Please check your purchase history.');
          break;
      }
      
    } catch (error) {
      console.error('❌ [Shop] Payment process failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setPaymentError(errorMessage);
      
      // Show error to user
      if (TelegramWebApp.isAvailable()) {
        await TelegramWebApp.showAlert(`Payment Error: ${errorMessage}`);
      }
    } finally {
      setIsProcessingPayment(null);
      
      // Reset animation after 300ms
      setTimeout(() => setClickedProduct(null), 300);
    }
  };

  // Get grid columns class based on configuration
  const getGridColumnsClass = (productsPerRow: number): string => {
    switch (productsPerRow) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-1';
    }
  };

  const isLoading = isLoadingProducts; // REMOVED: || isLoadingCredits - make credits non-blocking too
  const hasError = productsError; // REMOVED: || creditsError - make credits non-blocking

  if (isLoading) {
    return (
      <div className="h-full mystical-background relative flex flex-col">
        <ParticleBackground particleCount={10} />
        <div className="p-6 relative z-10">
          <h2 className="text-white text-2xl text-center title-glow">Shop</h2>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-purple-400 rounded-full animate-spin mx-auto mb-4 pulse-glow"></div>
            <p className="text-slate-400">Loading shop data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-full mystical-background relative flex flex-col">
        <ParticleBackground particleCount={8} />
        <div className="p-6 relative z-10">
          <h2 className="text-white text-2xl text-center title-glow">Shop</h2>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2 pulse-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">Failed to Load Shop</h3>
            <p className="text-slate-400 text-sm">{productsError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full mystical-background relative flex flex-col">
      <ParticleBackground particleCount={12} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto mystical-scrollbar relative z-10">
        {/* Balance Card */}
        <div className="px-6 pt-12 pb-6">
          <Card className="glassmorphism-card border-purple-500/30">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-purple-300 text-lg mb-2 text-[20px] title-glow">Your Balance</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {isLoadingCredits ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin pulse-glow"></div>
                      <span className="text-white text-xl">Loading...</span>
                    </div>
                  ) : creditsError ? (
                    <div className="text-center">
                      <span className="text-red-400 text-xl">Error loading balance</span>
                      <p className="text-red-400/70 text-xs mt-1">{creditsError}</p>
                    </div>
                  ) : (
                    <span className="text-white text-4xl font-medium">{userCredits}</span>
                  )}
                </div>
                <p className="text-white/50 text-base mb-4 text-[16px]">Coins</p>
                {/* Purchase History Link */}
                <button 
                  onClick={onPurchaseHistory}
                  className="text-purple-300 text-sm underline hover:text-purple-200 transition-colors text-[12px]"
                >
                  Purchase History
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Packages Title */}
        <div className="px-6 pb-4">
          <h3 className="text-purple-300 text-xl text-center title-glow">Purchase Packages</h3>
          
          {/* Payment Error Display */}
          {paymentError && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg glassmorphism-card">
              <p className="text-red-400 text-sm text-center">
                <span className="font-semibold">Payment Error:</span> {paymentError}
              </p>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div ref={productsRef} className="px-6 pb-24">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-purple-400 rounded-full animate-spin mx-auto mb-4 pulse-glow"></div>
                <p className="text-slate-400">Loading products...</p>
              </div>
            </div>
          ) : productsError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-400 mb-2">
                  <svg className="w-8 h-8 mx-auto pulse-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm">Failed to load products</p>
              </div>
            </div>
          ) : (
            <div className={`grid ${getGridColumnsClass(AppConfig.SHOP_PRODUCTS_PER_ROW)} gap-4`}>
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  onClick={() => handleProductClick(product)}
                  className={`glassmorphism-card border-purple-500/30 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${
                    clickedProduct === product.id 
                      ? 'border-purple-400 border-2 shadow-lg shadow-purple-400/30' 
                      : 'hover:border-purple-500/50'
                  } ${
                    isProcessingPayment === product.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  
                  {/* Payment Processing Overlay */}
                  {isProcessingPayment === product.id && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-slate-700 border-t-purple-400 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-purple-400 text-sm">Processing Payment...</p>
                      </div>
                    </div>
                  )}
                  
                  <CardContent className={`flex flex-col ${product.show_feature && product.feature_text && product.feature_text.trim() !== '' ? 'px-4 pb-4 pt-0' : 'p-4'}`}>
                    {/* Banner Content - Above everything - Only show if show_feature is true AND feature_text exists */}
                    {product.show_feature && product.feature_text && product.feature_text.trim() !== '' && (
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-2 mt-2 mb-2">
                        <p className="text-white text-xs text-center font-bold text-[12px]">{product.feature_text}</p>
                      </div>
                    )}
                    
                    {/* Product Title - Adjust -mt-X value to control gap with banner above */}
                    <div className={`${product.show_feature && product.feature_text && product.feature_text.trim() !== '' ? 'mb-2 -mt-2' : 'mb-4'}`}>
                      <h3 className="text-white text-lg text-center text-[18px] font-medium">{product.title}</h3>
                    </div>
                    
                    {/* Price and Credits */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-yellow-400 text-2xl font-semibold">{product.price}</span>
                        <span className="text-yellow-400 text-2xl font-semibold">⭐️</span>
                      </div>
                      <span className="text-white/70 text-sm text-center">
                        {product.credits} {product.credits === 1 ? 'Message' : 'Messages'}
                      </span>
                      {/* Product Description */}
                      {product.description && (
                        <p className="text-white/60 text-xs text-center mt-2">{product.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}