/**
 * API Route: Upload Audio
 * Handles audio file upload and saves to local storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { config } from '@/config/env';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!audioFile.type.includes('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only audio files are allowed.' },
        { status: 400 }
      );
    }

    // Create unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording_${timestamp}.wav`;
    
    // Ensure audio recordings directory exists
    const audioDir = path.resolve(config.app.audioStoragePath);
    await mkdir(audioDir, { recursive: true });
    
    // Save file to local storage
    const filePath = path.join(audioDir, filename);
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Return file information
    return NextResponse.json({
      success: true,
      filename,
      filepath: filePath,
      size: audioFile.size,
      type: audioFile.type,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio file' },
      { status: 500 }
    );
  }
}
