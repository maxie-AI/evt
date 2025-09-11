import { join } from 'path';
import { tmpdir } from 'os';
import { platform } from 'os';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { VideoPlatform } from '../../shared/types';

function getYtDlpPath(): string {
  // For Vercel serverless environment, use system PATH
  if (process.env.VERCEL) {
    return 'yt-dlp';
  }
  
  // Known Windows installation path for local development
  const knownPath = 'C:\\Users\\tao\\AppData\\Roaming\\Python\\Python313\\Scripts\\yt-dlp.exe';
  
  // Fallback paths
  const fallbackPaths = [
    'yt-dlp',
    'yt-dlp.exe',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ];
  
  if (platform() === 'win32') {
    return knownPath;
  }
  
  return fallbackPaths[0];
}

export interface AudioExtractionResult {
  audioPath: string;
  duration: number;
  title: string;
  cleanup: () => void;
}

export class AudioExtractor {
  private ytDlp: any;
  private tempDir: string;

  constructor() {
    this.tempDir = tmpdir();
  }

  private async initializeYtDlp() {
    if (!this.ytDlp) {
      try {
        const YTDlpWrap = (await import('yt-dlp-wrap')).default;
        this.ytDlp = new YTDlpWrap(getYtDlpPath());
      } catch (error) {
        console.error('Failed to initialize yt-dlp:', error);
        throw new Error('yt-dlp initialization failed. This feature may not work in serverless environments.');
      }
    }
  }

  /**
   * Extract audio from video URL
   */
  async extractAudio(url: string): Promise<AudioExtractionResult> {
    // Check if running in Vercel serverless environment
    if (process.env.VERCEL) {
      throw new Error('Audio extraction is not supported in serverless environment. Please use a different deployment method or implement a cloud-based solution.');
    }

    await this.initializeYtDlp();
    
    const audioId = randomUUID();
    const audioPath = join(this.tempDir, `${audioId}.mp3`);

    try {
      // Get video info first to extract metadata
      const videoInfo = await this.ytDlp.getVideoInfo(url);
      const title = Array.isArray(videoInfo) ? videoInfo[0]?.title : videoInfo?.title;
      const duration = Array.isArray(videoInfo) ? videoInfo[0]?.duration : videoInfo?.duration;

      // Extract audio using yt-dlp
      await new Promise<void>((resolve, reject) => {
        const ytDlpProcess = this.ytDlp.exec([
          url,
          '-x', // Extract audio only
          '--audio-format', 'mp3',
          '--audio-quality', '0', // Best quality
          '-o', audioPath.replace('.mp3', '.%(ext)s')
        ]);

        ytDlpProcess.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`yt-dlp process exited with code ${code}`));
          }
        });

        ytDlpProcess.on('error', (error: Error) => {
          reject(error);
        });
      });

      // Verify the file was created
      if (!existsSync(audioPath)) {
        throw new Error('Audio file was not created');
      }

      return {
        audioPath,
        duration: duration || 0,
        title: title || 'Unknown',
        cleanup: () => {
          if (existsSync(audioPath)) {
            unlinkSync(audioPath);
          }
        }
      };
    } catch (error) {
      // Clean up on error
      if (existsSync(audioPath)) {
        unlinkSync(audioPath);
      }
      throw error;
    }
  }

  /**
   * Get video information without downloading
   * @param url Video URL
   * @returns Video metadata
   */
  async getVideoInfo(url: string): Promise<{ title: string; duration: number; thumbnail?: string }> {
    // Check if running in Vercel serverless environment
    if (process.env.VERCEL) {
      // Return mock data for serverless environment
      return {
        title: 'Video (Serverless Mode)',
        duration: 300, // 5 minutes default
        thumbnail: 'https://via.placeholder.com/320x180?text=Video'
      };
    }

    try {
      await this.initializeYtDlp();
      
      const options = [
        '--dump-json',
        '--no-download',
        url
      ];

      const output = await this.ytDlp.execPromise(options);
      const info = JSON.parse(output);

      return {
        title: info.title || 'Unknown Title',
        duration: info.duration || 0,
        thumbnail: info.thumbnail
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if yt-dlp is available and working
   * @returns Promise<boolean>
   */
  async isAvailable(): Promise<boolean> {
    // Always return false in Vercel serverless environment
    if (process.env.VERCEL) {
      return false;
    }

    try {
      await this.initializeYtDlp();
      await this.ytDlp.execPromise(['--version']);
      return true;
    } catch (error) {
      console.error('yt-dlp not available:', error);
      return false;
    }
  }
}

// Export singleton instance
export const audioExtractor = new AudioExtractor();