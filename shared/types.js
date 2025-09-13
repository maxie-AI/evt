"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_PATTERNS = exports.USAGE_LIMITS = void 0;
exports.USAGE_LIMITS = {
    free: {
        monthly_extractions: 5,
        max_video_duration: 600,
        export_formats: ['txt']
    },
    pro: {
        monthly_extractions: 100,
        max_video_duration: 3600,
        export_formats: ['txt', 'srt', 'vtt', 'json']
    },
    enterprise: {
        monthly_extractions: -1,
        max_video_duration: -1,
        export_formats: ['txt', 'srt', 'vtt', 'json']
    }
};
exports.PLATFORM_PATTERNS = {
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
};
