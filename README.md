# Audio Transcription & Meeting Summary App

An intelligent audio recording application that provides AI-powered transcription with speaker diarization and generates comprehensive meeting summaries using Gladia and Google Gemini APIs.

## Features

- **Lossless Audio Recording**: Records high-quality WAV audio using Web Audio API (no MediaRecorder)
- **AI Transcription**: Powered by Gladia API with speaker diarization and named entity recognition
- **Meeting Summaries**: Intelligent summaries generated using Google Gemini AI
- **Beautiful UI**: Modern, responsive interface built with Next.js and Shadcn UI
- **Real-time Processing**: Live recording controls with pause/resume functionality
- **Transcript Management**: Sidebar showing all previous transcriptions
- **Local Storage**: Audio files saved locally for privacy and reliability

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd prototype
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Gladia API Configuration
GLADIA_API_KEY=your_gladia_api_key_here
GLADIA_BASE_URL=https://api.gladia.io/v2

# Google Gemini API Configuration  
GEMINI_API_KEY=your_gemini_api_key_here

# Application Configuration
AUDIO_STORAGE_PATH=./audio-recordings
```

### 3. Get API Keys

**Gladia API Key:**
- Visit [Gladia.io](https://gladia.io)
- Sign up for an account
- Navigate to your dashboard to get your API key

**Google Gemini API Key:**
- Go to [Google AI Studio](https://aistudio.google.com)
- Create a new project or select existing one
- Generate an API key for Gemini

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## How It Works

1. **Record Audio**: Click "Start Recording" to begin capturing lossless WAV audio
2. **Upload & Process**: Audio is saved locally and uploaded to Gladia for processing
3. **Transcription**: Gladia provides transcription with speaker diarization and entity detection
4. **Summary Generation**: Transcript is sent to Gemini AI for intelligent meeting summary
5. **View Results**: See transcripts with speaker identification and comprehensive summaries

## Project Structure

```
├── app/
│   ├── api/                 # Backend API routes
│   │   ├── upload-audio/    # Audio file upload
│   │   ├── transcribe/      # Gladia transcription
│   │   ├── summarize/       # Gemini summary generation
│   │   └── transcriptions/  # List all transcriptions
│   ├── page.tsx            # Main application page
│   └── layout.tsx          # App layout with providers
├── components/
│   ├── audio-recorder-component.tsx  # Recording interface
│   ├── transcript-display.tsx        # Transcript & summary display
│   ├── transcription-sidebar.tsx     # Transcript history sidebar
│   └── ui/                          # Shadcn UI components
├── lib/
│   ├── audio-recorder.ts    # Web Audio API implementation
│   ├── gladia-service.ts    # Gladia API integration
│   └── gemini-service.ts    # Gemini AI integration
├── config/
│   └── env.ts              # Environment configuration
└── audio-recordings/       # Local audio storage directory
```

## API Integration

### Gladia API Features Used
- Audio file upload
- Pre-recorded transcription with diarization
- Named entity recognition
- Transcription status polling
- Transcript listing

### Gemini AI Features Used
- Meeting summary generation
- Key points extraction
- Action items identification
- Participant analysis
- Sentiment analysis

## Technical Specifications

- **Frontend**: Next.js 15 with TypeScript
- **UI Components**: Shadcn UI with Tailwind CSS
- **Audio Recording**: Web Audio API (lossless WAV format)
- **Backend**: Next.js API routes (serverless functions)
- **AI Services**: Gladia API for transcription, Google Gemini for summaries
- **Storage**: Local file system for audio recordings

## Browser Requirements

- Modern browser with Web Audio API support
- Microphone access permissions
- JavaScript enabled

## Troubleshooting

**Microphone Access Issues:**
- Ensure browser has microphone permissions
- Check system audio settings
- Try refreshing the page

**API Errors:**
- Verify API keys are correctly set in `.env.local`
- Check API key permissions and quotas
- Ensure network connectivity

**Audio Quality Issues:**
- Use a good quality microphone
- Record in a quiet environment
- Ensure stable internet connection for upload
