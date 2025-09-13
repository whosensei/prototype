'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { LocalStorageService, StoredTranscription } from '@/lib/local-storage';

interface TranscriptionSidebarProps {
  onTranscriptionSelect: (transcription: StoredTranscription) => void;
  selectedTranscriptionId?: string;
  onRefresh?: () => void;
}

export function TranscriptionSidebar({ 
  onTranscriptionSelect, 
  selectedTranscriptionId,
  onRefresh
}: TranscriptionSidebarProps) {
  const [transcriptions, setTranscriptions] = useState<StoredTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTranscriptions = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const storedTranscriptions = LocalStorageService.getTranscriptions();
      setTranscriptions(storedTranscriptions);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load transcriptions: ${errorMessage}`);
      console.error('Error loading transcriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTranscription = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering selection
    
    if (confirm('Are you sure you want to delete this transcription?')) {
      const success = LocalStorageService.deleteTranscription(id);
      if (success) {
        loadTranscriptions(); // Refresh the list
        onRefresh?.(); // Notify parent if needed
      } else {
        setError('Failed to delete transcription');
      }
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, []);

  // Refresh transcriptions when component receives new data
  useEffect(() => {
    const handleStorageChange = () => {
      loadTranscriptions();
    };

    // Listen for storage changes (in case of multiple tabs)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Expose refresh method to parent
  useEffect(() => {
    const refreshTranscriptions = () => {
      loadTranscriptions();
    };
    
    if (onRefresh) {
      (window as unknown as Record<string, unknown>).refreshTranscriptions = refreshTranscriptions;
    }
  }, [onRefresh]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-red-100 text-red-800'; // Unknown status should be treated as error
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'failed':
        return '✗';
      default:
        return '⚠️'; // Warning icon for unknown status
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcriptions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTranscriptions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {error && (
          <div className="p-4">
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="font-medium">Error loading transcriptions</div>
              <div className="mt-1 text-xs">{error}</div>
            </div>
          </div>
        )}

        {isLoading && transcriptions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            Loading transcriptions...
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">No transcriptions available</p>
            <p className="text-xs">Complete an audio recording and transcription to see results here</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2 p-4">
              {transcriptions.map((transcription, index) => (
                <div key={transcription.id} className="relative group">
                  <Button
                    variant={selectedTranscriptionId === transcription.id ? "secondary" : "ghost"}
                    className="w-full p-4 h-auto justify-start text-left pr-12"
                    onClick={() => onTranscriptionSelect(transcription)}
                  >
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm truncate">
                          {transcription.filename || `Recording ${index + 1}`}
                        </span>
                        <Badge 
                          className={`text-xs ${getStatusColor(transcription.status)}`}
                          variant="outline"
                        >
                          {getStatusIcon(transcription.status)} {transcription.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(transcription.createdAt)}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        ID: {transcription.id.slice(0, 8)}...
                      </div>
                      
                      {transcription.error && (
                        <div className="text-xs text-red-600 truncate">
                          Error: {transcription.error}
                        </div>
                      )}
                    </div>
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteTranscription(e, transcription.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                  
                  {index < transcriptions.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
