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

// Helper function to extract prompt from filename
function extractPromptFromFilename(filename: string): string | undefined {
  // Try to extract prompt from filename pattern: generated_[type]_[timestamp]_[prompt].[ext]
  const match = filename.match(/generated_(?:image|video)_[^_]+_(.+)\.[^.]+$/);
  if (match) {
    return match[1].replace(/_/g, ' ');
  }
  return undefined;
}

// Helper function to parse timestamp from filename
function parseTimestampFromFilename(timestampStr: string): Date {
  // Convert format like "2025-01-09T08-08-31" to proper Date
  const isoString = timestampStr.replace(/-/g, ':').replace('T', 'T').slice(0, -3) + ':' + timestampStr.slice(-2);
  return new Date(isoString);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const generatedFiles: GeneratedFile[] = [];
    
    // Scan generated-images directory if needed
    if (!mediaType || mediaType === 'image') {
      const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
      if (fs.existsSync(imagesDir)) {
        const imageFiles = fs.readdirSync(imagesDir);
        
        for (const filename of imageFiles) {
          if (filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
            const filePath = path.join(imagesDir, filename);
            const stats = fs.statSync(filePath);
            
            // Extract timestamp and prompt from filename if possible
            const timestampMatch = filename.match(/generated_image_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
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
    }
    
    // Scan generated-videos directory if needed
    if (!mediaType || mediaType === 'video') {
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
              ? parseTimestampFromFilename(timestampMatch[1])
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
    }
    
    // Filter by type if specified
    let filteredFiles = generatedFiles;
    if (mediaType) {
      filteredFiles = generatedFiles.filter(file => file.type === mediaType);
    }
    
    // Sort by timestamp (newest first)
    filteredFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);
    
    // Transform to match expected format
    const result = {
      data: paginatedFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        file_path: file.url,
        prompt: file.prompt || '',
        created_at: file.timestamp
      })),
      total: filteredFiles.length,
      page,
      limit,
      totalPages: Math.ceil(filteredFiles.length / limit)
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("获取媒体文件列表时出错:", error);
    return NextResponse.json(
      { error: "获取媒体文件列表失败" }, 
      { status: 500 }
    );
  }
}