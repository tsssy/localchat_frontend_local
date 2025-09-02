import { ArrowLeft, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { useState, useEffect } from 'react';
import { APIServices } from '@/api/http/v1/APIServices';
import { UserSession } from '@/utils/userSession';

interface PurchaseHistoryProps {
  userSession: {
    userId: string; // Changed from number to string
    meta: Record<string, any>;
    numberOfMatchRequests: number;
  } | null;
  onClose: () => void;
}

interface Payment {
  id: string;
  telegram_user_id: string;
  product_id: string;
  amount: number;
  currency: string;
  status: string;
  telegram_payment_charge_id: string | null;
  telegram_provider_payment_charge_id: string | null;
  invoice_payload: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  completed_at: string | null;
  retry_count: number;
  max_retries: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  credits: number;
  category: string;
  is_active: boolean;
}

export function PurchaseHistory({ userSession, onClose }: PurchaseHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!userSession) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get user_id from UserSession directly
        const sessionData = UserSession.get();
        if (!sessionData) {
          throw new Error('User session not found');
        }
        
        // Step 1: Load products first
        console.log('📡 Step 1: Loading products...');
        const productsResponse = await APIServices.getProducts();
        
        if (productsResponse.code === 200 && productsResponse.data) {
          setProducts((productsResponse.data as any).active_products || []);
          console.log('✅ Step 1: Products loaded successfully');
        } else {
          console.warn('⚠️ Step 1: Failed to load products:', productsResponse.msg);
          setProducts([]);
        }
        
        // Step 2: Load payment history
        console.log('📡 Step 2: Loading payment history...');
        const paymentResponse = await APIServices.getUserPaymentHistory(sessionData.user_id);

        if (paymentResponse.code === 200 && paymentResponse.data) {
          setPayments(paymentResponse.data.payments || []);
          console.log('✅ Step 2: Payment history loaded successfully');
        } else {
          throw new Error(paymentResponse.msg || 'Failed to load payment history');
        }
        
      } catch (error) {
        console.error('❌ Failed to load data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load purchase history');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userSession]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.title : `Product ${productId}`;
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'XTR') {
      return `${amount} ⭐️`;
    } else if (currency === 'USD') {
      // Convert cents to dollars
      return `$${(amount / 100).toFixed(2)}`;
    } else {
      // For other currencies, show as-is with currency code
      return `${amount} ${currency}`;
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'completed' ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : status === 'failed' ? (
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : status === 'expired' ? (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <Clock className="w-4 h-4 text-yellow-400" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            Failed
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Expired
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Pending
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700">
          <button onClick={onClose} className="text-white/90 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white text-xl font-medium">Purchase History</h2>
          <div className="w-6 h-6"></div> {/* Spacer */}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading purchase history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700">
          <button onClick={onClose} className="text-white/90 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white text-xl font-medium">Purchase History</h2>
          <div className="w-6 h-6"></div> {/* Spacer */}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg mb-2">Failed to Load History</h3>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700">
        <button onClick={onClose} className="text-white/90 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-medium">Purchase History</h2>
        <div className="w-6 h-6"></div> {/* Spacer */}
      </div>

      {/* Purchase History List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-slate-400 mb-4">
              <DollarSign className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-white text-lg mb-2">No purchases yet</h3>
            <p className="text-slate-400 text-sm">
              Your purchase history will appear here after making your first purchase.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(payment.status)}
                        <h3 className="text-white font-medium">
                          {getProductName(payment.product_id)}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-green-400 font-semibold">
                            {formatAmount(payment.amount, payment.currency)}
                          </span>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      <p className="text-slate-400 text-sm">
                        {formatDate(payment.updated_at)}
                      </p>
                    </div>
                    
                    <div className="text-slate-500 text-xs">
                      #{payment.id.substring(0, 8)}...
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}