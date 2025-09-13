'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Upload, Trash2 } from 'lucide-react';
import { AudioRecorder } from '@/lib/audio-recorder';

interface AudioRecorderComponentProps {
  onRecordingComplete: (audioBlob: Blob, filename: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function AudioRecorderComponent({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
}: AudioRecorderComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; filename: string } | null>(null);
  
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize audio recorder
    const initializeRecorder = async () => {
      try {
        const recorder = new AudioRecorder({
          sampleRate: 44100,
          channelCount: 2,
          bitDepth: 16,
        });
        
        await recorder.initialize();
        audioRecorderRef.current = recorder;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError(`Failed to initialize audio recorder: ${err}`);
        console.error('Audio recorder initialization error:', err);
      }
    };

    initializeRecorder();

    // Cleanup on unmount
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Update timer when recording
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    if (!audioRecorderRef.current || !isInitialized) {
      setError('Audio recorder not initialized');
      return;
    }

    try {
      audioRecorderRef.current.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setError(null);
      onRecordingStart?.();
    } catch (err) {
      setError(`Failed to start recording: ${err}`);
      console.error('Start recording error:', err);
    }
  };

  const pauseRecording = () => {
    if (!audioRecorderRef.current) return;

    try {
      if (isPaused) {
        audioRecorderRef.current.resumeRecording();
        setIsPaused(false);
      } else {
        audioRecorderRef.current.pauseRecording();
        setIsPaused(true);
      }
    } catch (err) {
      setError(`Failed to pause/resume recording: ${err}`);
      console.error('Pause recording error:', err);
    }
  };

  const stopRecording = async () => {
    if (!audioRecorderRef.current) return;

    try {
      const audioBlob = audioRecorderRef.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording_${timestamp}.wav`;
      
      // Store the recording for later upload
      setRecordedAudio({ blob: audioBlob, filename });
      onRecordingStop?.();
      
      // Reset timer
      setRecordingTime(0);
    } catch (err) {
      setError(`Failed to stop recording: ${err}`);
      console.error('Stop recording error:', err);
    }
  };

  const handleUploadAndTranscribe = () => {
    if (recordedAudio) {
      onRecordingComplete(recordedAudio.blob, recordedAudio.filename);
      setRecordedAudio(null); // Clear the stored recording
    }
  };

  const handleDiscardRecording = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingStatus = () => {
    if (recordedAudio) return 'Recording completed - Ready to upload';
    if (!isRecording) return 'Ready to record';
    if (isPaused) return 'Paused';
    return 'Recording...';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Audio Recorder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {!isInitialized && !error && (
          <div className="p-4 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
            Initializing audio recorder...
          </div>
        )}

        {/* Recording Status */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-mono font-bold text-primary">
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {getRecordingStatus()}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex justify-center gap-4">
          {recordedAudio ? (
            /* Recording completed - show upload and discard options */
            <>
              <Button
                onClick={handleUploadAndTranscribe}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload and Transcribe
              </Button>
              <Button
                onClick={handleDiscardRecording}
                variant="outline"
                size="lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard
              </Button>
            </>
          ) : !isRecording ? (
            /* Ready to start recording */
            <Button
              onClick={startRecording}
              disabled={!isInitialized}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            /* Currently recording - show pause and stop */
            <>
              <Button
                onClick={pauseRecording}
                variant="outline"
                size="lg"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm text-muted-foreground">
              {isPaused ? 'Recording paused' : 'Recording in progress'}
            </span>
          </div>
        )}

        {/* Recording Completed Indicator */}
        {recordedAudio && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">
              Recording completed ({recordedAudio.filename})
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          {recordedAudio ? (
            <>
              <p>• Click &quot;Upload and Transcribe&quot; to process your recording</p>
              <p>• Click &quot;Discard&quot; to delete and start over</p>
            </>
          ) : (
            <>
              <p>• Click &quot;Start Recording&quot; to begin capturing audio</p>
              <p>• Use &quot;Pause/Resume&quot; to control recording</p>
              <p>• Click &quot;Stop&quot; to finish recording</p>
              <p>• Audio is recorded in lossless WAV format</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
