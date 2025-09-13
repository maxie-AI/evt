import { audioExtractor } from './audioExtractor';
import { transcriptionService } from './transcriptionService';
import { VideoPlatform } from '../../shared/types';

export interface VideoProcessingResult {
  transcript: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  metadata: {
    title: string;
    duration: number;
    platform: VideoPlatform;
    url: string;
    thumbnail?: string;
  };
}

export interface ProcessingResult {
  transcript: {
    text: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  };
  metadata: {
    platform: VideoPlatform;
    title: string;
    duration: number;
    thumbnail?: string;
  };
}

/**
 * Detect video platform from URL
 */
export function detectPlatform(url: string): VideoPlatform {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  } else if (urlLower.includes('vimeo.com')) {
    return 'youtube'; // Fallback to youtube for unsupported platforms
  } else if (urlLower.includes('dailymotion.com')) {
    return 'youtube'; // Fallback to youtube for unsupported platforms
  } else if (urlLower.includes('twitch.tv')) {
    return 'youtube'; // Fallback to youtube for unsupported platforms
  }
  
  return 'youtube'; // Default fallback
}

/**
 * Validate video URL format
 */
export function isValidVideoUrl(url: string): boolean {
  return validateVideoUrl(url).isValid;
}

/**
 * Validate video URL and return detailed validation result
 */
