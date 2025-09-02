# Data Structures Used by Each Page

This document outlines the data structures that each page component uses to render their content.

---

## 1. Loading Page (`/src/components/pages/loading/Loading.tsx`)

### Input Props:
```typescript
interface LoadingProps {
  onInitializationComplete: (data: InitializationData) => void;
}
```

### Output Data Structure:
```typescript
interface InitializationData {
  userId: number;
  matchIds: number[];
  lastPage: string;
  meta: Record<string, any>;
  numberOfMatchRequests: number;
  userLocation: string;
}
```

### Internal State:
```typescript
const [loadingText, setLoadingText] = useState<string>('Initializing...');
const [error, setError] = useState<string | null>(null);
```

### Telegram Integration Types:
```typescript
interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  ready: () => void;
}
```

---

## 2. New Girls Page (`/src/components/pages/new-girls/NewGirls.tsx`)

### Input Props:
```typescript
interface NewGirlsProps {
  userSession: {
    userId: number;
    matchIds: number[];
    meta: Record<string, any>;
    numberOfMatchRequests: number;
    userLocation: string;
  } | null;
  onChatNow: (chatroomData: LoadChatroomResponse['data']) => void;
  onGetAnotherMatch: (matchData: GetAnotherMatchResponse['data']) => void;
  newMatchId?: number;
  freshMatchData?: GetAnotherMatchResponse['data'];
}
```

### Internal State:
```typescript
const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
const [matchInformation, setMatchInformation] = useState<MatchInformation[]>([]);
const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
const [isLoading, setIsLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
const [isLoadingChatroom, setIsLoadingChatroom] = useState<boolean>(false);
const [isLoadingAnotherMatch, setIsLoadingAnotherMatch] = useState<boolean>(false);
```

### Data Types Used:
```typescript
interface MatchInformation {
  match_id: number;
  target_user_id: number;
  target_user_name: string;
  target_user_age: number;
  target_user_location: string;
  target_user_tags: string[];
}

// Mock photos array
const mockPhotos: string[] = [
  "https://images.unsplash.com/photo-1494790108755-2616b25ad7b6?w=400",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
  "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=400"
];
```

---

## 3. Messages Page (`/src/components/pages/messages/Messages.tsx`)

### Input Props:
```typescript
interface MessagesProps {
  userSession: {
    userId: number;
    matchIds: number[];
    meta: Record<string, any>;
    numberOfMatchRequests: number;
  } | null;
  onMessageClick: (messageCard: MessageCard) => void;
}
```

### Internal State:
```typescript
const [messageCards, setMessageCards] = useState<MessageCard[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

### Data Types Used:
```typescript
interface MessageCard extends MessageCardData {
  // All properties inherited from MessageCardData
}

interface MessageCardData {
  target_user_id: number;
  target_user_name: string;
  target_user_photo_url: string;
  match_id: number;
  latest_message: string;
  latest_message_time: string;
  is_read: boolean;
}
```

---

## 4. Shop Page (`/src/components/pages/shop/Shop.tsx`)

### Input Props:
```typescript
interface ShopProps {
  userSession: {
    userId: number;
    matchIds: number[];
    meta: Record<string, any>;
    numberOfMatchRequests: number;
  } | null;
  onPurchaseGift: (product: ProductCard) => void;
  onPurchaseHistory: () => void;
}
```

### Internal State:
```typescript
const [clickedProduct, setClickedProduct] = useState<number | null>(null);
const [products, setProducts] = useState<ProductCard[]>([]);
const [userCredits, setUserCredits] = useState<number>(0);
const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(true);
const [productsError, setProductsError] = useState<string | null>(null);
const [creditsError, setCreditsError] = useState<string | null>(null);
```

### Data Types Used:
```typescript
interface ProductCard extends ProductData {
  // All properties inherited from ProductData
}

