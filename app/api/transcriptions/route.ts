/**
 * API Route: List Transcriptions
 * Handles listing all transcriptions from Gladia API
 */

import { NextResponse } from 'next/server';
import { GladiaService } from '@/lib/gladia-service';

export async function GET() {
  try {
    // Initialize Gladia service
    const gladiaService = new GladiaService();

    // Get list of transcriptions
    const transcriptions = await gladiaService.listTranscriptions();
    
    return NextResponse.json({
      success: true,
      transcriptions,
    });

  } catch (error) {
    console.error('Error listing transcriptions:', error);
    return NextResponse.json(
      { error: `Failed to list transcriptions: ${error}` },
      { status: 500 }
    );
  }
}
