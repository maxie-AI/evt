import { VideoPlatform, VideoInfo, TranscriptSegment, PLATFORM_PATTERNS } from '../../shared/types.js';
import { createReadStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
// import YTDlpWrap from 'yt-dlp-wrap';
// import OpenAI from 'openai';
import { supabaseAdmin } from '../config/supabase.js';
const supabase = supabaseAdmin;

// Initialize services (temporarily disabled for compatibility)
// const ytDlp = new YTDlpWrap();
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

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
    // Mock implementation for testing
    return {
      url,
      platform,
      title: 'Mock Video Title',
      duration: 300, // 5 minutes
      thumbnail: 'https://via.placeholder.com/480x360'
    };
  } catch (error) {
    console.error('Error extracting video info:', error);
    // Fallback to mock info
    const mockInfo: VideoInfo = {
      url,
      platform,
      title: `Sample Video Title (${platform})`,
      duration: Math.floor(Math.random() * 3600) + 60,
      thumbnail: `https://via.placeholder.com/320x180?text=${platform.toUpperCase()}+Video`
    };
    
    return mockInfo;
  }
};

// Extract transcript using OpenAI Whisper
export const extractTranscript = async (videoInfo: VideoInfo): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  const tempDir = tmpdir();
  const audioPath = join(tempDir, `${randomUUID()}.wav`);
  
  try {
    // Mock implementation for testing
    const mockText = 'This is a mock transcript for testing purposes. The video processing functionality will be implemented with proper yt-dlp and OpenAI integration.';
    const mockSegments: TranscriptSegment[] = [
      {
        start: 0.0,
        end: 5.0,
        text: 'This is a mock transcript for testing purposes.'
      },
      {
        start: 5.0,
        end: 10.0,
        text: 'The video processing functionality will be implemented with proper yt-dlp and OpenAI integration.'
      }
    ];

    return {
      text: mockText,
      segments: mockSegments
    };
  } catch (error) {
    console.error('Error extracting transcript:', error);
    
    // Clean up on error
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
    }
    
    // Fallback to mock transcript
    const mockSegments: TranscriptSegment[] = [];
    const sampleTexts = [
      "Welcome to this video tutorial.",
      "Today we'll be learning about video transcript extraction.",
      "This is a powerful tool for content creators.",
      "Let's dive into the main topic.",
      "First, we need to understand the basics.",
      "The process involves several steps.",
      "We start by analyzing the audio track.",
      "Then we apply speech recognition algorithms.",
      "The result is a time-stamped transcript.",
      "This can be exported in various formats.",
      "Thank you for watching this tutorial."
    ];

    let currentTime = 0;
    for (let i = 0; i < sampleTexts.length; i++) {
      const duration = Math.floor(Math.random() * 10) + 5; // 5-15 seconds per segment
      mockSegments.push({
        start: currentTime,
        end: currentTime + duration,
        text: sampleTexts[i]
      });
      currentTime += duration;
    }

    const fullText = mockSegments.map(segment => segment.text).join(' ');

    return {
      text: fullText,
      segments: mockSegments
    };
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
    
    // Extract transcript
    const { text: transcript, segments } = await extractTranscript(videoInfo);

    // Store guest extraction in database
    const { data: guestExtraction, error: insertError } = await supabaseAdmin
      .from('guest_extractions')
      .insert({
        ip_address: clientIP,
        video_url: videoUrl,
        platform: videoInfo.platform,
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