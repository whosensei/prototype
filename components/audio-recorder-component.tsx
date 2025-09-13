"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Pause, Play, Upload, Trash2 } from "lucide-react"
import { AudioRecorder } from "@/lib/audio-recorder"

interface AudioRecorderComponentProps {
  onRecordingComplete: (audioBlob: Blob, filename: string) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
}

export function AudioRecorderComponent({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
}: AudioRecorderComponentProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; filename: string } | null>(null)

  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize audio recorder
    const initializeRecorder = async () => {
      try {
        const recorder = new AudioRecorder({
          sampleRate: 44100,
          channelCount: 2,
          bitDepth: 16,
        })

        await recorder.initialize()
        audioRecorderRef.current = recorder
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        setError(`Failed to initialize audio recorder: ${err}`)
        console.error("Audio recorder initialization error:", err)
      }
    }

    initializeRecorder()

    // Cleanup on unmount
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Update timer when recording
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording, isPaused])

  const startRecording = async () => {
    if (!audioRecorderRef.current || !isInitialized) {
      setError("Audio recorder not initialized")
      return
    }

    try {
      audioRecorderRef.current.startRecording()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      setError(null)
      onRecordingStart?.()
    } catch (err) {
      setError(`Failed to start recording: ${err}`)
      console.error("Start recording error:", err)
    }
  }

  const pauseRecording = () => {
    if (!audioRecorderRef.current) return

    try {
      if (isPaused) {
        audioRecorderRef.current.resumeRecording()
        setIsPaused(false)
      } else {
        audioRecorderRef.current.pauseRecording()
        setIsPaused(true)
      }
    } catch (err) {
      setError(`Failed to pause/resume recording: ${err}`)
      console.error("Pause recording error:", err)
    }
  }

  const stopRecording = async () => {
    if (!audioRecorderRef.current) return

    try {
      const audioBlob = audioRecorderRef.current.stopRecording()
      setIsRecording(false)
      setIsPaused(false)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `recording_${timestamp}.wav`

      // Store the recording for later upload
      setRecordedAudio({ blob: audioBlob, filename })
      onRecordingStop?.()

      // Don't reset timer here - keep the recorded time displayed
    } catch (err) {
      setError(`Failed to stop recording: ${err}`)
      console.error("Stop recording error:", err)
    }
  }

  const handleUploadAndTranscribe = () => {
    if (recordedAudio) {
      onRecordingComplete(recordedAudio.blob, recordedAudio.filename)
      setRecordedAudio(null) // Clear the stored recording
      setRecordingTime(0) // Reset timer when uploading
    }
  }

  const handleDiscardRecording = () => {
    setRecordedAudio(null)
    setRecordingTime(0) // Reset timer when discarding
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getRecordingStatus = () => {
    if (recordedAudio) return "Recording completed - Ready to upload"
    if (!isRecording) return "Ready to record"
    if (isPaused) return "Paused"
    return "Recording..."
  }

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
          </div>
        )}

        {!isInitialized && !error && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700">Initializing recorder...</span>
            </div>
          </div>
        )}

        {/* Recording Interface */}
        <div className="text-center space-y-6">
          {/* Timer Display */}
          <div className="space-y-4">
            <div className="text-5xl font-mono font-bold text-primary">
              {formatTime(recordingTime)}
            </div>
            
            {/* Status Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full border">
              <div className={`w-2 h-2 rounded-full ${
                recordedAudio 
                  ? "bg-green-500" 
                  : isRecording 
                    ? (isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse") 
                    : "bg-gray-400"
              }`} />
              <span className="text-sm font-medium text-foreground">
                {getRecordingStatus()}
              </span>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center items-center">
            {recordedAudio ? (
              /* Recording completed - show main action button */
              <div className="flex items-center gap-6">
                <button
                  onClick={handleUploadAndTranscribe}
                  className="btn-minimal flex items-center gap-3 px-8 py-4 text-lg"
                >
                  <Upload className="h-5 w-5" />
                  Upload & Transcribe
                </button>
                
                <button
                  onClick={handleDiscardRecording}
                  className="btn-outline flex items-center gap-3 px-6 py-4"
                >
                  <Trash2 className="h-5 w-5" />
                  Discard
                </button>
              </div>
            ) : !isRecording ? (
              /* Ready to start recording - show circular mic button */
              <button
                onClick={startRecording}
                disabled={!isInitialized}
                className={`btn-record ${!isInitialized ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mic className="h-8 w-8 btn-record-icon" />
              </button>
            ) : (
              /* Currently recording - show control buttons */
              <div className="flex items-center gap-6">
                <button
                  onClick={pauseRecording}
                  className={`btn-record ${isPaused ? 'paused' : ''}`}
                >
                  {isPaused ? (
                    <Play className="h-8 w-8 btn-record-icon" />
                  ) : (
                    <Pause className="h-8 w-8 btn-record-icon" />
                  )}
                </button>

                <button
                  onClick={stopRecording}
                  className="btn-record recording"
                >
                  <Square className="h-8 w-8 btn-record-icon" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Visualization */}
        {isRecording && !isPaused && (
          <div className="flex justify-center items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-6 bg-primary rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="card-minimal">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {recordedAudio ? "Recording Complete" : "Audio Recorder"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {recordedAudio 
                ? "Your audio is ready for transcription and analysis"
                : "High-quality audio recording with speaker separation"
              }
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {recordedAudio ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium text-green-800">Ready for processing</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-blue-800">WAV format</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-blue-800">44.1kHz quality</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-blue-800">Pause/resume</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-blue-800">Real-time timer</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-blue-800">Speaker detection</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
