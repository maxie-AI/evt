// Test script to verify the extract functionality is working with real Supabase Edge Functions
import { api } from './src/lib/supabase.js';

async function testExtractFunctionality() {
  console.log('Testing extract functionality...');
  
  try {
    const result = await api.call('/api/extract/guest', {
      method: 'POST',
      body: JSON.stringify({
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        language: 'auto'
      })
    });
    
    console.log('Extract result:', result);
    
    // Check if we got a real response (not fallback)
    if (result.extraction && result.extraction.id && result.extraction.id.startsWith('guest_')) {
      console.log('✅ SUCCESS: Real Supabase Edge Function is working!');
      console.log('Extraction ID:', result.extraction.id);
      console.log('Guest info:', result.guest_info);
    } else if (result.sessionId && result.sessionId.startsWith('mock_')) {
      console.log('❌ FALLBACK: Still using fallback system');
      console.log('Fallback response:', result);
    } else {
      console.log('❓ UNKNOWN: Unexpected response format');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

testExtractFunctionality();