// Test script to verify the production fix is working
import { api } from './src/lib/supabase.js';

async function testProductionFix() {
  console.log('Testing production fix - should connect to Supabase Edge Function...');
  
  try {
    // Test the extract/guest endpoint
    const result = await api.call('/api/extract/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        language: 'auto'
      })
    });
    
    console.log('\n=== EXTRACT RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Check if we got real processing or fallback
    if (result.extraction && result.extraction.transcript_text) {
      const transcript = result.extraction.transcript_text;
      
      if (transcript.includes('fallback system')) {
        console.log('\n❌ STILL USING FALLBACK DATA');
        console.log('The app is not connecting to Supabase Edge Functions properly.');
      } else {
        console.log('\n✅ REAL VIDEO PROCESSING DETECTED');
        console.log('The app is successfully connecting to Supabase Edge Functions!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Run the test
testProductionFix();