interface ProductData {
  product_id: number;
  product_title: string;
  product_desc: string;
  product_price: number;
  product_currency: string;
  product_credits: number;
  product_photo_url: string;
  product_is_active: boolean;
}
```

---

## 5. Chat Screen (`/src/components/pages/chat/ChatScreen.tsx`)

### Input Props:
```typescript
interface ChatScreenProps {
  girl: {
    id: number;
    name: string;
    photo: string;
    photos?: string[];
    isOnline: boolean;
    age?: number;
    location?: string;
    tags?: string[];
    bio?: string;
    matchId?: number;
  };
  chatroomData?: LoadChatroomResponse['data'] | null;
  onClose: () => void;
}
```

### Internal State:
```typescript
const [messages, setMessages] = useState<ChatMessage[]>(initializeMessages());
const [inputMessage, setInputMessage] = useState<string>('');
const [showProfile, setShowProfile] = useState<boolean>(false);
```

### Data Types Used:
```typescript
interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'girl';
  timestamp: Date;
}

// Chatroom data from API
interface LoadChatroomResponse['data'] {
  user_id: number;
  match_id: number;
  target_user_id: number;
  target_user_name: string;
  target_user_age: number;
  target_user_location: string;
  target_user_tags: string[];
  messages: {
    message_id: number;
    content: string;
    send_time: string;
    sender: number;
  }[];
}
```

---

## 6. Purchase History Page (`/src/components/pages/purchase-history/PurchaseHistory.tsx`)

### Input Props:
```typescript
interface PurchaseHistoryProps {
  userSession: {
    userId: number;
    matchIds: number[];
    meta: Record<string, any>;
    numberOfMatchRequests: number;
  } | null;
  onClose: () => void;
}
```

### Internal State:
```typescript
const [purchases, setPurchases] = useState<PurchaseHistoryData[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

### Data Types Used:
```typescript
interface PurchaseHistoryData {
  product_id: number;
  payment_status: 'pending' | 'completed';
  total_amount: number;
  currency: string;
  updated_at: string;
}
```

### Helper Functions:
```typescript
const formatDate = (dateString: string) => string;
const getProductName = (productId: number) => string;
const getStatusIcon = (status: string) => JSX.Element;
const getStatusBadge = (status: string) => JSX.Element;
```

---

## 7. Main App Component (`/src/App.tsx`)

### Core State Management:
```typescript
const [currentPage, setCurrentPage] = useState<AppPage>('loading');
const [activeTab, setActiveTab] = useState<TabPage>('newGirls');
const [currentChatGirl, setCurrentChatGirl] = useState<any>(null);
const [userSession, setUserSession] = useState<InitializationData | null>(null);
const [chatroomData, setChatroomData] = useState<LoadChatroomResponse['data'] | null>(null);
const [pageStack, setPageStack] = useState<AppPage[]>([]);
const [newMatchId, setNewMatchId] = useState<number | undefined>(undefined);
const [freshMatchData, setFreshMatchData] = useState<GetAnotherMatchResponse['data'] | undefined>(undefined);
```

### Type Definitions:
```typescript
type AppPage = 'loading' | 'newGirls' | 'messages' | 'shop' | 'chat' | 'purchaseHistory';
type TabPage = 'newGirls' | 'messages' | 'shop';

interface InitializationData {
  userId: number;
  matchIds: number[];
  lastPage: string;
  meta: Record<string, any>;
  numberOfMatchRequests: number;
  userLocation: string;
}
```

---

## Common Data Patterns

### 1. Loading States
All pages use similar loading state patterns:
```typescript
const [isLoading, setIsLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

### 2. User Session
Most pages receive userSession prop:
```typescript
userSession: {
  userId: number;
  matchIds: number[];
  meta: Record<string, any>;
  numberOfMatchRequests: number;
  userLocation?: string;
} | null;
```

### 3. API Response Structure
All API responses follow this pattern:
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}
```

### 4. Navigation Callbacks
Pages use callback functions for navigation:
```typescript
onClose: () => void;
onMessageClick: (data: MessageCard) => void;
onChatNow: (data: LoadChatroomResponse['data']) => void;
onPurchaseHistory: () => void;
```