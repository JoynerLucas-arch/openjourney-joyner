import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

interface GeneratedFile {
  id: string;
  type: 'image' | 'video';
  url: string;
  filename: string;
  timestamp: Date;
  prompt?: string;
}

export async function GET(request: NextRequest) {
  try {
    const generatedFiles: GeneratedFile[] = [];
    
    // Scan generated-images directory
    const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      
      for (const filename of imageFiles) {
        if (filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
          const filePath = path.join(imagesDir, filename);
          const stats = fs.statSync(filePath);
          
          // Extract timestamp and prompt from filename if possible
          const timestampMatch = filename.match(/generated_image_(\d{8}_\d{6})/);
          const timestamp = timestampMatch 
            ? parseTimestampFromFilename(timestampMatch[1])
            : stats.mtime;
          
          generatedFiles.push({
            id: `img-${filename}`,
            type: 'image',
            url: `/generated-images/${filename}`,
            filename,
            timestamp,
            prompt: extractPromptFromFilename(filename)
          });
        }
      }
    }
    
    // Scan generated-videos directory
    const videosDir = path.join(process.cwd(), 'public', 'generated-videos');
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir);
      
      for (const filename of videoFiles) {
        if (filename.match(/\.(mp4|webm|mov)$/i)) {
          const filePath = path.join(videosDir, filename);
          const stats = fs.statSync(filePath);
          
          // Extract timestamp from filename if possible
          const timestampMatch = filename.match(/generated_video_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          const timestamp = timestampMatch 
            ? parseVideoTimestampFromFilename(timestampMatch[1])
            : stats.mtime;
          
          generatedFiles.push({
            id: `vid-${filename}`,
            type: 'video',
            url: `/generated-videos/${filename}`,
            filename,
            timestamp,
            prompt: extractPromptFromFilename(filename)
          });
        }
      }
    }
    
    // Sort by timestamp (newest first)
    generatedFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return NextResponse.json({ 
      success: true, 
      files: generatedFiles 
    });
    
  } catch (error) {
    console.error('Error scanning generated files:', error);
    return NextResponse.json(
      { error: 'Failed to scan generated files' },
      { status: 500 }
    );
  }
}

// Helper function to parse timestamp from filename
function parseTimestampFromFilename(timestampStr: string): Date {
  // Format: YYYYMMDD_HHMMSS
  const year = parseInt(timestampStr.substring(0, 4));
  const month = parseInt(timestampStr.substring(4, 6)) - 1; // Month is 0-indexed
  const day = parseInt(timestampStr.substring(6, 8));
  const hour = parseInt(timestampStr.substring(9, 11));
  const minute = parseInt(timestampStr.substring(11, 13));
  const second = parseInt(timestampStr.substring(13, 15));
  
  return new Date(year, month, day, hour, minute, second);
}

// Helper function to parse video timestamp from filename
function parseVideoTimestampFromFilename(timestampStr: string): Date {
  // Format: YYYY-MM-DDTHH-MM-SS
  // Convert to ISO format: YYYY-MM-DDTHH:MM:SS
  const isoString = timestampStr.replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
  return new Date(isoString);
}

// Helper function to extract prompt from filename (if encoded)
function extractPromptFromFilename(filename: string): string | undefined {
  // Extract prompt from filename pattern: generated_xxx_timestamp_prompt.ext
  const match = filename.match(/generated_(?:image|video)_[^_]+_(.+)\.[^.]+$/);
  if (match) {
    // Convert underscores back to spaces and decode
    return match[1].replace(/_/g, ' ');
  }
  return undefined;
}