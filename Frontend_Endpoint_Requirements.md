# Frontend API Endpoint Requirements

This document outlines all API endpoints required by the frontend application. Each endpoint is documented with its URL, request/response schemas, and functionality description for backend implementation.

## Base Configuration
- **Base URL**: To be determined by backend configuration
- **Authentication**: Bearer token authentication via `Authorization` header
- **Content-Type**: `application/json`
- **HTTP Method**: All endpoints use `POST` method

---

## 1. Initialize API

**Endpoint**: `/initialize`

**Description**: Called on app startup to initialize user session and retrieve user's current state, match data, and application metadata. 
For initial match (no match in the user data), you should run initial match algorithm to match initial 3 matches for users.

**Caching Strategy**: This API preloads data from other endpoints to optimize app performance by reducing subsequent API calls. The `meta` field contains cached data from:
- NewMatchCache: Current match information (same structure as getMatchInformation response)
- MessagesListCache: Message cards data (same structure as initializeMessagesList response)  
- ShopCache: Product catalog data (same structure as getProducts response)

When cached data is available, pages should use it instead of calling their respective APIs.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | Unique identifier for the user |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | object | Yes | Container for response data |
| `data.user_id` | number | Yes | User's unique identifier |
| `data.match_ids` | number[] | Yes | Array of match IDs associated with the user |
| `data.last_page` | string | Yes | Last visited page for navigation restoration. Format: "profile", "new-girls", "messages", or "chat_{target_user_id}_{match_id}" |
| `data.meta` | object | Yes | Application metadata and cached data for performance optimization |
| `data.meta.NewMatchCache` | object | No | Cached current match data (match_id, target_user_id, target_user_name, target_user_age, target_user_location, target_user_tags, target_user_photo_urls, number_of_match_requests, match_ids) |
| `data.meta.MessagesListCache` | array | No | Cached message cards array (target_user_id, target_user_name, target_user_photo_url, match_id, latest_message, latest_message_time, is_read) |
| `data.meta.ShopCache` | array | No | Cached products array (product_id, product_title, product_desc, product_price, product_currency, product_credits, product_photo_url, product_is_active) |
| `data.user_location` | string | Yes | User's current location |
| `data.number_of_match_requests` | number | Yes | Number of match requests made by user |

### Response Examples

**Success Response:**
```json
{
  "code": 200,
  "msg": "User session initialized successfully",
  "data": {
    "user_id": 123,
    "match_ids": [1, 2, 3],
    "last_page": "new-girls",
    "meta": {
      "NewMatchCache": {
        "match_id": 1,
        "target_user_id": 201,
        "target_user_name": "Emma",
        "target_user_age": 25,
        "target_user_location": "New York, USA",
        "target_user_tags": ["music", "travel", "fitness"],
        "target_user_photo_urls": ["url1", "url2", "url3"],
        "number_of_match_requests": 3,
        "match_ids": [1, 2, 3]
      },
      "MessagesListCache": [...],
      "ShopCache": [...]
    },
    "user_location": "New York, USA",
    "number_of_match_requests": 3
  }
}
```

**Error Response:**
```json
{
  "code": 404,
  "msg": "User not found",
  "data": null
}
```

---

## 2. Initialize Messages List API

**Endpoint**: `/initializeMessagesList`

**Description**: Loads all message cards for the Messages page, displaying conversations with matched users. 

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | User's unique identifier |
| `match_ids` | number[] | Yes | Array of match IDs to load messages for |
| `number_of_match_requests` | number | Yes | Current number of match requests |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | array | Yes | Array of message card objects |
| `data[].target_user_id` | number | Yes | ID of the matched user |
| `data[].target_user_name` | string | Yes | Name of the matched user |
| `data[].target_user_photo_url` | string | Yes | Profile photo URL of the matched user |
| `data[].match_id` | number | Yes | Unique match identifier |
| `data[].latest_message` | string | Yes | Most recent message content |
| `data[].latest_message_time` | string | Yes | Human-readable timestamp of latest message |
| `data[].is_read` | boolean | Yes | Whether the latest message has been read |

### Response Examples

