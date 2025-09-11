import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken } from '../middleware/index';
import type { ExportRequest, ExportJob, ExportFormat } from '../../shared/types';

const router = Router();

// Helper function to format transcript based on export format
function formatTranscript(text: string, segments: any[], format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return text;
    
    case 'srt':
      return segments.map((segment, index) => {
        const startTime = formatSRTTime(segment.start || 0);
        const endTime = formatSRTTime(segment.end || segment.start + 5);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      }).join('\n');
    
    case 'vtt':
      const vttHeader = 'WEBVTT\n\n';
      const vttContent = segments.map(segment => {
        const startTime = formatVTTTime(segment.start || 0);
        const endTime = formatVTTTime(segment.end || segment.start + 5);
        return `${startTime} --> ${endTime}\n${segment.text}\n`;
      }).join('\n');
      return vttHeader + vttContent;
    
    case 'json':
      return JSON.stringify({
        text,
        segments,
        metadata: {
          format: 'json',
          exported_at: new Date().toISOString()
        }
      }, null, 2);
    
    default:
      return text;
  }
}

// Helper function to format time for SRT format (HH:MM:SS,mmm)
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

// Helper function to format time for VTT format (HH:MM:SS.mmm)
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Get MIME type for export format
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'txt': return 'text/plain';
    case 'srt': return 'application/x-subrip';
    case 'vtt': return 'text/vtt';
    case 'json': return 'application/json';
    default: return 'text/plain';
  }
}

// Export transcript
router.post('/transcript', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { extraction_id, format = 'txt', include_timestamps = false }: ExportRequest = req.body;

    if (!extraction_id) {
      return res.status(400).json({ error: 'Extraction ID is required' });
    }

    // Validate format
    const validFormats: ExportFormat[] = ['txt', 'srt', 'vtt', 'json'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid export format' });
    }

    // Get extraction data
    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .eq('id', extraction_id)
      .eq('user_id', req.user.id)
      .single();

    if (extractionError || !extraction) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    if (extraction.status !== 'completed') {
      return res.status(400).json({ error: 'Extraction is not completed yet' });
    }

    if (!extraction.transcript_text) {
      return res.status(400).json({ error: 'No transcript available for this extraction' });
    }

    // Create export job record
    const { data: exportJob, error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        user_id: req.user.id,
        extraction_id,
        format,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError || !exportJob) {
      console.error('Error creating export job:', jobError);
      return res.status(500).json({ error: 'Failed to create export job' });
    }

    try {
      // Format transcript based on requested format
      const segments = extraction.transcript_segments || [];
      const formattedContent = formatTranscript(
        extraction.transcript_text,
        segments,
        format
      );

      // Update export job status
      await supabaseAdmin
        .from('export_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', exportJob.id);

      // Set appropriate headers for file download
      const filename = `transcript_${extraction.id}.${format}`;
      const mimeType = getMimeType(format);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(formattedContent, 'utf8'));
      
      res.send(formattedContent);
    } catch (formatError) {
      console.error('Export formatting error:', formatError);
      
      // Update export job status to failed
      await supabaseAdmin
        .from('export_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to format transcript'
        })
        .eq('id', exportJob.id);

      return res.status(500).json({ error: 'Failed to format transcript' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get export job status
router.get('/job/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    const { data: exportJob, error } = await supabaseAdmin
      .from('export_jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json({ export_job: exportJob });
  } catch (error) {
    console.error('Get export job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's export history
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: exportJobs, error } = await supabaseAdmin
      .from('export_jobs')
      .select(`
        *,
        extractions (
          video_title,
          video_url,
          platform
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get export history error:', error);
      return res.status(500).json({ error: 'Failed to fetch export history' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('export_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      console.error('Get count error:', countError);
      return res.status(500).json({ error: 'Failed to get export count' });
    }

    res.json({
      export_jobs: exportJobs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get export history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;