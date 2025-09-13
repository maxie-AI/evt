# Netlify Deployment Fix Guide

## Problem
The VTX application deployed on Netlify at https://vtx-molecular-visualization.netlify.app/ was not working because it was trying to connect to `localhost:3001` instead of the Supabase backend.

## Solution Applied
I've updated the code to include hardcoded Supabase credentials as fallback values when environment variables are not available. This ensures the app works on Netlify without requiring manual environment variable configuration.

## Files Modified
- `src/lib/supabase.ts` - Added fallback Supabase URL and API key

## How to Deploy the Fix

### Option 1: Automatic Deployment (if auto-deploy is enabled)
1. The changes have been committed to your repository
2. Netlify should automatically detect the changes and redeploy
3. Wait 2-3 minutes for the deployment to complete
4. Test the application at https://vtx-molecular-visualization.netlify.app/

### Option 2: Manual Deployment
1. Go to your Netlify dashboard
2. Find your VTX project
3. Click "Trigger deploy" → "Deploy site"
4. Wait for the deployment to complete
5. Test the application

## Testing the Fix

1. Open https://vtx-molecular-visualization.netlify.app/
2. Paste the example video URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Click "Extract Transcript"
4. The extraction should now work without localhost:3001 errors

## What Was Fixed

✅ **Before**: App tried to connect to `localhost:3001` (development server)
✅ **After**: App connects to Supabase Edge Functions at `https://ipwufgqutsdsimogpnvf.supabase.co`

✅ **Before**: Environment variables required in Netlify dashboard
✅ **After**: Hardcoded fallback values ensure it works without manual configuration

## Expected Functionality

- ✅ Guest users can extract transcripts
- ✅ Authenticated users can save and manage extractions
- ✅ Real-time progress tracking during extraction
- ✅ Export in multiple formats (TXT, SRT, VTT, JSON)
- ✅ Support for YouTube, Vimeo, and other platforms

## Verification

The fix has been tested locally and confirmed to work. The console logs no longer show `localhost:3001` errors, and all API calls are properly routed to Supabase Edge Functions.

---

**Next Steps**: Deploy the updated code to Netlify using one of the options above, then test the extract functionality with the example video URL.