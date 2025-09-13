"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, User, MessageSquare } from "lucide-react"
import type { GladiaTranscriptionResult, TranscriptionSegment } from "@/lib/gladia-service"
import type { MeetingSummary } from "@/lib/gemini-service"

interface TabbedTranscriptDisplayProps {
  transcription: GladiaTranscriptionResult | null
  summary: MeetingSummary | null
  isLoading?: boolean
}

export function TabbedTranscriptDisplay({ transcription, summary, isLoading }: TabbedTranscriptDisplayProps) {
  const formatTime = (seconds: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return "00:00"
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      "bg-purple-100 text-purple-800",
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
    ]

    let hash = 0
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Group consecutive utterances by the same speaker
  const groupUtterancesBySpeaker = () => {
    if (!transcription?.result?.transcription?.utterances) {
      console.log("No utterances found in transcription data")
      return []
    }

    const utterances = transcription.result.transcription.utterances
    console.log("Total utterances:", utterances.length)

    const groups: Array<{
      speaker: string | undefined
      time_begin: number
      time_end: number
      text: string
    }> = []

    for (let i = 0; i < utterances.length; i++) {
      const current = utterances[i]
      const previous = groups[groups.length - 1]

      // Try multiple possible field names for the transcribed text
      const utteranceData = current as TranscriptionSegment & { text?: string; transcript?: string }
      const text = current.transcription || utteranceData.text || utteranceData.transcript || ""

      // Enhanced debug logging for the first few utterances
      if (i < 3) {
        console.log(`Utterance ${i}:`, {
          speaker: current.speaker,
          transcription: current.transcription,
          text: utteranceData.text,
          transcript: utteranceData.transcript,
          extractedText: text,
          fullUtterance: current,
        })
      }

      // If no previous group or different speaker, create new group
      if (!previous || previous.speaker !== current.speaker) {
        groups.push({
          speaker: current.speaker,
          time_begin: current.time_begin,
          time_end: current.time_end,
          text: text,
        })
      } else {
        // Same speaker, merge with previous group
        previous.time_end = current.time_end
        previous.text = previous.text ? `${previous.text} ${text}` : text
      }
    }

    console.log(
      "Grouped utterances:",
      groups.map((g) => ({
        speaker: g.speaker,
        textLength: g.text.length,
        text: g.text.substring(0, 50) + "...",
      })),
    )

    return groups
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Processing transcription...</h3>
            <p className="text-muted-foreground text-sm">This may take a few moments</p>
          </div>
        </div>
      </div>
    )
  }

  if (!transcription && !summary) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">No transcription yet</h3>
            <p className="text-muted-foreground">
              Record audio and complete transcription to view your results here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="summary" className="h-full flex flex-col">
        <div className="border-b border-border bg-card">
          <div className="p-4">
            <div className="flex justify-center">
              <TabsList className="tabs-blue-modern grid grid-cols-3 w-auto">
                <TabsTrigger
                  value="summary"
                  className="tab-blue-trigger"
                >
                  Summary
                </TabsTrigger>
                <TabsTrigger
                  value="transcription"
                  className="tab-blue-trigger"
                >
                  Transcription
                </TabsTrigger>
                <TabsTrigger
                  value="full-transcription"
                  className="tab-blue-trigger"
                >
                  Full Text
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="summary" className="mt-0 h-full">
            {summary ? (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-8">
                  {/* Header Section */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-foreground">{summary.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{summary.overview}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3">
                    <div className="px-3 py-2 bg-muted rounded-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">{summary.duration}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-muted rounded-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{summary.participants.length} participants</span>
                      </div>
                    </div>
                    {summary.sentiment && (
                      <div className="px-3 py-2 bg-muted rounded-lg border">
                        <div className={`flex items-center gap-2 text-sm ${
                          summary.sentiment === "positive"
                            ? "text-green-600"
                            : summary.sentiment === "negative"
                              ? "text-red-600"
                              : "text-yellow-600"
                        }`}>
                          <span className="font-medium capitalize">{summary.sentiment} sentiment</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Key Points */}
                    <div className="card-minimal">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Key Points</h4>
                      <div className="space-y-3">
                        {summary.keyPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-primary-foreground text-xs font-bold">{index + 1}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="card-minimal">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Action Items</h4>
                      <div className="space-y-3">
                        {summary.actionItems.map((item, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">•</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Decisions */}
                  {summary.decisions.length > 0 && (
                    <div className="card-minimal">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Decisions Made</h4>
                      <div className="space-y-3">
                        {summary.decisions.map((decision, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{decision}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">No summary available</h3>
                    <p className="text-muted-foreground text-sm">Summary will be generated after transcription completes</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcription" className="mt-0 h-full">
            {transcription ? (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6 max-w-4xl mx-auto">
                  {groupUtterancesBySpeaker().map((group, index) => {
                    const speakerLabel = String(group.speaker || "Unknown Speaker")

                    return (
                      <div key={index} className="flex gap-4 group">
                        {/* Speaker Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground text-sm font-semibold">
                              {speakerLabel.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          {/* Speaker Name */}
                          <div className="flex items-baseline gap-3 mb-2">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSpeakerColor(speakerLabel)}`}>
                              {speakerLabel}
                            </div>
                          </div>

                          {/* Message Text */}
                          <div className="bg-muted/50 rounded-lg rounded-tl-sm p-4 border border-border/50">
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                              {group.text || "[No text content]"}
                            </p>
                            {!group.text && (
                              <div className="mt-2 text-xs text-destructive">
                                ⚠️ Debug: Empty text for speaker {speakerLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">No transcription available</h3>
                    <p className="text-muted-foreground text-sm">Complete a recording to view transcription here</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="full-transcription" className="mt-0 h-full">
            {transcription ? (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="card-minimal">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Complete Transcript</h3>
                      <p className="text-sm text-muted-foreground">
                        Full conversation without speaker separation
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {transcription.result.transcription.full_transcript || "No full transcript available"}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">No full transcription available</h3>
                    <p className="text-muted-foreground text-sm">Complete a recording to view full transcription here</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
