import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, extractionRateLimit, requireSubscription } from '../middleware/index.js';
import { validateVideoUrl, processVideo } from '../utils/videoProcessor.js';
import type { ExtractRequest, ExtractResponse, Extraction } from '../../shared/types.js';

const router = Router();

// Apply rate limiting to extraction routes
router.use(extractionRateLimit);

// Extract transcript from video URL
router.post('/video', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { video_url, language = 'auto' }: ExtractRequest = req.body;

    if (!video_url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Validate video URL
    const validation = validateVideoUrl(video_url);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error || 'Invalid video URL format' });
    }

    // Check user's extraction limits based on subscription
    const today = new Date().toISOString().split('T')[0];
    const { data: todayExtractions, error: countError } = await supabaseAdmin
      .from('extractions')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    if (countError) {
      console.error('Error checking extraction count:', countError);
      return res.status(500).json({ error: 'Failed to check extraction limits' });
    }

    const dailyLimit = req.user.subscription_tier === 'premium' ? 100 : 5;
    if (todayExtractions && todayExtractions.length >= dailyLimit) {
      return res.status(429).json({ 
        error: `Daily extraction limit reached (${dailyLimit} extractions per day)`,
        upgrade_required: req.user.subscription_tier === 'free'
      });
    }

    // Process video using the integrated video processor
    try {
      const result = await processVideo(video_url, req.user.id);
      
      const response: ExtractResponse = {
        extraction: {
          id: '', // Will be set by database
          user_id: req.user.id,
          video_url,
          platform: result.videoInfo.platform,
          video_title: result.videoInfo.title,
          video_duration: result.videoInfo.duration,
          transcript_text: result.transcript,
          transcript_segments: result.segments,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Extraction,
        transcript: {
          text: result.transcript,
          segments: result.segments
        }
      };

      res.json(response);
    } catch (processingError) {
      console.error('Video processing error:', processingError);
      return res.status(500).json({ error: processingError instanceof Error ? processingError.message : 'Failed to process video' });
    }
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get extraction by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    const { data: extraction, error } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !extraction) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    res.json({ extraction });
  } catch (error) {
    console.error('Get extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's extraction history
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: extractions, error } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get extractions error:', error);
      return res.status(500).json({ error: 'Failed to fetch extractions' });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      console.error('Get count error:', countError);
      return res.status(500).json({ error: 'Failed to get extraction count' });
    }

    res.json({
      extractions,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get extractions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete extraction
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('extractions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Delete extraction error:', error);
      return res.status(500).json({ error: 'Failed to delete extraction' });
    }

    res.json({ message: 'Extraction deleted successfully' });
  } catch (error) {
    console.error('Delete extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;