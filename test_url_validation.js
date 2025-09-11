// Test script for URL validation functionality
import { validateVideoUrl, detectPlatform, extractVideoId } from './api/utils/videoProcessor.js';

// Test URLs for different platforms
const testUrls = [
  // YouTube URLs
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  
  // Bilibili URLs
  'https://www.bilibili.com/video/BV1xx411c7mD',
  'https://www.bilibili.com/video/av123456',
  
  // Redbook URLs
  'https://www.xiaohongshu.com/explore/abc123def456',
  'https://xhslink.com/xyz789',
  
  // Invalid URLs
  'https://www.example.com/video',
  'not-a-url',
  ''
];

console.log('Testing URL validation functionality...');
console.log('=' .repeat(50));

testUrls.forEach((url, index) => {
  console.log(`\nTest ${index + 1}: ${url}`);
  
  // Test platform detection
  const platform = detectPlatform(url);
  console.log(`  Platform: ${platform || 'unknown'}`);
  
  // Test URL validation
  const validation = validateVideoUrl(url);
  console.log(`  Valid: ${validation.isValid}`);
  if (!validation.isValid && validation.error) {
    console.log(`  Error: ${validation.error}`);
  }
  
  // Test video ID extraction if valid
  if (validation.isValid && validation.platform) {
    const videoId = extractVideoId(url, validation.platform);
    console.log(`  Video ID: ${videoId || 'not found'}`);
  }
});

console.log('\n' + '=' .repeat(50));
console.log('URL validation tests completed.');