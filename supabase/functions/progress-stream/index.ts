import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const sessionId = url.pathname.split('/').pop()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set up Server-Sent Events headers
    const headers = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({
          type: 'progress',
          status: 'Connected to progress stream',
          stage: 'initializing',
          estimatedTime: 30
        })}\n\n`)

        // Simulate progress updates
        const progressSteps = [
          { status: 'Analyzing video...', stage: 'analyzing', estimatedTime: 25, delay: 1000 },
          { status: 'Extracting audio...', stage: 'extracting', estimatedTime: 20, delay: 2000 },
          { status: 'Processing transcript...', stage: 'processing', estimatedTime: 15, delay: 3000 },
          { status: 'Finalizing...', stage: 'finalizing', estimatedTime: 5, delay: 4000 },
          { status: 'Complete!', stage: 'completed', estimatedTime: 0, delay: 5000 }
        ]

        let stepIndex = 0
        const sendNextStep = () => {
          if (stepIndex < progressSteps.length) {
            const step = progressSteps[stepIndex]
            controller.enqueue(`data: ${JSON.stringify({
              type: 'progress',
              ...step
            })}\n\n`)
            
            stepIndex++
            if (stepIndex < progressSteps.length) {
              setTimeout(sendNextStep, step.delay)
            } else {
              // Send completion message
              setTimeout(() => {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'complete'
                })}\n\n`)
                controller.close()
              }, 1000)
            }
          }
        }

        // Start the progress simulation
        setTimeout(sendNextStep, 500)
      },

      cancel() {
        // Clean up when client disconnects
        console.log('SSE connection cancelled for session:', sessionId)
      }
    })

    return new Response(stream, { headers })

  } catch (error) {
    console.error('Error in progress-stream function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})