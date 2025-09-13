import { join } from 'path';
import { tmpdir } from 'os';
import { platform } from 'os';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';
import { VideoPlatform } from '../../shared/types';

/**
 * Get the path to yt-dlp executable
 * @returns Path to yt-dlp
 */
function getYtDlpPath(): string {
  // Use batch file wrapper for yt-dlp-wrap compatibility on Windows
  const path = './yt-dlp.bat';
  console.log('🔧 Using yt-dlp path:', path, 'from cwd:', process.cwd());
  return path;
}

export interface AudioExtractionResult {
  audioPath: string;
  duration: number;
  title: string;
  cleanup: () => void;
}

export class AudioExtractor {
  private tempDir: string;

  constructor() {
    this.tempDir = tmpdir();
  }

  private async execYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('🔧 Executing yt-dlp with args:', args);
      const process = spawn('python', ['-m', 'yt_dlp', ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          console.error('yt-dlp stderr:', stderr);
          reject(new Error(`yt-dlp process exited with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract audio from video URL
   */
  async extractAudio(url: string): Promise<AudioExtractionResult> {
    // Skip serverless check for local development
    console.log('🎵 AudioExtractor: Starting audio extraction for URL:', url);
    
    const audioId = randomUUID();
    const audioPath = join(this.tempDir, `${audioId}.mp3`);

    try {
      // Get video info first to extract metadata
      const infoOutput = await this.execYtDlp(['--dump-json', '--no-download', url]);
      const videoInfo = JSON.parse(infoOutput);
      const title = videoInfo.title || 'Unknown';
      const duration = videoInfo.duration || 0;

      // Extract audio using yt-dlp
      await this.execYtDlp([
        url,
        '-x', // Extract audio only
        '--audio-format', 'mp3',
        '--audio-quality', '0', // Best quality
        '-o', audioPath.replace('.mp3', '.%(ext)s')
      ]);

      // Verify the file was created
      if (!existsSync(audioPath)) {
        throw new Error('Audio file was not created');
      }

      return {
        audioPath,
        duration,
        title,
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
    // Skip serverless check for local development
    console.log('📹 AudioExtractor: Getting video info for URL:', url);

    try {
      const output = await this.execYtDlp(['--dump-json', '--no-download', url]);
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
    // Skip serverless check for local development
    console.log('🔍 AudioExtractor: Checking if yt-dlp is available...');

    try {
      await this.execYtDlp(['--version']);
      return true;
    } catch (error) {
      console.error('yt-dlp not available:', error);
      return false;
    }
  }
}

// Export singleton instance
export const audioExtractor = new AudioExtractor();