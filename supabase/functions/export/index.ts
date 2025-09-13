import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ExportRequest {
  extraction_id: string;
  format: 'txt' | 'srt' | 'vtt' | 'json';
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function exportToTXT(text: string): string {
  return text;
}

function exportToSRT(segments: TranscriptSegment[]): string {
  return segments.map((segment, index) => {
    const startTime = formatTime(segment.start);
    const endTime = formatTime(segment.end);
    return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
  }).join('\n');
}

function exportToVTT(segments: TranscriptSegment[]): string {
  const header = 'WEBVTT\n\n';
  const content = segments.map((segment, index) => {
    const startTime = formatTimeVTT(segment.start);
    const endTime = formatTimeVTT(segment.end);
    return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
  }).join('\n');
  return header + content;
}

function exportToJSON(extraction: any): string {
  return JSON.stringify({
    id: extraction.id,
    video_url: extraction.video_url,
    video_title: extraction.video_title,
    platform: extraction.platform,
    duration: extraction.video_duration,
    transcript: {
      text: extraction.transcript_text,
      segments: extraction.transcript_segments
    },
    created_at: extraction.created_at
  }, null, 2);
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { extraction_id, format }: ExportRequest = await req.json();

    if (!extraction_id || !format) {
      return new Response(
        JSON.stringify({ error: 'Extraction ID and format are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['txt', 'srt', 'vtt', 'json'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Supported formats: txt, srt, vtt, json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get extraction from database
    const { data: extraction, error: fetchError } = await supabaseClient
      .from('extractions')
      .select('*')
      .eq('id', extraction_id)
      .single();

    if (fetchError || !extraction) {
      return new Response(
        JSON.stringify({ error: 'Extraction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let exportContent: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'txt':
        exportContent = exportToTXT(extraction.transcript_text);
        contentType = 'text/plain';
        filename = `transcript_${extraction_id}.txt`;
        break;
      case 'srt':
        exportContent = exportToSRT(extraction.transcript_segments || []);
        contentType = 'text/plain';
        filename = `transcript_${extraction_id}.srt`;
        break;
      case 'vtt':
        exportContent = exportToVTT(extraction.transcript_segments || []);
        contentType = 'text/vtt';
        filename = `transcript_${extraction_id}.vtt`;
        break;
      case 'json':
        exportContent = exportToJSON(extraction);
        contentType = 'application/json';
        filename = `transcript_${extraction_id}.json`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(exportContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});