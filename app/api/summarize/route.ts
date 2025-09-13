/**
 * API Route: Generate Summary
 * Handles meeting summary generation using Gemini API
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const { transcript, speakers, namedEntities, meetingContext } = await request.json();
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini service
    const geminiService = new GeminiService();

    // Generate meeting summary
    console.log('Generating meeting summary...');
    const summary = await geminiService.generateMeetingSummary({
      transcript,
      speakers,
      namedEntities,
      meetingContext,
    });
    
    return NextResponse.json({
      success: true,
      summary,
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: `Failed to generate summary: ${error}` },
      { status: 500 }
    );
  }
}

// Quick summary endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcript = searchParams.get('transcript');
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Initialize Gemini service
    const geminiService = new GeminiService();

    // Generate quick summary
    const quickSummary = await geminiService.generateQuickSummary(transcript);
    
    return NextResponse.json({
      success: true,
      quickSummary,
    });

  } catch (error) {
    console.error('Error generating quick summary:', error);
    return NextResponse.json(
      { error: `Failed to generate quick summary: ${error}` },
      { status: 500 }
    );
  }
}
