/**
 * Google Gemini API Service
 * Handles meeting summary generation from transcripts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@/config/env';

export interface MeetingSummaryRequest {
  transcript: string;
  speakers?: Array<{
    speaker: string;
    time_begin: number;
    time_end: number;
  }>;
  namedEntities?: Array<{
    entity: string;
    type: string;
    confidence: number;
  }>;
  meetingContext?: string;
}

export interface MeetingSummary {
  title: string;
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  participants: string[];
  topics: string[];
  duration: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  nextSteps?: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = config.gemini.apiKey;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Generate a comprehensive meeting summary from transcript
   */
  async generateMeetingSummary(request: MeetingSummaryRequest): Promise<MeetingSummary> {
    try {
      const prompt = this.buildSummaryPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the structured response
      return this.parseGeminiResponse(text, request);
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      throw new Error(`Failed to generate meeting summary: ${error}`);
    }
  }

  /**
   * Build the prompt for Gemini to generate meeting summary
   */
  private buildSummaryPrompt(request: MeetingSummaryRequest): string {
    const { transcript, speakers, namedEntities, meetingContext } = request;

    let prompt = `
You are an expert meeting analyst. Please analyze the following meeting transcript and provide a comprehensive summary in JSON format.

**Meeting Transcript:**
${transcript}
`;

    if (speakers && speakers.length > 0) {
      prompt += `\n**Speakers Information:**\n`;
      speakers.forEach(speaker => {
        prompt += `- ${speaker.speaker}: ${speaker.time_begin}s - ${speaker.time_end}s\n`;
      });
    }

    if (namedEntities && namedEntities.length > 0) {
      prompt += `\n**Named Entities Detected:**\n`;
      namedEntities.forEach(entity => {
        prompt += `- ${entity.entity} (${entity.type}) - Confidence: ${entity.confidence}\n`;
      });
    }

    if (meetingContext) {
      prompt += `\n**Meeting Context:** ${meetingContext}\n`;
    }

    prompt += `
Please provide a comprehensive analysis in the following JSON structure:

{
  "title": "A concise, descriptive title for the meeting",
  "overview": "A 2-3 sentence summary of the meeting's main purpose and outcomes",
  "keyPoints": ["Array of main discussion points and important topics covered"],
  "actionItems": ["Array of specific tasks, assignments, or follow-ups mentioned"],
  "decisions": ["Array of decisions made during the meeting"],
  "participants": ["Array of identified participants/speakers"],
  "topics": ["Array of main topics/themes discussed"],
  "duration": "Estimated meeting duration based on transcript",
  "sentiment": "Overall meeting sentiment: positive, neutral, or negative",
  "nextSteps": ["Array of planned next steps or future actions"]
}

Guidelines:
- Be concise but comprehensive
- Focus on actionable items and key decisions
- Identify all participants mentioned
- Extract concrete next steps and deadlines if mentioned
- Assess the overall tone and productivity of the meeting
- Use clear, professional language
- Ensure all JSON fields are properly formatted

Respond ONLY with valid JSON, no additional text or formatting.
`;

    return prompt;
  }

  /**
   * Parse Gemini's response into structured summary
   */
  private parseGeminiResponse(response: string, request: MeetingSummaryRequest): MeetingSummary {
    try {
      // Clean up the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove any markdown formatting
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate required fields - throw error if missing
      if (!parsed.title || !parsed.overview) {
        throw new Error('AI response missing required fields: title or overview');
      }
      
      if (!Array.isArray(parsed.keyPoints) || !Array.isArray(parsed.actionItems)) {
        throw new Error('AI response has invalid format for keyPoints or actionItems');
      }

      return {
        title: parsed.title,
        overview: parsed.overview,
        keyPoints: parsed.keyPoints,
        actionItems: parsed.actionItems,
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        participants: Array.isArray(parsed.participants) ? parsed.participants : this.extractParticipants(request.speakers),
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        duration: parsed.duration,
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : null,
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
    }
  }

  /**
   * Extract participant names from speakers data
   */
  private extractParticipants(speakers?: Array<{ speaker: string }>): string[] {
    if (!speakers) return [];
    
    const uniqueSpeakers = new Set(speakers.map(s => s.speaker));
    return Array.from(uniqueSpeakers);
  }


  /**
   * Generate a quick summary for display purposes
   */
  async generateQuickSummary(transcript: string): Promise<string> {
    try {
      const prompt = `
Provide a brief 2-3 sentence summary of this meeting transcript:

${transcript}

Focus on the main topic and key outcomes. Be concise and clear.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating quick summary:', error);
      throw new Error(`Failed to generate quick summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
