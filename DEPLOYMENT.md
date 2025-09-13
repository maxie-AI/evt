# Video Transcript Extractor - Deployment Guide

## Overview
This guide will help you deploy the Video Transcript Extractor application to Vercel.

**Note**: Vercel has a rate limit of 5000 deployments per month for free accounts. If you encounter a rate limit error, wait 3 hours or upgrade to a paid plan.

## Prerequisites
1. Vercel account (https://vercel.com)
2. GitHub repository with your code
3. Supabase project configured
4. OpenAI API key for transcription

## Step 1: Prepare Your Repository

1. Ensure all files are committed to your GitHub repository
2. The following files should be present:
   - `vercel.json` (routing configuration)
   - `.env.production.template` (environment variables template)
   - `package.json` (dependencies)

## Step 2: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Link to existing project? **N**
   - Project name: **video-transcript-extractor** (or your preferred name)
   - Directory: **.** (current directory)
   - Override settings? **N**

### Option B: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Step 3: Configure Environment Variables

1. In Vercel Dashboard, go to your project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables (use `.env.production.template` as reference):

### Required Variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-strong-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=production
```

### Optional Variables:
```
JWT_EXPIRES_IN=7d
PORT=3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=50000000
UPLOAD_DIR=/tmp/uploads
MAX_VIDEO_DURATION=3600
TEMP_DIR=/tmp
```

**Important**: 
- Replace all placeholder values with your actual keys
- `CLIENT_URL` will be automatically set to your Vercel domain
- Make sure `JWT_SECRET` is a strong, unique key for production

## Step 4: Configure Supabase for Production

1. In your Supabase dashboard:
   - Go to **Settings** → **API**
   - Add your Vercel domain to **Site URL**
   - Add your Vercel domain to **Redirect URLs**

2. Update CORS settings if needed:
   - Go to **Authentication** → **Settings**
   - Add your Vercel domain to allowed origins

## Step 5: Deploy and Test

1. After setting environment variables, redeploy:
   ```bash
   vercel --prod
   ```

2. Test your deployment:
   - Visit your Vercel URL
   - Test user registration/login
   - Test video extraction with a YouTube URL
   - Check transcript generation

## Step 6: Custom Domain (Optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `CLIENT_URL` environment variable if using custom domain

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation

2. **API Routes Not Working**:
   - Check `vercel.json` configuration
   - Verify environment variables are set
   - Check function logs in Vercel dashboard

3. **CORS Errors**:
   - Update Supabase CORS settings
   - Check `CLIENT_URL` environment variable

4. **Video Processing Failures**:
   - Verify OpenAI API key is set
   - Check Supabase Edge Functions are deployed
   - Monitor function execution logs

### Rate Limit Error:
If you see "Too many requests - try again in 3 hours":
- Wait for the rate limit to reset
- Consider upgrading to Vercel Pro
- Use `vercel --prod` for production deployments only

## Support

For issues:
1. Check Vercel function logs
2. Monitor Supabase logs
3. Verify all environment variables are correctly set
4. Test locally first with production environment variables

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Regularly rotate API keys
- Monitor usage and costs
- Enable Vercel's security features

---

**Your app will be available at**: `https://your-project-name.vercel.app`

After successful deployment, update the version number in your app to reflect the production