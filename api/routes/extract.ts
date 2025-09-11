import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, extractionRateLimit, requireSubscription, allowGuest } from '../middleware/index.js';
import { validateVideoUrl, processVideo, processGuestVideo } from '../utils/videoProcessor.js';
import type { ExtractRequest, ExtractResponse, Extraction } from '../../shared/types.js';

const router = Router();

// Apply rate limiting to extraction routes
router.use(extractionRateLimit);

// Guest extraction route - supports both authenticated and guest users
router.post('/guest', allowGuest, async (req: Request, res: Response) => {
  try {
    const { video_url, language = 'auto' }: ExtractRequest = req.body;
    const guestInfo = (req as any).guestInfo;
    const isGuest = !req.user && guestInfo?.isGuest;

    if (!video_url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Validate video URL
    const validation = validateVideoUrl(video_url);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error || 'Invalid video URL format' });
    }

    if (isGuest) {
      // Guest user logic
      const clientIP = guestInfo.ip;
      
      // Check guest usage limits
      const { data: usageCheck, error: usageError } = await supabaseAdmin
        .rpc('check_guest_usage', { p_ip_address: clientIP });
      
      if (usageError) {
        console.error('Error checking guest usage:', usageError);
        return res.status(500).json({ error: 'Failed to check usage limits' });
      }
      
      const usage = usageCheck[0];
      if (!usage.can_extract) {
        return res.status(429).json({ 
          error: 'Daily limit reached. Guest users can extract 1 video per day.',
          remaining_extractions: usage.remaining_extractions,
          reset_time: usage.reset_time,
          upgrade_message: 'Create an account for higher limits'
        });
      }

      // Process video for guest with duration limit
      try {
        const result = await processGuestVideo(video_url, clientIP);
        
        // Check video duration (1 minute = 60 seconds limit for guests)
        if (result.videoInfo.duration > 60) {
          return res.status(400).json({ 
            error: 'Video duration exceeds 1-minute limit for guest users',
            duration: result.videoInfo.duration,
            limit: 60,
            upgrade_message: 'Create an account to process longer videos'
          });
        }

        // Increment guest usage
        const { error: incrementError } = await supabaseAdmin
          .rpc('increment_guest_usage', { p_ip_address: clientIP });
        
        if (incrementError) {
          console.error('Error incrementing guest usage:', incrementError);
          // Continue anyway, don't fail the request
        }

        const response: ExtractResponse = {
          extraction: {
            id: result.extractionId || '',
            user_id: null,
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
          },
          guest_info: {
            remaining_extractions: usage.remaining_extractions - 1,
            reset_time: usage.reset_time
          }
        };

        res.json(response);
      } catch (processingError) {
        console.error('Guest video processing error:', processingError);
        return res.status(500).json({ error: processingError instanceof Error ? processingError.message : 'Failed to process video' });
      }
    } else {
      // Authenticated user logic (existing functionality)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayExtractions, error: countError } = await supabaseAdmin
        .from('extractions')
        .select('id')
        .eq('user_id', req.user!.id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z');

      if (countError) {
        console.error('Error checking extraction count:', countError);
        return res.status(500).json({ error: 'Failed to check extraction limits' });
      }

      const dailyLimit = req.user!.subscription_tier === 'pro' ? 100 : 5;
      if (todayExtractions && todayExtractions.length >= dailyLimit) {
        return res.status(429).json({ 
          error: `Daily extraction limit reached (${dailyLimit} extractions per day)`,
          upgrade_required: req.user!.subscription_tier === 'free'
        });
      }

      // Process video using the existing authenticated flow
      try {
        const result = await processVideo(video_url, req.user!.id);
        
        const response: ExtractResponse = {
          extraction: {
            id: '', // Will be set by database
            user_id: req.user!.id,
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
    }
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    const dailyLimit = req.user.subscription_tier === 'pro' ? 100 : 5;
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