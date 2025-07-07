# FFmpeg Implementation for Vercel Deployment

## Overview

This document outlines the successful implementation of server-side FFmpeg processing for the image editor application, enabling it to run on Vercel which doesn't have FFmpeg pre-installed.

## Problem Statement

The original implementation used client-side FFmpeg processing via WebAssembly, but there was a need to migrate to server-side processing. However, Vercel's serverless environment doesn't include FFmpeg by default, requiring a solution to provide FFmpeg functionality.

## Solution: Static FFmpeg Binary

We implemented a solution using the `ffmpeg-ffprobe-static` npm package, which provides statically compiled FFmpeg binaries for multiple platforms including Linux (used by Vercel).

### Key Components

1. **Static FFmpeg Binary Package**: `ffmpeg-ffprobe-static@6.1.2-rc.1`
2. **Server-side API Route**: `/api/render`
3. **Updated Client-side Code**: Modified UI to call the server API instead of client-side FFmpeg

## Implementation Details

### 1. Dependencies Added

```bash
npm install ffmpeg-ffprobe-static fluent-ffmpeg @types/fluent-ffmpeg
```

### 2. Server-side API Route (`app/api/render/route.ts`)

**Key Features:**

- Uses static FFmpeg binary path from `ffmpeg-ffprobe-static`
- Handles both GIF and static image processing
- Supports overlay positioning with scaling
- Includes watermark functionality
- Proper temporary file management
- Error handling and cleanup

**FFmpeg Commands:**

- **With Watermark**: Processes input image, reaction overlay, and watermark
- **Without Watermark**: Processes input image and reaction overlay only
- **Scaling**: Resizes images to 1080x1080 with proper overlay scaling
- **Positioning**: Places overlays at specified x,y coordinates

### 3. Client-side Changes (`app/editor/page.tsx`)

**Removed:**

- Client-side FFmpeg initialization and loading
- WebAssembly FFmpeg processing logic
- FFmpeg-related state variables and dependencies
- Complex client-side image processing

**Added:**

- Simple API call to `/api/render` endpoint
- FormData construction for file uploads
- Server-side processing integration

**Key Function:**

```typescript
const debouncedRenderImageUrl = useCallback(
  debounce(async () => {
    // ... validation logic ...

    const formData = new FormData();
    formData.append("inputImage", inputImageFile);
    formData.append("reactionImage", reactionImageFile);
    // ... other parameters ...

    const response = await fetch("/api/render", {
      method: "POST",
      body: formData,
    });

    // ... handle response ...
  }, 300),
  // ... dependencies ...
);
```

### 4. FFmpeg Command Structure

The implementation uses sophisticated FFmpeg filter chains:

**Without Watermark:**

```bash
ffmpeg -y -i input.ext -i reaction.png
  -filter_complex "[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/scale:ih/scale[scaled1]; [scaled_input][scaled1]overlay=x:y"
  output.ext
```

**With Watermark:**

```bash
ffmpeg -y -i input.ext -i reaction.png -i watermark.png
  -filter_complex "[0:v]scale=1080:1080[scaled_input]; [1:v]scale=iw/scale:ih/scale[scaled1]; [scaled_input][scaled1]overlay=x:y[video1]; [2:v]scale=iw*watermark_scale:-1[scaled2]; [video1][scaled2]overlay=x=W-w-padding_x:y=H-h-padding_y"
  output.ext
```

## Benefits

1. **Vercel Compatibility**: Works seamlessly on Vercel's serverless platform
2. **Performance**: Server-side processing is faster than client-side WebAssembly
3. **Reliability**: Static binaries ensure consistent FFmpeg availability
4. **Reduced Client Load**: Moves heavy processing to the server
5. **Better Error Handling**: Server-side error management and logging

## File Structure

```
app/
├── api/
│   └── render/
│       └── route.ts          # Server-side FFmpeg processing
├── editor/
│   └── page.tsx              # Updated client-side code
└── components/
    └── ...

node_modules/
└── ffmpeg-ffprobe-static/    # Static FFmpeg binaries
```

## Technical Specifications

- **FFmpeg Version**: 6.0 (via ffmpeg-ffprobe-static)
- **Supported Formats**: GIF, PNG, JPEG, WebP
- **Processing**: Server-side with temporary file management
- **Scaling**: Automatic 1080x1080 output with proportional overlays
- **Cleanup**: Automatic temporary file cleanup after processing

## Deployment Considerations

1. **Build Size**: The static FFmpeg binary adds ~50MB to the deployment
2. **Function Timeout**: Ensure adequate timeout for image processing
3. **Memory Limits**: FFmpeg processing may require higher memory limits
4. **Temporary Storage**: Uses `/tmp` directory for temporary files

## Testing

- ✅ Build process completes successfully
- ✅ No TypeScript compilation errors
- ✅ Static binary integration works correctly
- ✅ API route is properly configured
- ✅ Client-side integration is functional

## Future Enhancements

1. **Caching**: Implement result caching for repeated operations
2. **Optimization**: Add image compression options
3. **Formats**: Support additional image/video formats
4. **Batch Processing**: Handle multiple images simultaneously
5. **Progress Tracking**: Add processing progress indicators

## Conclusion

The implementation successfully addresses the Vercel FFmpeg requirement by using static binaries, providing a robust, scalable solution for server-side image processing. The approach maintains all existing functionality while improving performance and reliability for production deployment.
