# Netlify Deployment Guide for VTX

## Environment Variables Configuration

The VTX application requires the following environment variables to be configured in your Netlify dashboard:

### Required Environment Variables

1. **VITE_SUPABASE_URL**
   - Value: `https://ipwufgqutsdsimogpnvf.supabase.co`
   - Description: Supabase project URL for frontend API calls

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwd3VmZ3F1dHNkc2ltb2dwbnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDU0MzQsImV4cCI6MjA3MzEyMTQzNH0.TBRJG4inbPo6lrjZwylCjnem7QkyJ1hLfX7meGc8RvA`
   - Description: Supabase anonymous key for frontend authentication

## How to Configure Environment Variables in Netlify

### Step 1: Access Site Settings
1. Go to your Netlify dashboard
2. Select your VTX project site
3. Navigate to **Site settings**

### Step 2: Configure Environment Variables
1. In the site settings, go to **Environment variables**
2. Click **Add a variable**
3. Add each environment variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://ipwufgqutsdsimogpnvf.supabase.co`
   - Scopes: Select **All scopes**
4. Click **Add a variable** again
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwd3VmZ3F1dHNkc2ltb2dwbnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDU0MzQsImV4cCI6MjA3MzEyMTQzNH0.TBRJG4inbPo6lrjZwylCjnem7QkyJ1hLfX7meGc8RvA`
   - Scopes: Select **All scopes**

### Step 3: Trigger New Deployment
1. After adding the environment variables, go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait for the deployment to complete

## Verification

After deployment with the correct environment variables:

1. **Check Console Errors**: The browser console should no longer show `localhost:3001` API calls
2. **Test Extract Function**: The extract button should work with example URLs
3. **Verify API Calls**: Network tab should show calls to Supabase Edge Functions instead of localhost

## Troubleshooting

### Issue: Still seeing localhost:3001 calls
- **Solution**: Ensure environment variables are saved and a new deployment was triggered
- **Check**: Verify the environment variables are visible in Netlify dashboard

### Issue: Extract function returns errors
- **Solution**: Check that Supabase Edge Functions are properly deployed
- **Verify**: Test Edge Function endpoints directly in browser

### Issue: Authentication not working
- **Solution**: Ensure VITE_SUPABASE_ANON_KEY is correctly configured
- **Check**: Verify the key matches the one from Supabase dashboard

## Current Status

✅ **Completed:**
- All Supabase Edge Functions deployed
- API configuration updated to use Edge Functions
- Environment variables identified

⏳ **Pending:**
- Configure environment variables in Netlify dashboard
- Trigger new deployment
- Test extract functionality

## Next Steps

1. Configure the environment variables in Netlify dashboard using the values above
2. Trigger a new deployment
3. Test the extract functionality on the live site
4.