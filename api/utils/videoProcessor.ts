import { VideoPlatform, VideoInfo, TranscriptSegment, PLATFORM_PATTERNS } from '../../shared/types';
import { audioExtractor } from './audioExtractor';
import { transcriptionService } from './transcriptionService';
import { supabaseAdmin } from '../config/supabase';
const supabase = supabaseAdmin;

export interface ProcessingResult {
  videoInfo: VideoInfo;
  transcript: string;
  segments: TranscriptSegment[];
}

// Detect video platform from URL
export const detectPlatform = (url: string): VideoPlatform | null => {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as VideoPlatform;
      }
    }
  }
  return null;
};

// Validate video URL
export const validateVideoUrl = (url: string): { isValid: boolean; platform?: VideoPlatform; error?: string } => {
  try {
    new URL(url); // Basic URL validation
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return { isValid: false, error: 'Unsupported video platform' };
  }

  return { isValid: true, platform };
};

// Extract video ID from URL
export const extractVideoId = (url: string, platform: VideoPlatform): string | null => {
  switch (platform) {
    case 'youtube': {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    }
    case 'bilibili': {
      const match = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]{10}|av\d+)/);
      return match ? match[1] : null;
    }
    case 'redbook': {
      const match = url.match(/(?:xiaohongshu\.com\/explore\/|xhslink\.com\/)([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    default:
      return null;
  }
};

// Extract video info using yt-dlp
export const extractVideoInfo = async (url: string, platform: VideoPlatform): Promise<VideoInfo> => {
  const videoId = extractVideoId(url, platform);
  
  try {
    // Use real yt-dlp to get video information
    const videoInfo = await audioExtractor.getVideoInfo(url);
    
    return {
      url,
      platform,
      title: videoInfo.title,
      duration: videoInfo.duration,
      thumbnail: videoInfo.thumbnail || `https://via.placeholder.com/320x180?text=${platform.toUpperCase()}+Video`
    };
  } catch (error) {
    console.error('Error extracting video info:', error);
    // Fallback to basic info with video ID
    const fallbackInfo: VideoInfo = {
      url,
      platform,
      title: `Video ${videoId || 'Unknown'}`,
      duration: 0,
      thumbnail: `https://via.placeholder.com/320x180?text=${platform.toUpperCase()}+Video`
    };
    
    return fallbackInfo;
  }
};

// Extract transcript using OpenAI Whisper
export const extractTranscript = async (videoInfo: VideoInfo): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  return extractTranscriptWithLimit(videoInfo);
};

// Extract transcript with time limit (for guest users)
export const extractTranscriptWithLimit = async (videoInfo: VideoInfo, maxDurationSeconds?: number): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  let audioResult: any = null;
  
  try {
    console.log(`Starting transcript extraction for: ${videoInfo.title}`);
    
    // Check if services are available
    const isAudioExtractorAvailable = await audioExtractor.isAvailable();
    const isTranscriptionAvailable = await transcriptionService.isAvailable();
    
    if (!isAudioExtractorAvailable) {
      throw new Error('yt-dlp is not available. Please ensure it is installed.');
    }
    
    if (!isTranscriptionAvailable) {
      throw new Error('OpenAI API is not available. Please check your API key configuration.');
    }

    // Extract audio from video
    console.log('Extracting audio from video...');
    audioResult = await audioExtractor.extractAudio(videoInfo.url);
    
    // Validate file size before transcription
    const isValidSize = await transcriptionService.validateFileSize(audioResult.audioPath);
    if (!isValidSize) {
      throw new Error('Audio file is too large for transcription (max 25MB)');
    }

    // Transcribe audio using Whisper
    console.log('Transcribing audio with Whisper...');
    const transcriptionResult = await transcriptionService.transcribeAudio(audioResult.audioPath);
    
    // Apply time limit to segments if specified (for guest users)
    let finalSegments = transcriptionResult.segments;
    if (maxDurationSeconds) {
      finalSegments = transcriptionResult.segments.filter(segment => segment.start < maxDurationSeconds);
      // Adjust the last segment if it extends beyond the limit
      if (finalSegments.length > 0) {
        const lastSegment = finalSegments[finalSegments.length - 1];
        if (lastSegment.end > maxDurationSeconds) {
          lastSegment.end = maxDurationSeconds;
        }
      }
    }

    const finalText = finalSegments.map(segment => segment.text).join(' ');
    
    console.log(`Transcript extraction completed: ${finalSegments.length} segments`);

    return {
      text: finalText,
      segments: finalSegments
    };
  } catch (error) {
    console.error('Error extracting transcript:', error);
    
    // Fallback to mock transcript for development/testing
    console.log('Falling back to mock transcript due to error');
    const mockSegments: TranscriptSegment[] = [
      {
        start: 0.0,
        end: 10.0,
        text: `[Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}] This is a fallback transcript for ${videoInfo.title}.`
      },
      {
        start: 10.0,
        end: 20.0,
        text: 'Please check your yt-dlp installation and OpenAI API key configuration.'
      }
    ];

    // Apply time limit if specified (for guest users)
    let finalSegments = mockSegments;
    if (maxDurationSeconds) {
      finalSegments = mockSegments.filter(segment => segment.start < maxDurationSeconds);
      if (finalSegments.length > 0) {
        const lastSegment = finalSegments[finalSegments.length - 1];
        if (lastSegment.end > maxDurationSeconds) {
          lastSegment.end = maxDurationSeconds;
        }
      }
    }

    const fullText = finalSegments.map(segment => segment.text).join(' ');

    return {
      text: fullText,
      segments: finalSegments
    };
  } finally {
    // Always cleanup audio file
    if (audioResult && audioResult.cleanup) {
      audioResult.cleanup();
    }
  }
};

