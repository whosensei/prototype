/**
 * Local Storage Service for Transcriptions
 * Manages saving and retrieving transcriptions from browser localStorage
 */

import { GladiaTranscriptionResult } from './gladia-service';
import { MeetingSummary } from './gemini-service';

export interface StoredTranscription {
  id: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'completed' | 'failed';
  transcriptionData?: GladiaTranscriptionResult;
  summaryData?: MeetingSummary;
  audioPath?: string;
  error?: string;
}

const STORAGE_KEY = 'audio_transcriptions';

export class LocalStorageService {
  /**
   * Get all stored transcriptions
   */
  static getTranscriptions(): StoredTranscription[] {
    try {
      if (typeof window === 'undefined') return []; // SSR safety
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const transcriptions = JSON.parse(stored);
      
      // Ensure it's an array and validate structure
      if (!Array.isArray(transcriptions)) {
        console.warn('Invalid transcriptions data in localStorage, resetting');
        this.clearTranscriptions();
        return [];
      }
      
      // Sort by creation date (newest first)
      return transcriptions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error reading transcriptions from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a specific transcription by ID
   */
  static getTranscription(id: string): StoredTranscription | null {
    const transcriptions = this.getTranscriptions();
    return transcriptions.find(t => t.id === id) || null;
  }

  /**
   * Save a new transcription (when recording starts)
   */
  static saveNewTranscription(id: string, filename: string, audioPath?: string): StoredTranscription {
    const newTranscription: StoredTranscription = {
      id,
      filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'processing',
      audioPath,
    };

    const transcriptions = this.getTranscriptions();
    transcriptions.unshift(newTranscription); // Add to beginning
    
    this.saveTranscriptions(transcriptions);
    return newTranscription;
  }

  /**
   * Update transcription with completion data
   */
  static updateTranscription(
    id: string, 
    updates: Partial<StoredTranscription>
  ): StoredTranscription | null {
    const transcriptions = this.getTranscriptions();
    const index = transcriptions.findIndex(t => t.id === id);
    
    if (index === -1) {
      console.warn(`Transcription with ID ${id} not found for update`);
      return null;
    }

    // Update the transcription
    transcriptions[index] = {
      ...transcriptions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveTranscriptions(transcriptions);
    return transcriptions[index];
  }

  /**
   * Mark transcription as completed with data
   */
  static completeTranscription(
    id: string,
    transcriptionData: GladiaTranscriptionResult,
    summaryData?: MeetingSummary
  ): StoredTranscription | null {
    return this.updateTranscription(id, {
      status: 'completed',
      transcriptionData,
      summaryData,
    });
  }

  /**
   * Mark transcription as failed
   */
  static failTranscription(id: string, error: string): StoredTranscription | null {
    return this.updateTranscription(id, {
      status: 'failed',
      error,
    });
  }

  /**
   * Delete a specific transcription
   */
  static deleteTranscription(id: string): boolean {
    const transcriptions = this.getTranscriptions();
    const filteredTranscriptions = transcriptions.filter(t => t.id !== id);
    
    if (filteredTranscriptions.length === transcriptions.length) {
      return false; // No transcription found with that ID
    }

    this.saveTranscriptions(filteredTranscriptions);
    return true;
  }

  /**
   * Clear all transcriptions
   */
  static clearTranscriptions(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error clearing transcriptions from localStorage:', error);
    }
  }

  /**
   * Get transcription count
   */
  static getTranscriptionCount(): number {
    return this.getTranscriptions().length;
  }

  /**
   * Get storage size (approximate)
   */
  static getStorageSize(): number {
    try {
      if (typeof window === 'undefined') return 0;
      
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  /**
   * Export transcriptions as JSON
   */
  static exportTranscriptions(): string {
    const transcriptions = this.getTranscriptions();
    return JSON.stringify(transcriptions, null, 2);
  }

  /**
   * Import transcriptions from JSON
   */
  static importTranscriptions(jsonData: string): boolean {
    try {
      const transcriptions = JSON.parse(jsonData);
      
      if (!Array.isArray(transcriptions)) {
        throw new Error('Invalid format: expected array of transcriptions');
      }

      // Validate structure of each transcription
      for (const t of transcriptions) {
        if (!t.id || !t.filename || !t.createdAt) {
          throw new Error('Invalid transcription structure');
        }
      }

      this.saveTranscriptions(transcriptions);
      return true;
    } catch (error) {
      console.error('Error importing transcriptions:', error);
      return false;
    }
  }

  /**
   * Private method to save transcriptions array to localStorage
   */
  private static saveTranscriptions(transcriptions: StoredTranscription[]): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transcriptions));
      }
    } catch (error) {
      console.error('Error saving transcriptions to localStorage:', error);
      
      // If localStorage is full, try to clean up old transcriptions
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanupOldTranscriptions();
        
        // Try saving again after cleanup
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(transcriptions));
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Clean up old transcriptions to free space
   */
  private static cleanupOldTranscriptions(): void {
    console.log('Cleaning up old transcriptions due to storage quota');
    
    const transcriptions = this.getTranscriptions();
    
    // Keep only the most recent 20 transcriptions
    const recentTranscriptions = transcriptions.slice(0, 20);
    
    this.saveTranscriptions(recentTranscriptions);
    
    console.log(`Cleaned up ${transcriptions.length - recentTranscriptions.length} old transcriptions`);
  }
}
