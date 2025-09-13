/**
 * Web Audio API based WAV recorder
 * Records lossless WAV audio without using MediaRecorder as specified
 */

export interface AudioRecorderOptions {
  sampleRate?: number;
  channelCount?: number;
  bitDepth?: number;
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private audioBuffer: Float32Array[] = [];
  private isRecording = false;
  private isPaused = false;
  private sampleRate: number;
  private channelCount: number;
  private bitDepth: number;

  constructor(options: AudioRecorderOptions = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.channelCount = options.channelCount || 2;
    this.bitDepth = options.bitDepth || 16;
  }

  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: this.channelCount,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.sampleRate,
      });

      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio data capture
      this.processorNode = this.audioContext.createScriptProcessor(4096, this.channelCount, this.channelCount);

      // Set up audio processing
      this.processorNode.onaudioprocess = (event) => {
        if (this.isRecording && !this.isPaused) {
          const inputBuffer = event.inputBuffer;
          const audioData = new Float32Array(inputBuffer.length * inputBuffer.numberOfChannels);
          
          // Interleave channels
          for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
            const channelData = inputBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
              audioData[i * inputBuffer.numberOfChannels + channel] = channelData[i];
            }
          }
          
          this.audioBuffer.push(audioData);
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
    } catch (error) {
      throw new Error(`Failed to initialize audio recorder: ${error}`);
    }
  }

  startRecording(): void {
    if (!this.audioContext || !this.processorNode) {
      throw new Error('Audio recorder not initialized');
    }

    this.audioBuffer = [];
    this.isRecording = true;
    this.isPaused = false;
  }

  pauseRecording(): void {
    this.isPaused = true;
  }

  resumeRecording(): void {
    this.isPaused = false;
  }

  stopRecording(): Blob {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    this.isPaused = false;

    // Convert audio buffer to WAV
    const wavBlob = this.createWAVBlob();
    this.audioBuffer = [];

    return wavBlob;
  }

  private createWAVBlob(): Blob {
    const totalSamples = this.audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0);
    const arrayBuffer = new ArrayBuffer(44 + totalSamples * 2); // WAV header + 16-bit samples
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true); // File size
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1 size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, this.channelCount, true); // Number of channels
    view.setUint32(24, this.sampleRate, true); // Sample rate
    view.setUint32(28, this.sampleRate * this.channelCount * 2, true); // Byte rate
    view.setUint16(32, this.channelCount * 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, totalSamples * 2, true); // Subchunk2 size

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (const buffer of this.audioBuffer) {
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.max(-1, Math.min(1, buffer[i]));
        const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, pcmSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  getRecordingState(): { isRecording: boolean; isPaused: boolean } {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
    };
  }

  cleanup(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.audioBuffer = [];
    this.isRecording = false;
    this.isPaused = false;
  }
}