// Main processing function
export const processVideo = async (url: string, userId: string): Promise<ProcessingResult> => {
  // Validate URL
  const validation = validateVideoUrl(url);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid video URL');
  }
  
  // Extract video info
  const videoInfo = await extractVideoInfo(url, validation.platform!);
  
  // Extract transcript
  const { text: transcript, segments } = await extractTranscript(videoInfo);
  
  // Store in database
  const { data: extraction, error } = await supabase
    .from('extractions')
    .insert({
      user_id: userId,
      video_url: url,
      platform: videoInfo.platform,
      video_title: videoInfo.title,
      video_duration: videoInfo.duration,
      transcript_text: transcript,
      transcript_segments: segments,
      status: 'completed'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error storing extraction:', error);
    throw new Error('Failed to store extraction');
  }
  
  return {
    videoInfo,
    transcript,
    segments
  };
};

// Format transcript for different export formats
export const formatTranscript = (segments: TranscriptSegment[], format: string): string => {
  switch (format) {
    case 'txt':
      return segments.map(segment => segment.text).join('\n\n');
    
    case 'srt': {
      let srt = '';
      segments.forEach((segment, index) => {
        const startTime = formatSRTTime(segment.start);
        const endTime = formatSRTTime(segment.end);
        srt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      });
      return srt;
    }
    
    case 'vtt': {
      let vtt = 'WEBVTT\n\n';
      segments.forEach(segment => {
        const startTime = formatVTTTime(segment.start);
        const endTime = formatVTTTime(segment.end);
        vtt += `${startTime} --> ${endTime}\n${segment.text}\n\n`;
      });
      return vtt;
    }
    
    case 'json':
      return JSON.stringify({ segments }, null, 2);
    
    default:
      return segments.map(segment => segment.text).join('\n\n');
  }
};

// Helper function to format time for SRT
const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

// Helper function to format time for VTT
const formatVTTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// Process video for guest users with IP tracking
export async function processGuestVideo(videoUrl: string, clientIP: string): Promise<{
  videoInfo: VideoInfo;
  transcript: string;
  segments: TranscriptSegment[];
  extractionId?: string;
}> {
  try {
    // Validate video URL
    const validation = validateVideoUrl(videoUrl);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid video URL');
    }

    const platform = detectPlatform(videoUrl);
    const videoId = extractVideoId(videoUrl, platform!);

    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    // Extract video information
    const videoInfo = await extractVideoInfo(videoUrl, platform!);
    
    // Extract transcript with 60-second limit for guest users
    const { text: transcript, segments } = await extractTranscriptWithLimit(videoInfo, 60);

    // Store guest extraction in database
    const { data: guestExtraction, error: insertError } = await supabaseAdmin
      .from('guest_extractions')
      .insert({
        ip_address: clientIP,
        video_url: videoUrl,
        video_platform: videoInfo.platform,
        video_title: videoInfo.title,
        video_duration: videoInfo.duration,
        transcript_text: transcript,
        transcript_segments: segments
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing guest extraction:', insertError);
      // Don't throw error, just log it - we can still return the result
    }

    return {
      videoInfo,
      transcript,
      segments,
      extractionId: guestExtraction?.id
    };
  } catch (error) {
    console.error('Error processing guest video:', error);
    throw error;
  }
}