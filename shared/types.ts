// Shared TypeScript types for Video Transcript Extractor

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      extractions: {
        Row: Extraction;
        Insert: Omit<Extraction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Extraction, 'id' | 'created_at' | 'updated_at'>>;
      };
      export_jobs: {
        Row: ExportJob;
        Insert: Omit<ExportJob, 'id' | 'created_at'>;
        Update: Partial<Omit<ExportJob, 'id' | 'created_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// User related types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  usage_count: number;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  usage_count: number;
}

// Video platform types
export type VideoPlatform = 'youtube' | 'bilibili' | 'redbook';

export interface VideoInfo {
  url: string;
  platform: VideoPlatform;
  title?: string;
  duration?: number; // in seconds
  thumbnail?: string;
}

// Transcript related types
export interface TranscriptSegment {
  start: number; // timestamp in seconds
  end: number; // timestamp in seconds
  text: string;
}

export interface Extraction {
  id: string;
  user_id: string;
  video_url: string;
  platform: VideoPlatform;
  video_title?: string;
  video_duration?: number;
  transcript_text?: string;
  transcript_segments?: TranscriptSegment[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Export related types
export type ExportFormat = 'txt' | 'srt' | 'vtt' | 'json';

export interface ExportJob {
  id: string;
  user_id: string;
  extraction_id: string;
  format: ExportFormat;
  file_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

// Subscription related types
export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  current_period_start?: string;
  current_period_end?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response Types
export interface ExtractVideoRequest {
  video_url: string;
  language?: string;
}

export interface ExtractRequest {
  video_url: string;
  language?: string;
}

export interface ExtractVideoResponse {
  extraction: Extraction;
  message: string;
}

export interface ExtractResponse {
  extraction: Extraction;
  message?: string;
  transcript?: {
    text: string;
    segments: any[];
  };
  guest_info?: {
    remaining_extractions: number;
    reset_time: string;
  };
}

export interface ExportRequest {
  extraction_id: string;
  format: ExportFormat;
  include_timestamps?: boolean;
}

export interface ExportTranscriptRequest {
  extraction_id: string;
  format: ExportFormat;
}

export interface ExportTranscriptResponse {
  export_job_id: string;
  status: string;
  message: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// API Error types
export interface ApiError {
  error: string;
  message: string;
  status_code: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Usage limits by subscription tier
export const USAGE_LIMITS = {
  free: {
    monthly_extractions: 5,
    max_video_duration: 600, // 10 minutes
    export_formats: ['txt'] as ExportFormat[]
  },
  pro: {
    monthly_extractions: 100,
    max_video_duration: 3600, // 1 hour
    export_formats: ['txt', 'srt', 'vtt', 'json'] as ExportFormat[]
  },
  enterprise: {
    monthly_extractions: -1, // unlimited
    max_video_duration: -1, // unlimited
    export_formats: ['txt', 'srt', 'vtt', 'json'] as ExportFormat[]
  }
} as const;

// Platform URL patterns for validation
export const PLATFORM_PATTERNS = {
  youtube: [
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ],
  bilibili: [
    /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]{10}|av\d+)/
  ],
  redbook: [
    /^https?:\/\/(www\.)?xiaohongshu\.com\/explore\/[a-zA-Z0-9]+/,
    /^https?:\/\/(www\.)?xhslink\.com\/[a-zA-Z0-9]+/
  ]
} as const;

// Utility type for API responses
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ApiError;
};