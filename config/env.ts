// Environment configuration
export const config = {
  gladia: {
    apiKey: process.env.GLADIA_API_KEY || '',
    baseUrl: process.env.GLADIA_BASE_URL || 'https://api.gladia.io/v2',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  app: {
    audioStoragePath: process.env.AUDIO_STORAGE_PATH || './audio-recordings',
  },
} as const;
