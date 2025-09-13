'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MessageSquare, Brain } from 'lucide-react';
import { GladiaTranscriptionResult, TranscriptionSegment } from '@/lib/gladia-service';
import { MeetingSummary } from '@/lib/gemini-service';

interface TranscriptDisplayProps {
  transcription: GladiaTranscriptionResult | null;
  summary: MeetingSummary | null;
  isLoading?: boolean;
}

export function TranscriptDisplay({ transcription, summary, isLoading }: TranscriptDisplayProps) {
  const formatTime = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    
    // Simple hash function to assign consistent colors
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Group consecutive utterances by the same speaker
  const groupUtterancesBySpeaker = () => {
    if (!transcription?.result?.transcription?.utterances) {
      console.log('No utterances found in transcription data');
      return [];
    }
    
    const utterances = transcription.result.transcription.utterances;
    console.log('Total utterances:', utterances.length);
    
    const groups: Array<{
      speaker: string | undefined;
      time_begin: number;
      time_end: number;
      text: string;
    }> = [];
    
    for (let i = 0; i < utterances.length; i++) {
      const current = utterances[i];
      const previous = groups[groups.length - 1];
      
      // Try multiple possible field names for the transcribed text
      const utteranceData = current as TranscriptionSegment & { text?: string; transcript?: string };
      const text = current.transcription || utteranceData.text || utteranceData.transcript || '';
      
      // Enhanced debug logging for the first few utterances
      if (i < 3) {
        console.log(`Utterance ${i}:`, {
          speaker: current.speaker,
          transcription: current.transcription,
          text: utteranceData.text,
          transcript: utteranceData.transcript,
          extractedText: text,
          fullUtterance: current
        });
      }
      
      // If no previous group or different speaker, create new group
      if (!previous || previous.speaker !== current.speaker) {
        groups.push({
          speaker: current.speaker,
          time_begin: current.time_begin,
          time_end: current.time_end,
          text: text,
        });
      } else {
        // Same speaker, merge with previous group
        previous.time_end = current.time_end;
        previous.text = previous.text ? `${previous.text} ${text}` : text;
      }
    }
    
    console.log('Grouped utterances:', groups.map(g => ({
      speaker: g.speaker,
      textLength: g.text.length,
      text: g.text.substring(0, 50) + '...'
    })));
    
    return groups;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Processing transcription...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transcription) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No transcription data</p>
          <p className="text-sm">Record audio and complete transcription to view results here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meeting Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Meeting Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{summary.title}</h3>
              <p className="text-muted-foreground mb-4">{summary.overview}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Key Points</h4>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Action Items</h4>
                <ul className="space-y-1">
                  {summary.actionItems.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {summary.decisions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Decisions Made</h4>
                <ul className="space-y-1">
                  {summary.decisions.map((decision, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {summary.duration}
              </Badge>
              <Badge variant="outline">
                <User className="h-3 w-3 mr-1" />
                {summary.participants.length} participants
              </Badge>
              {summary.sentiment && (
                <Badge 
                  variant="outline" 
                  className={
                    summary.sentiment === 'positive' ? 'text-green-600' :
                    summary.sentiment === 'negative' ? 'text-red-600' : 
                    'text-yellow-600'
                  }
                >
                  {summary.sentiment} sentiment
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcription Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Full Transcript
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Duration: {Math.round(transcription.result.metadata.audio_duration)}s</span>
            <span>•</span>
            <span>Speakers: {transcription.result.metadata.number_of_distinct_speakers}</span>
            <span>•</span>
            <span>Status: {transcription.status}</span>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-6">
              {groupUtterancesBySpeaker().map((group, index) => {
                const speakerLabel = group.speaker || 'Unknown Speaker';
                
                return (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getSpeakerColor(speakerLabel)} variant="default">
                        {speakerLabel}
                      </Badge>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-l-4 border-l-blue-500">
                      <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {group.text || '[No text content]'}
                      </p>
                      {/* Debug info - remove after fixing */}
                      {!group.text && (
                        <p className="text-xs text-red-500 mt-2">
                          Debug: Empty text for speaker {speakerLabel}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Named Entities */}
      {transcription.result.named_entities && transcription.result.named_entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Named Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {transcription.result.named_entities.map((entity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {entity.entity} ({entity.type})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Transcript Text */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 w-full">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {transcription.result.transcription.full_transcript || '[No full transcript available]'}
            </p>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
