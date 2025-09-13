"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Clock, Menu, Trash2, Plus } from "lucide-react"
import { LocalStorageService, type StoredTranscription } from "@/lib/local-storage"

interface TranscriptionSidebarProps {
  onTranscriptionSelect: (transcription: StoredTranscription) => void
  selectedTranscriptionId?: string
  onRefresh?: () => void
  onNewRecording?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function TranscriptionSidebar({
  onTranscriptionSelect,
  selectedTranscriptionId,
  onRefresh,
  onNewRecording,
  isCollapsed,
  onToggleCollapse,
}: TranscriptionSidebarProps) {
  const [transcriptions, setTranscriptions] = useState<StoredTranscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTranscriptions = () => {
    setIsLoading(true)
    setError(null)

    try {
      const storedTranscriptions = LocalStorageService.getTranscriptions()
      setTranscriptions(storedTranscriptions)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Failed to load transcriptions: ${errorMessage}`)
      console.error("Error loading transcriptions:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTranscription = (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent triggering selection

    if (confirm("Are you sure you want to delete this transcription?")) {
      const success = LocalStorageService.deleteTranscription(id)
      if (success) {
        loadTranscriptions() // Refresh the list
        onRefresh?.() // Notify parent if needed
      } else {
        setError("Failed to delete transcription")
      }
    }
  }

  useEffect(() => {
    loadTranscriptions()
  }, [])

  // Refresh transcriptions when component receives new data
  useEffect(() => {
    const handleStorageChange = () => {
      loadTranscriptions()
    }

    // Listen for storage changes (in case of multiple tabs)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Expose refresh method to parent
  useEffect(() => {
    const refreshTranscriptions = () => {
      loadTranscriptions()
    }

    if (onRefresh) {
      ;(window as unknown as Record<string, unknown>).refreshTranscriptions = refreshTranscriptions
    }
  }, [onRefresh])

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    )
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-red-100 text-red-800" // Unknown status should be treated as error
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓"
      case "processing":
        return "⟳"
      case "failed":
        return "✗"
      default:
        return "⚠️" // Warning icon for unknown status
    }
  }

  return (
    <div className={`h-full flex flex-col bg-sidebar transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
      {isCollapsed ? (
        /* Collapsed state - only hamburger */
        <div className="p-3 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md border border-sidebar-border hover:bg-sidebar-accent/10 transition-colors"
          >
            <Menu className="h-4 w-4 text-sidebar-foreground" />
          </button>
        </div>
      ) : (
        /* Expanded state - full header */
        <>
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 font-semibold text-base text-sidebar-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Transcriptions
              </h2>
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-md border border-sidebar-border hover:bg-sidebar-accent/10 transition-colors"
              >
                <Menu className="h-4 w-4 text-sidebar-foreground" />
              </button>
            </div>

            {/* New Recording Button */}
            <button
              onClick={onNewRecording}
              className="btn-minimal w-full flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Recording
            </button>
          </div>
        </>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
          {error && (
            <div className="mb-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full" />
                  <div>
                    <div className="font-medium text-destructive text-sm">Error loading</div>
                    <div className="text-xs text-destructive/80 mt-1">{error}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading && transcriptions.length === 0 ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="font-medium text-sidebar-foreground">Loading...</p>
            </div>
          ) : transcriptions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">No transcriptions yet</p>
              <p className="text-xs">Start recording to see them here</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {transcriptions.map((transcription, index) => (
                <div key={transcription.id} className="relative">
                  {/* Main transcription card */}
                  <div
                    className={`relative rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      selectedTranscriptionId === transcription.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card hover:bg-muted/50 border-border"
                    }`}
                    onClick={() => onTranscriptionSelect(transcription)}
                  >
                    <div className="p-4 pr-8">
                      {/* Header row */}
                      <div className="mb-3">
                        <h3 className={`font-medium text-sm ${
                          selectedTranscriptionId === transcription.id
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}>
                          {transcription.filename || `Recording ${index + 1}`}
                        </h3>
                      </div>
                      
                      {/* Status and Date row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1 text-xs ${
                          selectedTranscriptionId === transcription.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}>
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{formatDate(transcription.createdAt)}</span>
                        </div>
                        
                        {/* Status badge */}
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedTranscriptionId === transcription.id
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : transcription.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : transcription.status === "processing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                        }`}>
                          <span>{getStatusIcon(transcription.status)}</span>
                          <span className="capitalize">{transcription.status}</span>
                        </div>
                      </div>

                      {/* Error state */}
                      {transcription.error && (
                        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                          <p className="text-xs text-red-700 truncate">
                            Error: {transcription.error}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTranscription(e, transcription.id)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0'
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

