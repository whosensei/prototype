/**
 * Gladia API Service
 * Handles audio upload, transcription initiation, and result retrieval
 */

import axios from 'axios';
import FormData from 'form-data';
import { config } from '@/config/env';

export interface GladiaUploadResponse {
  audio_url: string;
  audio_metadata: {
    duration: number;
    format: string;
    size: number;
  };
}

export interface GladiaTranscriptionRequest {
  audio_url: string;
  diarization: boolean;
  named_entity_recognition: boolean;
  language_behavior?: 'manual' | 'automatic';
  language?: string;
}

export interface GladiaTranscriptionInitResponse {
  id: string;
  request_id?: string;
  result_url?: string;
  status: 'queued' | 'processing' | 'done' | 'error';
}

export interface Speaker {
  speaker: string;
  time_begin: number;
  time_end: number;
}

export interface TranscriptionSegment {
  language: string;
  time_begin: number;
  time_end: number;
  transcription: string;
  confidence: number;
  speaker?: string;
}

export interface NamedEntity {
  entity: string;
  type: string;
  confidence: number;
  start_time: number;
  end_time: number;
}

export interface GladiaTranscriptionResult {
  id: string;
  request_id: string;
  status: 'done' | 'error' | 'processing' | 'queued';
  result: {
    transcription: {
      full_transcript: string;
      utterances: TranscriptionSegment[];
    };
    speakers: Speaker[];
    named_entities?: NamedEntity[];
    metadata: {
      audio_duration: number;
      number_of_distinct_speakers: number;
    };
  };
  error?: string;
}

export interface GladiaTranscriptionListItem {
  id: string;
  request_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  created_at: string;
  updated_at: string;
}

export class GladiaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.gladia.apiKey;
    this.baseUrl = config.gladia.baseUrl;
    
    if (!this.apiKey) {
      throw new Error('Gladia API key is required');
    }
  }

  private getHeaders() {
    return {
      'X-Gladia-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Upload audio file to Gladia
   * https://docs.gladia.io/api-reference/v2/upload/audio-file
   */
  async uploadAudio(audioBlob: Blob, filename: string): Promise<GladiaUploadResponse> {
    try {
      console.log("upload audio called")
      const formData = new FormData();
      
      // Convert Blob to Buffer for Node.js environment
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Append buffer with proper stream interface for form-data package
      formData.append('audio', buffer, {
        filename: filename,
        contentType: 'audio/wav',
      });

      const response = await axios.post(
        `${this.baseUrl}/upload`,
        formData,
        {
          headers: {
            'X-Gladia-Key': this.apiKey,
            ...formData.getHeaders(),
          },
        }
      );

      console.log(response.data)

      return response.data;
    } catch (error) {
      console.error('Error uploading audio to Gladia:', error);
      throw new Error(`Failed to upload audio: ${error}`);
    }
  }

  /**
   * Initiate pre-recorded audio transcription
   * https://docs.gladia.io/api-reference/v2/pre-recorded/init
   */
  async initiateTranscription(request: GladiaTranscriptionRequest): Promise<GladiaTranscriptionInitResponse> {
    try {

      console.log("inititate transcription called")

      const response = await axios.post(
        `${this.baseUrl}/pre-recorded`,
        request,
        {
          headers: this.getHeaders(),
        }
      );

      console.log(response.data)

      return response.data;
    } catch (error) {
      console.error('Error initiating transcription:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response: { status: number; data: unknown } };
        console.error('Response status:', axiosError.response.status);
        console.error('Response data:', axiosError.response.data);
        console.error('Request data sent:', request);
        throw new Error(`Gladia API error (${axiosError.response.status}): ${JSON.stringify(axiosError.response.data)}`);
      }
      throw new Error(`Failed to initiate transcription: ${error}`);
    }
  }

  /**
   * Get transcription result
   * https://docs.gladia.io/api-reference/v2/pre-recorded/get
   */
  async getTranscriptionResult(requestId: string): Promise<GladiaTranscriptionResult> {
    try {
      console.log("get transcription called")
      console.log("Request ID:", requestId)
      
      // Try the ID-based endpoint first
      const response = await axios.get(
        `${this.baseUrl}/pre-recorded/${requestId}`,
        {
          headers: this.getHeaders(),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error getting transcription result:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response: { status: number; data: unknown } };
        console.error('Response status:', axiosError.response.status);
        console.error('Response data:', axiosError.response.data);
      }
      throw new Error(`Failed to get transcription result: ${error}`);
    }
  }

  /**
   * List all pre-recorded transcripts
   * https://docs.gladia.io/api-reference/v2/pre-recorded/list
   */
  async listTranscriptions(): Promise<GladiaTranscriptionListItem[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pre-recorded`,
        {
          headers: this.getHeaders(),
        }
      );
      console.log(response)

      if (!response.data.transcriptions) {
        throw new Error('Gladia API returned invalid response format - missing transcriptions array');
      }
      return response.data.transcriptions;
    } catch (error) {
      console.error('Error listing transcriptions:', error);
      throw new Error(`Failed to list transcriptions: ${error}`);
    }
  }

  /**
   * Poll for transcription completion
   */
  async waitForTranscription(requestId: string, maxAttempts: number = 60, intervalMs: number = 5000): Promise<GladiaTranscriptionResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const result = await this.getTranscriptionResult(requestId);
      
      if (result.status === 'done') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    
    throw new Error('Transcription timeout - took too long to complete');
  }
}
