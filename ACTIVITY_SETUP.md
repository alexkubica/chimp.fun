# Editor Activity Setup Guide

This guide will help you set up the editor activity tracking feature with Supabase.

## Prerequisites

1. A Supabase account (free tier is sufficient)
2. A new Supabase project

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name and region
3. Wait for the project to be ready

### 2. Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   You can find these in your Supabase project dashboard under:
   - **Settings → API** for the URL and anon key
   - **Settings → API** for the service role key (click "Reveal" to see it)

### 3. Database Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `lib/database/migrations.sql`
3. Paste and run the SQL to create the database schema

### 4. Verify Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `/editor/activity` to see the activity page
3. Use the editor to generate some content
4. Check that activities appear on the activity page

## Features

### Activity Tracking
The system automatically tracks:
- **Generations**: When users create new content
- **Downloads**: When users download generated content
- **Copies**: When users copy content to clipboard
- **Shares**: When users share content

### Activity Page Features
- **Recent Activities**: View all recent activities from all users
- **Session Filter**: View only activities from your current session
- **Statistics**: See total activities, recent activity, and breakdown by type
- **Activity Details**: Each activity shows NFT info, reaction type, and timestamps

### Database Schema
The `editor_activities` table includes:
- User wallet address (optional)
- Session ID for tracking anonymous users
- Activity type (generation, download, copy, share)
- NFT collection and token details
- Reaction type used
- Output type (gif, mp4, image)
- Output URL
- Custom metadata
- Timestamps

## Integration

### Adding Activity Tracking to Editor

The activity tracking is already integrated, but here's how to add it to new features:

```typescript
import { trackGeneration, trackDownload } from '@/lib/services/activity'

// Track when user generates content
await trackGeneration({
  userWallet: user?.walletAddress,
  nftCollection: 'your-collection',
  nftTokenId: '123',
  reactionType: 'happy',
  outputType: 'gif',
  outputUrl: 'https://...',
})

// Track when user downloads
await trackDownload({
  userWallet: user?.walletAddress,
  outputType: 'gif',
  outputUrl: 'https://...',
})
```

### Custom Activity Types

You can extend the system by:
1. Adding new activity types to the database enum
2. Creating new tracking functions in the service
3. Adding support in the activity page UI

## Security

- Row Level Security (RLS) is enabled
- Anonymous users can create activities
- Users can only edit/delete their own activities
- All data is stored securely in Supabase

## Troubleshooting

### Common Issues

1. **Environment variables not loaded**
   - Make sure `.env.local` exists and has correct values
   - Restart your development server

2. **Database connection errors**
   - Verify your Supabase URL and keys
   - Check that your Supabase project is active

3. **Migration errors**
   - Make sure you're using the SQL editor in Supabase
   - Check for any syntax errors in the migration

4. **Activities not appearing**
   - Check browser console for errors
   - Verify the API routes are working at `/api/activities`

### Getting Help

- Check the browser console for error messages
- Verify your environment variables
- Ensure the database migration was successful
- Test the API endpoints directly

## Migration

If you already have users, the system will:
- Create new session IDs for existing users
- Start tracking activities from the point of deployment
- Not retroactively track past activities (this is by design)

The activity tracking is non-intrusive and will not affect existing functionality.