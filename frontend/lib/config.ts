// Configuration helper for environment variables
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // API endpoints
  endpoints: {
    auth: {
      me: '/api/auth/me',
      login: '/api/auth/login',
      signup: '/api/auth/signup',
    },
    chat: {
      send: '/api/chat/send',
      conversations: '/api/chat/conversations',
      agents: '/api/chat/agents',
      messages: (conversationId: string) => `/api/chat/conversations/${conversationId}/messages`,
      delete: (conversationId: string) => `/api/chat/conversations/${conversationId}`,
    }
  },
  
  // Helper function to get full URL
  getApiUrl: (endpoint: string) => `${config.apiUrl}${endpoint}`,
}

export default config