**Success Response:**
```json
{
  "code": 200,
  "msg": "Messages list initialized successfully",
  "data": [
    {
      "target_user_id": 101,
      "target_user_name": "Emma",
      "target_user_photo_url": "https://images.unsplash.com/photo-1494790108755-2616b25ad7b6?w=300",
      "match_id": 1,
      "latest_message": "Hey there! How are you doing? 😊",
      "latest_message_time": "2 min ago",
      "is_read": true
    }
  ]
}
```

**Error Response:**
```json
{
  "code": 404,
  "msg": "No messages found",
  "data": []
}
```

---

## 3. Get Products API

**Endpoint**: `/getProducts`

**Description**: Retrieves all available products for purchase in the Shop page. This is a getter endpoint that returns product catalog without requiring user-specific information.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| *(empty)* | - | - | No parameters required - returns all available products |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | array | Yes | Array of available products |
| `data[].product_id` | number | Yes | Unique product identifier |
| `data[].product_title` | string | Yes | Product name/title |
| `data[].product_desc` | string | Yes | Product description |
| `data[].product_price` | number | Yes | Product price |
| `data[].product_currency` | string | Yes | Currency code (e.g., "USD", "⭐️") |
| `data[].product_credits` | number | Yes | Number of message credits this product provides |
| `data[].product_photo_url` | string | Yes | Product image URL |
| `data[].product_is_active` | boolean | Yes | Whether product is available for purchase |
| `data[].banner_content` | string | Yes | Banner or promotional content to display with the product |
| `data[].product_meta` | object | Yes | Additional product metadata |

### Response Examples

**Success Response:**
```json
{
  "code": 200,
  "msg": "Products loaded successfully",
  "data": [
    {
      "product_id": 1,
      "product_title": "100 Message Credit",
      "product_desc": "Send 100 message to any girl",
      "product_price": 100,
      "product_currency": "⭐️",
      "product_credits": 1,
      "product_photo_url": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300",
      "product_is_active": true,
      "banner_content": "🎉 Popular first choice!!!!",
      "product_meta": {}
    }
  ]
}
```

**Error Response:**
```json
{
  "code": 500,
  "msg": "Failed to load products",
  "data": []
}
```

---

## 4. Get User Credits API

**Endpoint**: `/getUserCredits`

**Description**: Retrieves the current credit balance for a specific user. Used to display user's available message credits in the Shop page balance card.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | User's unique identifier |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | object | Yes | Container for credit information |
| `data.credits` | number | Yes | User's current message credit balance |

### Response Examples

**Success Response:**
```json
{
  "code": 200,
  "msg": "User credits loaded successfully",
  "data": {
    "credits": 75
  }
}
```

**Error Response:**
```json
{
  "code": 404,
  "msg": "User not found",
  "data": {
    "credits": 0
  }
}
```

---

## 5. Get Match Information API

**Endpoint**: `/getMatchInformation`

**Description**: Unified API that handles both loading existing match information for the New Girls page and getting new matches when user clicks "Get Another Match". The behavior is controlled by the `is_calling_another_match` flag.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | User's unique identifier |
| `match_ids` | number[] | Yes | Array of current match IDs |
| `number_of_match_requests` | number | Yes | Current number of match requests |
| `is_calling_another_match` | boolean | Yes | If false: loads existing match info. If true: generates new match |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | object | Yes | Container for match information |
| `data.match_id` | number | Yes | Match identifier (existing or new) |
| `data.target_user_id` | number | Yes | Matched user's unique identifier |
| `data.target_user_name` | string | Yes | Matched user's name |
| `data.target_user_age` | number | Yes | Matched user's age |
| `data.target_user_location` | string | Yes | Matched user's location |
| `data.target_user_tags` | string[] | Yes | Array of user's interest tags |
| `data.target_user_photo_urls` | string[] | Yes | Array of user's photo URLs |
| `data.number_of_match_requests` | number | Yes | Match requests count (incremented if new match) |
| `data.match_ids` | number[] | Yes | Updated match IDs array (includes new match if generated) |

### Response Examples

