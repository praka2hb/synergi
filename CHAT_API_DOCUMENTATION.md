# Chat API Documentation

## Overview
This API provides conversation functionality with Google Gemini AI integration, allowing users to have interactive chat sessions with Synergi, a Multi-Agent AI assistant.

## Features
- ✅ Send messages and receive AI responses
- ✅ Create and manage conversations
- ✅ Fetch conversation history
- ✅ Automatic conversation title generation
- ✅ Optimal database storage with proper indexing
- ✅ Authentication-protected endpoints
- ✅ Pagination support
- ✅ Synergi AI system context

## Database Schema

### Conversation Model
```typescript
model Conversation {
  id        String   @id @default(uuid())
  title     String?  // Auto-generated from first message
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]
  
  @@index([userId, updatedAt]) // Optimized for user conversation listing
}
```

### Message Model
```typescript
model Message {
  id             String      @id @default(uuid())
  conversationId String
  userId         String
  content        String      @db.Text // Supports long messages
  role           MessageRole // USER, ASSISTANT, SYSTEM
  createdAt      DateTime    @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt]) // Optimized for conversation message fetching
  @@index([userId, createdAt])         // Optimized for user message queries
}
```

## API Endpoints

### 1. Send Message and Get AI Response
**POST** `/api/chat/send`

Send a user message and receive an AI response from Synergi.

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "message": "Hello, what can you do?",
  "conversationId": "optional-uuid-for-existing-conversation"
}
```

#### Response
```json
{
  "conversationId": "uuid",
  "conversationTitle": "Getting Started with Synergi",
  "userMessage": {
    "id": "uuid",
    "content": "Hello, what can you do?",
    "role": "USER",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "assistantMessage": {
    "id": "uuid",
    "content": "Hello! I'm Synergi, a Multi-Agent AI assistant...",
    "role": "ASSISTANT",
    "createdAt": "2024-01-15T10:30:01Z"
  }
}
```

#### Features
- Creates new conversation if `conversationId` not provided
- Automatically generates conversation title after first exchange
- Maintains conversation context for coherent responses
- Updates conversation timestamp for proper ordering

---

### 2. Get User Conversations
**GET** `/api/chat/conversations`

Fetch all conversations for the authenticated user with pagination.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

#### Response
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "AI Development Discussion",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z",
      "messageCount": 12,
      "lastMessage": {
        "id": "uuid",
        "content": "Thank you for the explanation!",
        "role": "USER",
        "createdAt": "2024-01-15T11:45:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### Features
- Ordered by most recently updated
- Includes message count and last message preview
- Paginated results for performance

---

### 3. Get Conversation Messages
**GET** `/api/chat/conversations/:id/messages`

Fetch all messages for a specific conversation with pagination.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `id`: Conversation UUID

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

#### Response
```json
{
  "conversationId": "uuid",
  "conversationTitle": "AI Development Discussion",
  "messages": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "userId": "uuid",
      "content": "Hello, can you help me with AI development?",
      "role": "USER",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "conversationId": "uuid",
      "userId": "uuid",
      "content": "Absolutely! I'm Synergi, and I'd be happy to help with AI development...",
      "role": "ASSISTANT",
      "createdAt": "2024-01-15T10:30:01Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

#### Features
- Returns messages in chronological order
- Includes full conversation context
- Paginated for performance with large conversations

---

### 4. Delete Conversation
**DELETE** `/api/chat/conversations/:id`

Delete a conversation and all its messages.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Path Parameters
- `id`: Conversation UUID

#### Response
```json
{
  "message": "Conversation deleted successfully"
}
```

#### Features
- Cascade deletes all messages
- Only allows deletion of user's own conversations
- Returns 404 if conversation not found or doesn't belong to user

---

### 5. Health Check
**GET** `/api/chat/`

Simple health check endpoint.

#### Response
```json
{
  "message": "Chat API is working",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# Google Gemini AI
GEMINI_API_KEY="your-gemini-api-key-here"

# Email (Optional)
POSTMARK_SERVER_TOKEN="your-postmark-server-token"
FROM_EMAIL="noreply@yourdomain.com"

# Environment
NODE_ENV="development"
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Set Up Database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start the Server**
   ```bash
   npm run dev
   ```

## AI Integration (Synergi)

### System Context
Synergi is configured with a comprehensive system context that:
- Identifies itself as a Multi-Agent AI assistant
- Emphasizes collaboration and intelligent problem-solving
- Maintains consistency throughout conversations
- Provides contextually relevant responses

### Features
- **Conversation Context**: Maintains full conversation history for coherent responses
- **Automatic Titles**: Generates descriptive titles for conversations
- **Optimized Prompting**: Formats conversation history optimally for Gemini API
- **Error Handling**: Graceful handling of AI service errors

## Database Optimizations

### Indexing Strategy
- **User Conversations**: Indexed on `(userId, updatedAt)` for fast conversation listing
- **Conversation Messages**: Indexed on `(conversationId, createdAt)` for chronological message fetching
- **User Messages**: Indexed on `(userId, createdAt)` for user-specific queries

### Cascade Deletions
- Deleting a conversation automatically removes all associated messages
- Deleting a user removes all conversations and messages

### Data Types
- Message content uses `@db.Text` for storing long messages
- UUIDs for all primary keys for better distribution and security

## Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **User Isolation**: Users can only access their own conversations and messages
- **Input Validation**: Zod schemas validate all request data
- **Rate Limiting**: Built-in rate limiting middleware (configure as needed)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details when available"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Performance Considerations

- **Pagination**: All list endpoints support pagination
- **Database Indexes**: Optimized for common query patterns
- **Connection Pooling**: Prisma handles database connection pooling
- **Lazy Loading**: Messages are only loaded when specifically requested

## Future Enhancements

- Message editing and deletion
- Conversation sharing
- Message reactions/ratings
- Conversation export
- Real-time messaging with WebSocket support
- Message attachments and media support
