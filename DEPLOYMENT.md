# Deployment Guide

## Vercel Deployment

Your video transcript extractor application has been successfully deployed to Vercel!

**Live URL:** https://traevstkzzr-ruimaxie8-3241-maxie-ais-projects.vercel.app

## Required Environment Variables

To make your application fully functional in production, you need to configure the following environment variables in your Vercel dashboard:

### 1. Supabase Configuration
```
SUPABASE_URL=https://ipwufgqutsdsimogpnvf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwd3VmZ3F1dHNkc2ltb2dwbnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDU0MzQsImV4cCI6MjA3MzEyMTQzNH0.TBRJG4inbPo6lrjZwylCjnem7QkyJ1hLfX7meGc8RvA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwd3VmZ3F1dHNkc2ltb2dwbnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU0NTQzNCwiZXhwIjoyMDczMTIxNDM0fQ.PerN-nUqUId-x-vExIw3HsD_gHv-Ubg1BpY_mrZu520
```

### 2. Frontend Environment Variables (Vite)
```
VITE_SUPABASE_URL=https://ipwufgqutsdsimogpnvf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwd3VmZ3F1dHNkc2ltb2dwbnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDU0MzQsImV4cCI6MjA3MzEyMTQzNH0.TBRJG4inbPo6lrjZwylCjnem7QkyJ1hLfX7meGc8RvA
```

### 3. JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 4. Server Configuration
```
PORT=3001
NODE_ENV=production
```

### 5. CORS Configuration
```
CLIENT_URL=https://traevstkzzr-ruimaxie8-3241-maxie-ais-projects.vercel.app
```

### 6. Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 7. File Upload
```
MAX_FILE_SIZE=50000000
UPLOAD_DIR=uploads
```

### 8. Video Processing
```
MAX_VIDEO_DURATION=3600
TEMP_DIR=temp
```

### 9. OpenAI Configuration (Required for AI features)
```
OPENAI_API_KEY=your-actual-openai-api-key-here
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each environment variable listed above
5. Make sure to set the environment to "Production"
6. Redeploy your application after adding the variables

## Important Security Notes

- **Change the JWT_SECRET** to a strong, unique secret for production
- **Add your actual OpenAI API key** to enable AI-powered transcript processing
- **Update CLIENT_URL** to match your actual production domain
- Never commit sensitive keys to your repository

## Features Available

✅ Video URL extraction from YouTube, Bilibili, and Red Book
✅ AI-powered transcript generation
✅ Multiple export formats (TXT, SRT, VTT, JSON)
✅ User authentication and profiles
✅ Subscription-based usage limits
✅ Export history tracking
✅ Responsive design

## Next Steps

1. Configure all environment variables in Vercel
2. Test the application functionality
3. Set up monitoring and analytics
4. Configure custom domain (optional)
5. Set up CI/CD pipeline for automatic deployments

Your application is now live and ready for production use!