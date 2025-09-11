import { Router, Request, Response } from 'express';
import { allowGuest } from '../middleware/index.js';

const router = Router();

// Store active progress streams
const progressStreams = new Map<string, Response>();

// SSE endpoint for progress updates
router.get('/stream/:sessionId', allowGuest, (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store the response stream
  progressStreams.set(sessionId, res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    progressStreams.delete(sessionId);
  });

  req.on('aborted', () => {
    progressStreams.delete(sessionId);
  });
});

// Function to send progress update to a specific session
export function sendProgressUpdate(
  sessionId: string, 
  status: string, 
  stage: string, 
  estimatedTime?: number
) {
  const stream = progressStreams.get(sessionId);
  if (stream) {
    const data = {
      type: 'progress',
      status,
      stage,
      estimatedTime,
      timestamp: new Date().toISOString()
    };
    
    try {
      stream.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending progress update:', error);
      progressStreams.delete(sessionId);
    }
  }
}

// Function to complete progress stream
export function completeProgress(sessionId: string) {
  const stream = progressStreams.get(sessionId);
  if (stream) {
    try {
      stream.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      stream.end();
    } catch (error) {
      console.error('Error completing progress stream:', error);
    } finally {
      progressStreams.delete(sessionId);
    }
  }
}

export default router;