# API Documentation

This directory contains the structured API service layer for the application, providing a clean and expandable architecture for HTTP requests and WebSocket connections.

## Directory Structure

```
src/api/
├── README.md                 # This documentation
├── http/
│   ├── http_requester.ts    # HTTP request utility with logging
│   └── v1/
│       ├── APIServices.ts   # API service methods
│       └── APISchemes.ts    # Request/Response type definitions
├── ws/
│   └── ws_handler.ts        # WebSocket connection manager
└── config.ts                # Configuration (located in root)
```

## Configuration

All API endpoints and settings are centralized in `config.ts` at the project root:

```typescript
import { APIConfig } from '../config';

// Access configured URLs
const apiUrl = APIConfig.getApiUrl();        // http://localhost:8000/api/v1
const wsUrl = APIConfig.getWebSocketUrl();   // ws://localhost:8001/ws/v1
```

## HTTP Services

## API Schemas

### Schema Structure

The `APISchemes.ts` file is organized with **base interfaces at the top** and **project-specific schemas at the bottom**:

```typescript
// =============================================================================
// BASE INTERFACES - Foundation for all API schemas
// =============================================================================

export interface APIRequest { ... }           // Base for all requests
export interface APIResponse<T> { ... }       // Base for all responses  
export interface ErrorResponse { ... }        // Standard error format
export interface PaginatedResponse<T> { ... } // For paginated APIs

// =============================================================================  
// PROJECT-SPECIFIC SCHEMAS - Your actual API definitions
// =============================================================================

export interface LoginRequest extends APIRequest { ... }
export interface LoginResponse extends APIResponse { ... }
// ... add your schemas here
```

### Adding New Schemas

1. **Define Data Models** (your core entities):
```typescript
export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}
```

2. **Create Request Schema** (extend APIRequest):
```typescript
export interface CreateUserRequest extends APIRequest {
  email: string;
  nickname: string;
  password: string;
}
```

3. **Create Response Schema** (extend APIResponse):
```typescript
export interface CreateUserResponse extends APIResponse {
  data: User;
}
```

4. **For Paginated Data** (extend PaginatedResponse):
```typescript
export interface GetUsersResponse extends PaginatedResponse<User> {
  // Inherits: data.items, data.hasMore, data.nextCursor, data.totalCount
}
```

### Schema Examples in File

The file includes example schemas you can copy and modify:
- `ExampleLoginRequest` - Authentication request pattern
- `ExampleLoginResponse` - Authentication response pattern  
- `ExampleUserProfile` - Data model pattern

### Adding New API Methods

1. **Define Types** in `APISchemes.ts` (add to PROJECT-SPECIFIC section):
```typescript
export interface CreateUserRequest extends APIRequest {
  email: string;
  nickname: string;
  password: string;
}

export interface CreateUserResponse extends APIResponse {
  data: {
    id: string;
    email: string;
    nickname: string;
  };
}
```
2. **Create Service Method** in `APIServices.ts`:
```typescript
static async createUser(requestBody: CreateUserRequest): Promise<CreateUserResponse> {
  const endpoint_url = `${APIConfig.getApiUrl()}/users`;
  const request_method = "POST";
  
  try {
    const responseBody = await httpRequester.request({
      url: endpoint_url,
      method: request_method,
      data: requestBody,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return responseBody;
  } catch (error) {
    console.error('Create User API error:', error);
    throw error;
  }
}
```

### HTTP Method Examples

The `APIServices.ts` file includes examples for all HTTP methods:

- **GET**: `getExample()` - Fetch data without request body
- **POST**: `postExample(requestBody)` - Create new resource
- **PUT**: `putExample(requestBody)` - Update entire resource
- **DELETE**: `deleteExample(id)` - Remove resource
- **PATCH**: `patchExample(requestBody)` - Partial update

### Usage Example

```typescript
import { APIServices } from '@/api/http/v1/APIServices';

// Use the API service
try {
  const result = await APIServices.postExample({
    name: "test",
    value: 123
  });
  console.log('Success:', result);
} catch (error) {
  console.error('API call failed:', error);
}
```

## HTTP Request Logger

All HTTP requests and responses are automatically logged with structured formatting:

```
🌐 REQUEST [2024-01-15T10:30:45.123Z]
{
  "url": "http://localhost:8000/api/v1/example",
  "method": "POST",
  "headers": {...},
  "body": {...}
}

🌐 RESPONSE [2024-01-15T10:30:45.456Z]
{
  "status": 200,
  "statusText": "OK",
  "responseBody": {...}
}
```

## WebSocket Handler

### Basic Setup

```typescript
import { wsManager, WSHandlerExamples } from '@/api/ws/ws_handler';

// 1. Connect to WebSocket
await wsManager.connect(authToken);

// 2. Set up event handlers
WSHandlerExamples.setupMessageHandler();
WSHandlerExamples.setupTypingHandler();
WSHandlerExamples.setupOnlineStatusHandler();
```

### Adding Custom WebSocket Handlers

```typescript
// Register custom event handler
wsManager.on('onGiftReceived', (data) => {
  console.log('Gift received:', data);
  // Update UI to show gift notification
  showGiftNotification(data.gift, data.sender);
});

// Send custom WebSocket message
wsManager.send('gift_received', {
  giftId: 'gift123',
  receiverId: 'user456',
  message: 'Thanks for the gift!'
});
```

### WebSocket Message Types

- `message` - Chat messages
- `typing` - Typing indicators
- `online_status` - User online/offline status
- `match_notification` - New match alerts
- `gift_received` - Gift notifications
- `system_notification` - System announcements

### Example Usage Patterns

```typescript
// Send typing indicator
WSHandlerExamples.sendTypingStatus(conversationId, true);

// Send chat message
WSHandlerExamples.sendChatMessage(conversationId, 'Hello!', receiverId);

// Check connection status
if (wsManager.isConnected()) {
  // WebSocket is ready
}

// Cleanup on component unmount
wsManager.disconnect();
```

## Error Handling

Both HTTP and WebSocket services include comprehensive error handling:

- **HTTP**: Automatic retry logic, timeout handling, structured error logging
- **WebSocket**: Auto-reconnection with exponential backoff, connection state management
- **Logging**: All requests, responses, and errors are logged with timestamps

## Best Practices

1. **Configuration**: Always use `APIConfig` for URLs and settings
2. **Type Safety**: Define request/response types in `APISchemes.ts`
3. **Error Handling**: Always wrap API calls in try-catch blocks
4. **Authentication**: Include auth tokens in request headers
5. **WebSocket Cleanup**: Disconnect WebSocket connections when components unmount
6. **Logging**: Monitor console for detailed request/response logs during development

## Expanding the API

To add new API versions or features:

1. Create new version directory: `src/api/http/v2/`
2. Copy and modify `APIServices.ts` and `APISchemes.ts`
3. Update `config.ts` if needed for new endpoints
4. The `http_requester.ts` works across all versions

This architecture is designed to be elegant, maintainable, and easily expandable as your application grows.