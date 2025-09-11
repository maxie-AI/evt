import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Now import modules that depend on environment variables
import { processVideo } from './api/utils/videoProcessor.ts';
import { audioExtractor } from './api/utils/audioExtractor.ts';
import { transcriptionService } from './api/utils/transcriptionService.ts';

const TEST_URL = 'https://www.youtube.com/watch?v=reUZRyXxUs4';
const TEST_USER_ID = 'test-user';

async function testTranscriptionPipeline() {
  console.log('🚀 Starting transcription pipeline test...');
  console.log(`📹 Testing URL: ${TEST_URL}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if services are available
    console.log('\n1️⃣ Checking service availability...');
    
    const isAudioExtractorAvailable = await audioExtractor.isAvailable();
    console.log(`   yt-dlp available: ${isAudioExtractorAvailable ? '✅' : '❌'}`);
    
    const isTranscriptionAvailable = await transcriptionService.isAvailable();
    console.log(`   OpenAI Whisper available: ${isTranscriptionAvailable ? '✅' : '❌'}`);
    
    if (!isAudioExtractorAvailable) {
      throw new Error('yt-dlp is not available. Please install it first.');
    }
    
    if (!isTranscriptionAvailable) {
      throw new Error('OpenAI API is not available. Please check your API key.');
    }

    // Step 2: Test video info extraction
    console.log('\n2️⃣ Extracting video information...');
    const videoInfo = await audioExtractor.getVideoInfo(TEST_URL);
    console.log(`   Title: ${videoInfo.title}`);
    console.log(`   Duration: ${Math.floor(videoInfo.duration / 60)}:${String(videoInfo.duration % 60).padStart(2, '0')}`);
    console.log(`   Thumbnail: ${videoInfo.thumbnail ? '✅' : '❌'}`);

    // Step 3: Test audio extraction
    console.log('\n3️⃣ Testing audio extraction...');
    const audioResult = await audioExtractor.extractAudio(TEST_URL);
    console.log(`   Audio file created: ${audioResult.audioPath}`);
    console.log(`   Audio duration: ${audioResult.duration} seconds`);
    console.log(`   Audio title: ${audioResult.title}`);

    // Step 4: Test file size validation
    console.log('\n4️⃣ Validating audio file size...');
    const isValidSize = await transcriptionService.validateFileSize(audioResult.audioPath);
    console.log(`   File size valid (< 25MB): ${isValidSize ? '✅' : '❌'}`);
    
    if (!isValidSize) {
      audioResult.cleanup();
      throw new Error('Audio file is too large for transcription');
    }

    // Step 5: Test transcription
    console.log('\n5️⃣ Testing transcription with Whisper...');
    const transcriptionResult = await transcriptionService.transcribeAudio(audioResult.audioPath);
    console.log(`   Transcription completed: ${transcriptionResult.segments.length} segments`);
    console.log(`   Total text length: ${transcriptionResult.text.length} characters`);
    
    // Display first few segments
    console.log('\n   📝 First 3 segments:');
    transcriptionResult.segments.slice(0, 3).forEach((segment, index) => {
      const startTime = `${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, '0')}`;
      const endTime = `${Math.floor(segment.end / 60)}:${String(Math.floor(segment.end % 60)).padStart(2, '0')}`;
      console.log(`   [${index + 1}] ${startTime}-${endTime}: ${segment.text.substring(0, 100)}${segment.text.length > 100 ? '...' : ''}`);
    });

    // Step 6: Test guest mode (first minute only)
    console.log('\n6️⃣ Testing guest mode (first minute transcription)...');
    const guestTranscript = transcriptionResult.segments.filter(segment => segment.start < 60);
    const guestText = guestTranscript.map(segment => segment.text).join(' ');
    console.log(`   Guest segments: ${guestTranscript.length}`);
    console.log(`   Guest text length: ${guestText.length} characters`);
    console.log(`   Guest preview: ${guestText.substring(0, 200)}${guestText.length > 200 ? '...' : ''}`);

    // Cleanup
    audioResult.cleanup();
    console.log('\n🧹 Cleaned up temporary files');

    // Step 7: Test full pipeline
    console.log('\n7️⃣ Testing complete pipeline with processVideo function...');
    const fullResult = await processVideo(TEST_URL, TEST_USER_ID);
    console.log(`   Pipeline result - Title: ${fullResult.videoInfo.title}`);
    console.log(`   Pipeline result - Segments: ${fullResult.segments.length}`);
    console.log(`   Pipeline result - Text length: ${fullResult.transcript.length}`);

    console.log('\n🎉 All tests passed! Transcription pipeline is working correctly.');
    console.log('=' .repeat(60));
    
    return {
      success: true,
      videoInfo,
      transcriptionResult,
      guestTranscript: { segments: guestTranscript, text: guestText },
      fullResult
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('=' .repeat(60));
    throw error;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testTranscriptionPipeline()
    .then((result) => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testTranscriptionPipeline };