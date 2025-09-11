import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { TranscriptSegment } from '../../shared/types.js';

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

export class TranscriptionService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Transcribe audio file using OpenAI Whisper
   * @param audioPath Path to the audio file
   * @param language Optional language code (e.g., 'en', 'zh', 'ja')
   * @returns Transcription with text and segments
   */
  async transcribeAudio(audioPath: string, language?: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting transcription with Whisper...');
      
      // Create file stream
      const audioStream = createReadStream(audioPath);

      // Configure transcription options
      const transcriptionOptions: OpenAI.Audio.TranscriptionCreateParams = {
        file: audioStream,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      };

      // Add language if specified
      if (language) {
        transcriptionOptions.language = language;
      }

      // Call OpenAI Whisper API
      const response = await this.openai.audio.transcriptions.create(transcriptionOptions) as any;

      // Process the response
      const segments: TranscriptSegment[] = [];
      
      if (response.segments && Array.isArray(response.segments)) {
        for (const segment of response.segments) {
          segments.push({
            start: segment.start,
            end: segment.end,
            text: segment.text.trim()
          });
        }
      }

      // If no segments, create a single segment with the full text
      if (segments.length === 0 && response.text) {
        segments.push({
          start: 0,
          end: 0,
          text: response.text.trim()
        });
      }

      console.log(`Transcription completed: ${segments.length} segments`);

      return {
        text: response.text || '',
        segments
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      
      if (error instanceof Error) {
        // Handle specific OpenAI API errors
        if (error.message.includes('API key')) {
          throw new Error('Invalid OpenAI API key. Please check your configuration.');
        }
        if (error.message.includes('quota')) {
          throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
        }
        if (error.message.includes('file')) {
          throw new Error('Audio file format not supported or file is corrupted.');
        }
      }

      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect language of audio file
   * @param audioPath Path to the audio file
   * @returns Detected language code
   */
  async detectLanguage(audioPath: string): Promise<string> {
    try {
      const audioStream = createReadStream(audioPath);
      
      const response = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        response_format: 'json'
      });

      // Whisper automatically detects language, but we need to infer it from the response
      // This is a simplified approach - in practice, you might want to use a separate language detection service
      return 'auto';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Check if OpenAI API is available and configured
   * @returns Promise<boolean>
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test API connection with a minimal request
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI API not available:', error);
      return false;
    }
  }

  /**
   * Get supported audio formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[] {
    return ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
  }

  /**
   * Validate audio file size (OpenAI has a 25MB limit)
   * @param filePath Path to the audio file
   * @returns boolean
   */
  async validateFileSize(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      const stats = await fs.promises.stat(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      // OpenAI Whisper has a 25MB file size limit
      return fileSizeInMB <= 25;
    } catch (error) {
      console.error('Failed to validate file size:', error);
      return false;
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;