**Success Response (Existing Match):**
```json
{
  "code": 200,
  "msg": "Match information loaded successfully",
  "data": {
    "match_id": 1,
    "target_user_id": 201,
    "target_user_name": "Emma",
    "target_user_age": 25,
    "target_user_location": "New York, USA",
    "target_user_tags": ["music", "travel", "fitness"],
    "target_user_photo_urls": ["url1", "url2", "url3"],
    "number_of_match_requests": 3,
    "match_ids": [1, 2, 3]
  }
}
```

**Success Response (New Match):**
```json
{
  "code": 200,
  "msg": "New match found successfully",
  "data": {
    "match_id": 4,
    "target_user_id": 204,
    "target_user_name": "Sofia",
    "target_user_age": 28,
    "target_user_location": "Los Angeles, USA",
    "target_user_tags": ["art", "books", "cooking"],
    "target_user_photo_urls": ["url1", "url2", "url3", "url4"],
    "number_of_match_requests": 4,
    "match_ids": [1, 2, 3, 4]
  }
}
```

**Error Response (No Matches Available):**
```json
{
  "code": 404,
  "msg": "No matches available",
  "data": {
    "match_id": 0,
    "target_user_id": 0,
    "target_user_name": "",
    "target_user_age": 0,
    "target_user_location": "",
    "target_user_tags": [],
    "target_user_photo_urls": [],
    "number_of_match_requests": 0,
    "match_ids": []
  }
}
```

---

## 6. Load Chatroom API

**Endpoint**: `/loadChatroom`

**Description**: Loads chat history and conversation data with cursor-based pagination. Returns messages sorted from newest to oldest, with user profile information included only on the initial request.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | The unique identifier of the user making the request |
| `match_id` | number | Yes | The identifier for the conversation, unique to the matched pair |
| `last_message_id` | number | No | The cursor for pagination - ID of the oldest message currently on the client. Omit for initial load of newest messages |
| `page_size` | number | Yes | The number of messages to be loaded in this request |
| `target_user_id` | number | Conditional | The unique identifier of the matched user. Required only for the initial request |
| `target_user_name` | string | Conditional | The matched user's name. Required only for the initial request |
| `target_user_age` | number | Conditional | The matched user's age. Required only for the initial request |
| `target_user_location` | string | Conditional | The matched user's location. Required only for the initial request |
| `target_user_tags` | string[] | Conditional | An array of the matched user's interest tags. Required only for the initial request |
| `target_user_photo_urls` | string[] | Conditional | An array of the matched user's photo URLs. Required only for the initial request |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | object | Yes | Container for chatroom data |
| `data.messages` | array | Yes | Array of chat message objects, sorted from newest to oldest |
| `data.messages[].message_id` | number | Yes | Unique identifier for the message |
| `data.messages[].content` | string | Yes | Text content of the message |
| `data.messages[].send_time` | string | Yes | ISO timestamp when message was sent |
| `data.messages[].sender` | number | Yes | User ID of message sender |
| `data.messages[].is_read` | boolean | Yes | Whether message has been read by the requesting user |
| `data.has_more` | boolean | Yes | Flag indicating whether more older messages are available |
| `data.user_profile` | object | Conditional | Container for matched user's profile. Sent only on initial request |
| `data.user_profile.target_user_id` | number | Conditional | Unique identifier of the matched user |
| `data.user_profile.target_user_name` | string | Conditional | Matched user's name |
| `data.user_profile.target_user_age` | number | Conditional | Matched user's age |
| `data.user_profile.target_user_location` | string | Conditional | Matched user's location |
| `data.user_profile.target_user_tags` | string[] | Conditional | Array of matched user's interest tags |
| `data.user_profile.target_user_photo_urls` | string[] | Conditional | Array of matched user's photo URLs |

### Response Examples