export function validateVideoUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url);
    const platform = detectPlatform(url);
    
    // Basic URL validation
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
    
    // Platform-specific validation
    switch (platform) {
      case 'youtube':
        const isValidYoutube = (
          (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) ||
          urlObj.hostname.includes('youtu.be')
        );
        if (!isValidYoutube) {
          return { isValid: false, error: 'Invalid YouTube URL format' };
        }
        break;
      case 'bilibili':
        const isValidBilibili = urlObj.hostname.includes('bilibili.com') && /\/video\/(BV[a-zA-Z0-9]{10}|av\d+)/.test(urlObj.pathname);
        if (!isValidBilibili) {
          return { isValid: false, error: 'Invalid Bilibili URL format' };
        }
        break;
      case 'redbook':
        const isValidRedbook = urlObj.hostname.includes('xiaohongshu.com') || urlObj.hostname.includes('xhslink.com');
        if (!isValidRedbook) {
          return { isValid: false, error: 'Invalid Redbook URL format' };
        }
        break;
      default:
        return { isValid: false, error: 'Unsupported video platform' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}



/**
 * Extract video ID from URL
 */
export function extractVideoId(url: string): string {
  const platform = detectPlatform(url);
  
  try {
    const urlObj = new URL(url);
    
    switch (platform) {
      case 'youtube':
        if (urlObj.hostname.includes('youtu.be')) {
          return urlObj.pathname.slice(1);
        }
        return urlObj.searchParams.get('v') || '';
      
      case 'bilibili':
        const bvMatch = urlObj.pathname.match(/\/video\/(BV[a-zA-Z0-9]{10}|av\d+)/);
        return bvMatch ? bvMatch[1] : '';
      
      case 'redbook':
        const rbMatch = urlObj.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
        return rbMatch ? rbMatch[1] : '';
      
      default:
        return url;
    }
  } catch {
    return url;
  }
}

/**
 * Extract video information without downloading
 */
export async function extractVideoInfo(url: string): Promise<{
  title: string;
  duration: number;
  thumbnail?: string;
}> {
  try {
    return await audioExtractor.getVideoInfo(url);
  } catch (error) {
    console.error('Failed to extract video info:', error);
    
    // Fallback metadata
    const platform = detectPlatform(url);
    const videoId = extractVideoId(url);
    
    const platformTitles = {
      'youtube': 'YouTube Video',
      'bilibili': 'Bilibili Video',
      'redbook': 'Redbook Video'
    };
    
    return {
      title: platformTitles[platform] || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video ${videoId}`,
      duration: 300, // Default 5 minutes
      thumbnail: 'https://via.placeholder.com/320x180?text=Video'
    };
  }
}

/**
 * Extract transcript from video with time limit for guests
 */
export async function extractTranscript(
  url: string,
  options: {
    language?: string;
    maxDuration?: number;
    isGuest?: boolean;
  } = {}
): Promise<{
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}> {
  const { language, maxDuration = 600, isGuest = false } = options;
  
  console.log('🎬 STEP 1: Starting video transcript extraction...');
  console.log(`📹 Video URL: ${url}`);
  console.log(`👤 Guest mode: ${isGuest}`);
  console.log(`⏱️ Max duration: ${maxDuration}s`);
  console.log('⏳ Pausing for 2 seconds to show step...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Check if audio extractor is available
    console.log('🔍 STEP 2: Checking audio extraction availability...');
    const isAudioExtractorAvailable = await audioExtractor.isAvailable();
    if (!isAudioExtractorAvailable) {
      throw new Error('Audio extraction not available in this environment');
    }
    console.log('✅ Audio extractor is available!');
    console.log('⏳ Pausing for 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract audio from video
    console.log('🎵 STEP 3: Downloading video and extracting audio...');
    console.log('📥 Starting video download and MP3 extraction...');
    const audioResult = await audioExtractor.extractAudio(url);
    console.log('✅ Audio extraction completed!');
    console.log(`🎧 Audio file created: ${audioResult.audioPath}`);
    console.log(`⏱️ Audio duration: ${audioResult.duration}s`);
    console.log('⏳ Pausing for 2 seconds to show step...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Apply time limit for guests
      if (isGuest && audioResult.duration > maxDuration) {
        throw new Error(`Video duration (${Math.round(audioResult.duration)}s) exceeds guest limit of ${maxDuration}s`);
      }
      
      // Transcribe audio
      console.log('🤖 STEP 4: Starting AI transcription...');
      console.log('🎙️ Sending audio to transcription service...');
      console.log(`🌐 Language: ${language || 'auto-detect'}`);
      const transcriptionResult = await transcriptionService.transcribeAudio(
        audioResult.audioPath,
        {
          language,
          maxDuration: isGuest ? maxDuration : undefined
        }
      );
      console.log('✅ Transcription completed!');
      console.log(`📝 Transcript length: ${transcriptionResult.text.length} characters`);
      console.log(`📊 Segments: ${transcriptionResult.segments?.length || 0}`);
      console.log('⏳ Pausing for 2 seconds to show final step...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🎉 STEP 5: Transcript extraction completed successfully!');
      console.log('📋 Returning transcript data...');
      
      return {
        text: transcriptionResult.text,
        segments: transcriptionResult.segments || []
      };
    } finally {
      // Always clean up audio file
      audioResult.cleanup();
    }
  } catch (error) {
    console.error('Transcript extraction failed:', error);
    
    // Return fallback mock transcript with error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fallbackText = `Transcript extraction failed: ${errorMessage}. This is a mock transcript for demonstration purposes.`;
    
    return {
      text: fallbackText,
      segments: [
        {
          start: 0,
          end: 30,
          text: fallbackText
        }
      ]
    };
  }
}

/**
 * Process video for guests (with time limits)
 */
export async function processGuestVideo(
  videoUrl: string,
  progressCallback?: (status: string, stage: string, estimatedTime?: number) => void
): Promise<ProcessingResult> {
  try {
    // Initialize progress
    progressCallback?.('Initializing...', 'initializing', 25);
    
    const platform = detectPlatform(videoUrl);
    const videoInfo = await extractVideoInfo(videoUrl);
    
    // Calculate more accurate time estimates based on video duration
    const videoDuration = Math.min(videoInfo.duration || 60, 60); // Guest limit: 1 minute
    const downloadTime = Math.max(5, videoDuration * 0.3); // 5-18 seconds
    const extractionTime = Math.max(3, videoDuration * 0.2); // 3-12 seconds  
    const transcriptionTime = Math.max(8, videoDuration * 0.8); // 8-48 seconds
    const finalizingTime = 2; // 2 seconds
    const totalEstimatedTime = downloadTime + extractionTime + transcriptionTime + finalizingTime;
    
    progressCallback?.('Downloading video info...', 'downloading', totalEstimatedTime - 2);
    
    // Check guest time limit (10 minutes = 600 seconds)
    const maxDuration = 600; // 10 minutes for guests
    if (videoInfo.duration > maxDuration) {
      console.log(`Guest video duration: ${videoInfo.duration}s, limiting to first ${maxDuration}s`);
    }

    // Extract audio
    progressCallback?.('Extracting audio from video...', 'extracting', extractionTime + transcriptionTime + finalizingTime);
    
    // Extract transcript with guest limitations
    progressCallback?.('Transcribing audio with AI...', 'transcribing', transcriptionTime + finalizingTime);
    const transcript = await extractTranscript(videoUrl, {
      language: undefined, // Let OpenAI auto-detect language
      maxDuration,
      isGuest: true
    });

    // Finalize
    progressCallback?.('Finalizing transcript...', 'finalizing', finalizingTime);
    
    return {
      metadata: {
        platform,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail
      },
      transcript
    };
  } catch (error) {
    console.error('Guest video processing error:', error);
    throw error;
  }
}

/**
 * Process video for authenticated users (no time limits)
 */
export async function processVideo(
  url: string, 
  language?: string,
  progressCallback?: (status: string, stage: string, estimatedTime?: number) => void
): Promise<VideoProcessingResult> {
  if (!isValidVideoUrl(url)) {
    throw new Error('Invalid video URL format');
  }

  const platform = detectPlatform(url);
  
  try {
    // Initialize progress
    progressCallback?.('Initializing...', 'initializing', 30);
    
    // Extract video metadata
    progressCallback?.('Downloading video info...', 'downloading', 25);
    const videoInfo = await extractVideoInfo(url);
    
    // Calculate estimated time based on video duration
    const videoDuration = videoInfo.duration || 300; // Default 5 minutes
    const estimatedTime = Math.max(15, videoDuration * 0.1); // At least 15 seconds
    
    // Extract transcript without time limits
    progressCallback?.('Transcribing audio with AI...', 'transcribing', estimatedTime);
    const transcript = await extractTranscript(url, {
      language,
      isGuest: false
    });
    
    // Finalize
    progressCallback?.('Finalizing transcript...', 'finalizing', 2);
    
    return {
      transcript,
      metadata: {
        title: videoInfo.title,
        duration: videoInfo.duration,
        platform,
        url,
        thumbnail: videoInfo.thumbnail
      }
    };
  } catch (error) {
    console.error('Video processing failed:', error);
    throw error;
  }
}

/**
 * Check if video processing is available in current environment
 */
export async function isVideoProcessingAvailable(): Promise<{
  audioExtraction: boolean;
  transcription: boolean;
  overall: boolean;
}> {
  const audioAvailable = await audioExtractor.isAvailable();
  const transcriptionAvailable = await transcriptionService.isApiAvailable();
  
  return {
    audioExtraction: audioAvailable,
    transcription: transcriptionAvailable,
    overall: audioAvailable && transcriptionAvailable
  };
}