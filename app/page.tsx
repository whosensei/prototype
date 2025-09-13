"use client"

import { useState } from "react"
import { AudioRecorderComponent } from "@/components/audio-recorder-component"
import { TabbedTranscriptDisplay } from "@/components/tabbed-transcript-display"
import { TranscriptionSidebar } from "@/components/transcription-sidebar"
import type { GladiaTranscriptionResult } from "@/lib/gladia-service"
import type { MeetingSummary } from "@/lib/gemini-service"
import { LocalStorageService, type StoredTranscription } from "@/lib/local-storage"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/toaster"

export default function Home() {
  const [currentTranscription, setCurrentTranscription] = useState<GladiaTranscriptionResult | null>(null)
  const [currentSummary, setCurrentSummary] = useState<MeetingSummary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | undefined>()
  const [hideRecorder, setHideRecorder] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { toast } = useToast()

  const handleRecordingComplete = async (audioBlob: Blob, filename: string) => {
    setIsProcessing(true)
    setCurrentTranscription(null)
    setCurrentSummary(null)
    setHideRecorder(true) // Hide the recorder after upload and transcribe is clicked

    // Create initial transcription record in local storage
    const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    LocalStorageService.saveNewTranscription(transcriptionId, filename)

    try {
      // Step 1: Upload audio file
      toast({
        title: "Uploading audio...",
        description: "Saving your recording and preparing for transcription.",
      })

      const formData = new FormData()
      formData.append("audio", audioBlob, filename)

      const uploadResponse = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio")
      }

      const uploadData = await uploadResponse.json()

      // Step 2: Start transcription
      toast({
        title: "Starting transcription...",
        description: "Processing your audio with Gladia AI for transcription and speaker diarization.",
      })

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploadData.filename }),
      })

      if (!transcribeResponse.ok) {
        throw new Error("Failed to start transcription")
      }

      const transcribeData = await transcribeResponse.json()
      const requestId = transcribeData.requestId

      console.log("Transcribe response data:", transcribeData)
      console.log("Extracted requestId:", requestId)

      if (!requestId) {
        throw new Error("No requestId received from transcription initiation")
      }

      // Step 3: Poll for transcription completion
      toast({
        title: "Transcription in progress...",
        description: "This may take a few minutes depending on audio length.",
      })

      let attempts = 0
      const maxAttempts = 60 // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

        console.log(`Attempt ${attempts + 1}: Polling for transcription result`)
        console.log("Using requestId:", requestId)
        console.log("Full URL:", `/api/transcribe?requestId=${requestId}`)

        const resultResponse = await fetch(`/api/transcribe?requestId=${requestId}`)
        if (!resultResponse.ok) {
          const errorText = await resultResponse.text()
          console.error("Failed response:", resultResponse.status, errorText)
          throw new Error(`Failed to get transcription result: ${resultResponse.status} ${errorText}`)
        }

        const resultData = await resultResponse.json()
        const result = resultData.result

        if (result.status === "done") {
          setCurrentTranscription(result)
          setSelectedTranscriptionId(transcriptionId)

          // Step 4: Generate summary in parallel
          toast({
            title: "Generating summary...",
            description: "Creating an AI-powered meeting summary with Gemini.",
          })

          // Generate summary - show clear error if it fails
          let summaryData: MeetingSummary | undefined

          try {
            const summaryResponse = await fetch("/api/summarize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: result.result.transcription.full_transcript,
                speakers: result.result.speakers,
                namedEntities: result.result.named_entities,
              }),
            })

            if (!summaryResponse.ok) {
              const errorData = await summaryResponse.json()
              throw new Error(`Summary generation failed: ${errorData.error || "Unknown API error"}`)
            }

            const summaryResponse_data = await summaryResponse.json()
            if (!summaryResponse_data.success || !summaryResponse_data.summary) {
              throw new Error("Summary API returned invalid response format")
            }

            summaryData = summaryResponse_data.summary
            setCurrentSummary(summaryData || null)
          } catch (summaryError) {
            console.error("Summary generation failed:", summaryError)
            // Continue without summary - don't fail the whole process
          }

          // Save completed transcription to local storage
          LocalStorageService.completeTranscription(transcriptionId, result, summaryData)

          toast({
            title: "Processing complete!",
            description: "Your audio has been transcribed and summarized successfully.",
          })

          break
        } else if (result.status === "error") {
          throw new Error(`Transcription failed: ${result.error}`)
        }

        attempts++
      }

      if (attempts >= maxAttempts) {
        throw new Error("Transcription timeout - took too long to complete")
      }
    } catch (error) {
      console.error("Processing error:", error)

      // Mark transcription as failed in local storage
      LocalStorageService.failTranscription(
        transcriptionId,
        error instanceof Error ? error.message : "An unexpected error occurred.",
      )

      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTranscriptionSelect = async (storedTranscription: StoredTranscription) => {
    if (storedTranscription.status === "processing") {
      toast({
        title: "Transcription in progress",
        description: "This transcription is still being processed.",
        variant: "destructive",
      })
      return
    }

    if (storedTranscription.status === "failed") {
      toast({
        title: "Transcription failed",
        description: storedTranscription.error || "This transcription failed to process.",
        variant: "destructive",
      })
      return
    }

    if (!storedTranscription.transcriptionData) {
      toast({
        title: "No transcription data",
        description: "This transcription has no data available.",
        variant: "destructive",
      })
      return
    }

    setSelectedTranscriptionId(storedTranscription.id)
    setCurrentTranscription(storedTranscription.transcriptionData)
    setCurrentSummary(storedTranscription.summaryData || null)
    setHideRecorder(true) // Hide recorder when viewing existing transcriptions

    // If no summary exists and transcription is complete, try to generate one
    if (!storedTranscription.summaryData && storedTranscription.transcriptionData) {
      setIsProcessing(true)

      try {
        const summaryResponse = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: storedTranscription.transcriptionData.result.transcription.full_transcript,
            speakers: storedTranscription.transcriptionData.result.speakers,
            namedEntities: storedTranscription.transcriptionData.result.named_entities,
          }),
        })

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          if (summaryData.success && summaryData.summary) {
            setCurrentSummary(summaryData.summary)

            // Update local storage with the new summary
            LocalStorageService.updateTranscription(storedTranscription.id, {
              summaryData: summaryData.summary,
            })
          }
        }
      } catch (error) {
        console.error("Error generating summary:", error)
        // Don't show error toast for optional summary generation
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleNewRecording = () => {
    // Clear all current data to focus on new recording
    setCurrentTranscription(null)
    setCurrentSummary(null)
    setSelectedTranscriptionId(undefined)
    setIsProcessing(false)
    setHideRecorder(false) // Show the recorder again for new recording

    // Show success toast to indicate new recording mode
    toast({
      title: "Ready for new recording",
      description: "Previous data cleared. You can now start a new recording.",
    })
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Fixed Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-sidebar border-r border-border transition-all duration-300 z-50 ${isSidebarCollapsed ? 'w-12' : 'w-80'}`}>
        <TranscriptionSidebar
          onTranscriptionSelect={handleTranscriptionSelect}
          selectedTranscriptionId={selectedTranscriptionId}
          onNewRecording={handleNewRecording}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content with left margin */}
      <div className={`flex-1 flex flex-col bg-background transition-all duration-300 ${isSidebarCollapsed ? 'ml-12' : 'ml-80'}`}>
        {(currentTranscription || currentSummary || isProcessing) ? (
          /* Show transcript tabs when available - no hero section */
          <div className="w-full h-full">
            <TabbedTranscriptDisplay
              transcription={currentTranscription}
              summary={currentSummary}
              isLoading={isProcessing}
            />
          </div>
        ) : (
          /* Show hero section + recording interface for new recordings */
          <>
            {/* Hero Section - only on new recording page */}
            <div className="pt-16 pb-4 px-8">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-6xl font-bold text-foreground mb-4 tracking-tighter" style={{fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'}}>
                  Record anything, remember everything
                </h1>
                <p className="text-lg text-muted-foreground">
                  AI-powered transcription with speaker identification and smart summaries
                </p>
              </div>
            </div>

            {/* Recording Interface */}
            <div className="flex-1 flex items-start justify-center pt-2">
              <div className="w-full max-w-5xl mx-auto">
                <AudioRecorderComponent
                  onRecordingComplete={handleRecordingComplete}
                  onRecordingStart={() => {
                    setCurrentTranscription(null)
                    setCurrentSummary(null)
                    setSelectedTranscriptionId(undefined)
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Toaster />
    </div>
  )
}
