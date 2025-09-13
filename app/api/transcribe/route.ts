/**
 * API Route: Transcribe Audio
 * Handles audio transcription using Gladia API
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { GladiaService } from '@/lib/gladia-service';
import { config } from '@/config/env';

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Read the audio file from local storage
    const filePath = path.join(config.app.audioStoragePath, filename);
    const audioBuffer = await readFile(filePath);
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });

    // Initialize Gladia service
    const gladiaService = new GladiaService();

    // Upload audio to Gladia
    console.log('Uploading audio to Gladia...');
    const uploadResponse = await gladiaService.uploadAudio(audioBlob, filename);
    console.log('Upload response:', JSON.stringify(uploadResponse, null, 2));
    
    // Initiate transcription with diarization and entity recognition
    console.log('Initiating transcription...');
    // Try minimal request first to avoid parameter issues
    const transcriptionRequest = {
      audio_url: uploadResponse.audio_url,
      diarization: true,
      named_entity_recognition: true,
    };
    
    console.log('Sending transcription request:', JSON.stringify(transcriptionRequest, null, 2));
    
    const initResponse = await gladiaService.initiateTranscription(transcriptionRequest);

    console.log("initiate transcription successful")
    console.log("Full init response:", JSON.stringify(initResponse, null, 2));
    
    // Use the correct ID field from the response
    const transcriptionId = initResponse.id || initResponse.request_id;
    
    if (!transcriptionId) {
      throw new Error('No transcription ID found in Gladia response');
    }
    
    return NextResponse.json({
      success: true,
      requestId: transcriptionId,
      status: initResponse.status,
      audioMetadata: uploadResponse.audio_metadata,
      fullResponse: initResponse, // Include full response for debugging
    });

  } catch (error) {
    console.error('Error initiating transcription:', error);
    return NextResponse.json(
      { error: `Failed to initiate transcription: ${error}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/transcribe called');
    console.log('Request URL:', request.url);
    
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    console.log('Extracted requestId:', requestId);
    console.log('All search params:', Object.fromEntries(searchParams.entries()));
    
    if (!requestId) {
      console.log('No requestId found in search params');
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Initialize Gladia service
    const gladiaService = new GladiaService();

    // Get transcription result
    const result = await gladiaService.getTranscriptionResult(requestId);
    
    console.log("get transcription successful")

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    console.error('Error getting transcription result:', error);
    return NextResponse.json(
      { error: `Failed to get transcription result: ${error}` },
      { status: 500 }
    );
  }
}
