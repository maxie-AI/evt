import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { existsSync } from 'fs';
import { extname } from 'path';
import { stat } from 'fs/promises';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
    }
    
    if (apiKey.startsWith('sk-') && apiKey.length < 20) {
      throw new Error('Invalid OpenAI API key format. Please check your OPENAI_API_KEY environment variable.');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openaiClient;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class TranscriptionService {
  private client: OpenAI;

  constructor() {
    // Don't initialize client in constructor to avoid errors in serverless cold starts
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = getOpenAIClient();
    }
    return this.client;
  }

  /**
   * Transcribe audio file using OpenAI Whisper
   * @param audioPath Path to the audio file
   * @param options Transcription options
   * @returns Transcription result
   */
  async transcribeAudio(
    audioPath: string,
    options: {
      language?: string;
      prompt?: string;
      temperature?: number;
      maxDuration?: number;
    } = {}
  ): Promise<TranscriptionResult> {
    // Skip serverless check for local development
    console.log('🤖 TranscriptionService: Starting transcription for audio file:', audioPath);

    try {
      // Validate file exists
      if (!existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Check file size (OpenAI has a 25MB limit)
      const fileStats = await stat(audioPath);
      const fileSizeMB = fileStats.size / (1024 * 1024);
      
      if (fileSizeMB > 25) {
        throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds OpenAI's 25MB limit`);
      }

      // Validate file format
      const supportedFormats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
      const fileExtension = extname(audioPath).toLowerCase();
      
      if (!supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported audio format: ${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`);
      }

      const client = this.getClient();
      
      // Create file stream
      const audioStream = createReadStream(audioPath);
      
      // Transcribe using OpenAI Whisper
      const transcription = await client.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature || 0,
        response_format: 'verbose_json'
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments?.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      
      if (error instanceof Error) {
        // Handle specific OpenAI errors
        if (error.message.includes('API key')) {
          throw new Error('OpenAI API key is invalid or missing. Please check your configuration.');
        }
        
        if (error.message.includes('quota')) {
          throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
        }
        
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        }
        
        throw error;
      }
      
      throw new Error(`Transcription failed: ${error}`);
    }
  }

  /**
   * Get mock transcription for serverless environment
   */
  private getMockTranscription(maxDuration?: number): TranscriptionResult {
    const duration = maxDuration || 60;
    const mockText = `This is a mock transcription for serverless environment. The video would normally be processed here, but audio extraction and transcription require local binaries that are not available in Vercel's serverless environment. To enable full functionality, please deploy to a server with yt-dlp and OpenAI Whisper support.`;
    
    return {
      text: mockText,
      language: 'en',
      duration: duration,
      segments: [
        {
          start: 0,
          end: duration,
          text: mockText
        }
      ]
    };
  }

  /**
   * Detect language of audio file
   * @param audioPath Path to the audio file
   * @returns Detected language code
   */
  async detectLanguage(audioPath: string): Promise<string> {
    console.log('🌐 TranscriptionService: Detecting language for audio file:', audioPath);

    try {
      const result = await this.transcribeAudio(audioPath, { temperature: 0 });
      return result.language || 'en';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Check if OpenAI API is available
   * @returns Promise<boolean>
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      const client = this.getClient();
      // Try to list models to test API connectivity
      await client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI API not available:', error);
      return false;
    }
  }

  /**
   * Check if audio format is supported
   * @param filePath Path to the audio file
   * @returns boolean
   */
  isFormatSupported(filePath: string): boolean {
    const supportedFormats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    const fileExtension = extname(filePath).toLowerCase();
    return supportedFormats.includes(fileExtension);
  }

  /**
   * Check if file size is within limits
   * @param filePath Path to the audio file
   * @returns Promise<boolean>
   */
  async isFileSizeValid(filePath: string): Promise<boolean> {
    try {
      const fileStats = await stat(filePath);
      const fileSizeMB = fileStats.size / (1024 * 1024);
      return fileSizeMB <= 25; // OpenAI's limit
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();