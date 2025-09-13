import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const extractionId = pathParts[pathParts.length - 1];

    // Verify authentication
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

    // Handle GET requests
    if (req.method === 'GET') {
      // Get single extraction
      if (extractionId && extractionId !== 'extractions') {
        const { data: extraction, error: fetchError } = await supabaseClient
          .from('extractions')
          .select('*')
          .eq('id', extractionId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !extraction) {
          return new Response(
            JSON.stringify({ error: 'Extraction not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(extraction),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all extractions for user
      const { data: extractions, error: fetchError } = await supabaseClient
        .from('extractions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch extractions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(extractions || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests
    if (req.method === 'DELETE') {
      if (!extractionId || extractionId === 'extractions') {
        return new Response(
          JSON.stringify({ error: 'Extraction ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership before deletion
      const { data: extraction, error: fetchError } = await supabaseClient
        .from('extractions')
        .select('id')
        .eq('id', extractionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !extraction) {
        return new Response(
          JSON.stringify({ error: 'Extraction not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the extraction
      const { error: deleteError } = await supabaseClient
        .from('extractions')
        .delete()
        .eq('id', extractionId)
        .eq('user_id', user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete extraction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Extraction deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extractions error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});