**Success Response (Initial Request):**
```json
{
  "code": 200,
  "msg": "Chatroom loaded successfully",
  "data": {
    "messages": [
      {
        "message_id": 1050,
        "content": "That sounds amazing!",
        "send_time": "2024-01-15T15:30:00Z",
        "sender": 201,
        "is_read": false
      },
      {
        "message_id": 1049,
        "content": "I'm planning to visit that new art gallery this weekend",
        "send_time": "2024-01-15T15:25:00Z",
        "sender": 123,
        "is_read": true
      }
    ],
    "has_more": true,
    "user_profile": {
      "target_user_id": 201,
      "target_user_name": "Emma",
      "target_user_age": 25,
      "target_user_location": "New York, USA",
      "target_user_tags": ["music", "travel", "fitness"],
      "target_user_photo_urls": ["url1", "url2", "url3"]
    }
  }
}
```

**Success Response (Pagination Request):**
```json
{
  "code": 200,
  "msg": "Chatroom loaded successfully",
  "data": {
    "messages": [
      {
        "message_id": 1030,
        "content": "Hey there! How are you doing? 😊",
        "send_time": "2024-01-15T14:30:00Z",
        "sender": 201,
        "is_read": true
      },
      {
        "message_id": 1029,
        "content": "Hi! Thanks for matching with me!",
        "send_time": "2024-01-15T14:25:00Z",
        "sender": 123,
        "is_read": true
      }
    ],
    "has_more": true
  }
}
```

**Error Response:**
```json
{
  "code": 404,
  "msg": "Chatroom not found",
  "data": {
    "messages": [],
    "has_more": false
  }
}
```

---

## 7. Load Purchase History API

**Endpoint**: `/loadPurchaseHistory`

**Description**: Retrieves user's complete purchase history for the Purchase History page. Returns transactions in chronological order with latest purchases first. Do not include "pending" payments in the response.

### Request Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `user_id` | number | Yes | User's unique identifier |

### Response Body
| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `code` | number | Yes | HTTP status code (200 for success, 4xx/5xx for errors) |
| `msg` | string | Yes | Human-readable message describing the result |
| `data` | array | Yes | Array of purchase history records |
| `data[].product_id` | number | Yes | ID of the purchased product |
| `data[].payment_status` | string | Yes | Payment status: "pending" or "completed" |
| `data[].total_amount` | number | Yes | Total amount paid for the purchase |
| `data[].currency` | string | Yes | Currency code of the transaction |
| `data[].updated_at` | string | Yes | ISO timestamp of the last update to this purchase |

### Response Examples

**Success Response:**
```json
{
  "code": 200,
  "msg": "Purchase history loaded successfully",
  "data": [
    {
      "product_id": 3,
      "payment_status": "completed",
      "total_amount": 24.99,
      "currency": "USD",
      "updated_at": "2024-01-15T14:30:00Z"
    },
    {
      "product_id": 1,
      "payment_status": "completed",
      "total_amount": 0.99,
      "currency": "USD",
      "updated_at": "2024-01-10T09:15:00Z"
    }
  ]
}
```

**Error Response:**
```json
{
  "code": 404,
  "msg": "No purchase history found",
  "data": []
}
```

---

## Common Response Structure

All API responses follow a consistent structure:

```json
{
  "code": number,
  "msg": string,
  "data": object | array
}
```

## Error Handling

When `code` is not 200, the response indicates an error. Common error codes:
- `400`: Bad request - invalid parameters
- `401`: Unauthorized - authentication required
- `403`: Forbidden - insufficient permissions
- `404`: Not found - requested resource doesn't exist
- `500`: Internal server error

Error responses include:
- `code`: HTTP status code
- `msg`: Descriptive error message
- `data`: May contain empty object/array or error details

## Authentication

All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

The token should be validated for each request to ensure the user is authenticated and authorized to access the requested data.

## Notes for Backend Implementation

1. **Data Consistency**: Ensure that match_ids arrays are consistent across all endpoints that return or accept them.

2. **Pagination**: Consider implementing pagination for endpoints that might return large datasets (messages, purchase history).

3. **Performance**: The frontend expects reasonable response times (< 2 seconds) for all endpoints.

4. **Validation**: Implement proper request validation for all required fields and data types.

5. **Security**: Ensure users can only access their own data by validating user_id against the authenticated token.

6. **Timestamps**: Use ISO 8601 format for all timestamp fields.

7. **Photo URLs**: Ensure all photo URLs are accessible and properly formatted for web display.