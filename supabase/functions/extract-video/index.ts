import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ExtractVideoRequest {
  video_url: string;
  language?: string;
  session_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { video_url, language = 'auto', session_id }: ExtractVideoRequest = await req.json();

    if (!video_url) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate video URL format
    const urlPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?bilibili\.com\/video\/[a-zA-Z0-9]+/,
      /^https?:\/\/(www\.)?xiaohongshu\.com\/(explore\/|discovery\/item\/)?[a-zA-Z0-9]+/
    ];

    const isValidUrl = urlPatterns.some(pattern => pattern.test(video_url));
    if (!isValidUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid video URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mock extraction process for authenticated users (no time limits)
    const extractionId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock transcript data
    const mockTranscript = {
      text: `This is a mock transcript for the video: ${video_url}. In a real implementation, this would contain the actual extracted transcript from the video using AI transcription services like OpenAI Whisper or similar technologies.`,
      segments: [
        {
          start: 0,
          end: 5,
          text: "This is a mock transcript for the video."
        },
        {
          start: 5,
          end: 10,
          text: "In a real implementation, this would contain the actual extracted transcript."
        }
      ]
    };

    // Create extraction record in database
    const extraction = {
      id: extractionId,
      user_id: user.id,
      video_url,
      platform: video_url.includes('youtube') ? 'youtube' : video_url.includes('bilibili') ? 'bilibili' : 'xiaohongshu',
      video_title: `Mock Video Title - ${new Date().toISOString()}`,
      video_duration: 300, // 5 minutes
      transcript_text: mockTranscript.text,
      transcript_segments: mockTranscript.segments,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into database
    const { error: insertError } = await supabaseClient
      .from('extractions')
      .insert(extraction);

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save extraction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ extraction }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extract video error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});