import fetch from 'node-fetch';

async function testTranscription() {
  try {
    console.log('Testing transcription API with YouTube URL: https://www.youtube.com/watch?v=reUZRyXxUs4');
    console.log('Making API call to /api/extract/guest...');
    
    const response = await fetch('http://localhost:3001/api/extract/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_url: 'https://www.youtube.com/watch?v=reUZRyXxUs4'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\n=== TRANSCRIPTION RESULTS ===');
    console.log('Video Title:', result.extraction.video_title);
    console.log('Platform:', result.extraction.platform);
    console.log('Duration:', result.extraction.video_duration, 'seconds');
    console.log('Status:', result.extraction.status);
    
    console.log('\n=== TRANSCRIPT TEXT ===');
    console.log(result.transcript.text);
    
    console.log('\n=== TRANSCRIPT SEGMENTS ===');
    if (result.transcript.segments && result.transcript.segments.length > 0) {
      console.log(`Found ${result.transcript.segments.length} segments:`);
      result.transcript.segments.slice(0, 5).forEach((segment, index) => {
        console.log(`Segment ${index + 1}: [${segment.start}s - ${segment.end}s] ${segment.text}`);
      });
      if (result.transcript.segments.length > 5) {
        console.log(`... and ${result.transcript.segments.length - 5} more segments`);
      }
    }
    
    if (result.guest_info) {
      console.log('\n=== GUEST INFO ===');
      console.log('Remaining extractions:', result.guest_info.remaining_extractions);
      console.log('Reset time:', result.guest_info.reset_time);
    }
    
    console.log('\n✅ Transcription test completed successfully!');
    
  } catch (error) {
    console.error('❌ Transcription test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response text:', await error.response.text());
    }
  }
}

testTranscription();