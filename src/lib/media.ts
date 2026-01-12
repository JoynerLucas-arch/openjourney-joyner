import fs from 'fs';
import path from 'path';

// 媒体文件接口定义（简化版，不再依赖数据库）
export interface GeneratedImage {
  id: string;
  filename: string;
  file_path: string;
  prompt: string;
  file_size?: number;
  width?: number;
  height?: number;
  created_at: Date;
}

export interface GeneratedVideo {
  id: string;
  filename: string;
  file_path: string;
  prompt: string;
  file_size?: number;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  source_image_id?: string;
  created_at: Date;
}

// 通过文件名删除媒体文件（仅删除文件系统文件）
export async function deleteMediaByFilename(filename: string, mediaType: 'image' | 'video'): Promise<boolean> {
  try {
    if (mediaType === 'image') {
      return await deleteImageFileByFilename(filename);
    } else if (mediaType === 'video') {
      return await deleteVideoFileByFilename(filename);
    } else {
      throw new Error('无效的媒体类型');
    }
  } catch (error) {
    console.error('通过文件名删除媒体文件失败:', error);
    throw error;
  }
}

// 通过文件名删除图片文件（仅删除文件系统文件）
export async function deleteImageFileByFilename(filename: string): Promise<boolean> {
  try {
    // 构建可能的文件路径
    const imagePaths = [
      path.join(process.cwd(), 'public', 'generated-images', filename),
      path.join(process.cwd(), 'public', 'generated-images', `${filename}.png`),
      path.join(process.cwd(), 'public', 'generated-images', `${filename}.jpg`),
      path.join(process.cwd(), 'public', 'generated-images', `${filename}.jpeg`)
    ];

    let fileDeleted = false;
    for (const filePath of imagePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`已删除图片文件: ${filePath}`);
        fileDeleted = true;
        break;
      }
    }

    if (!fileDeleted) {
      console.log(`未找到图片文件: ${filename}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('通过文件名删除图片文件失败:', error);
    throw error;
  }
}

// 通过文件名删除视频文件（仅删除文件系统文件）
export async function deleteVideoFileByFilename(filename: string): Promise<boolean> {
  try {
    // 构建可能的文件路径
    const videoPaths = [
      path.join(process.cwd(), 'public', 'generated-videos', filename),
      path.join(process.cwd(), 'public', 'generated-videos', `${filename}.mp4`),
      path.join(process.cwd(), 'public', 'generated-videos', `${filename}.mov`),
      path.join(process.cwd(), 'public', 'generated-videos', `${filename}.avi`)
    ];

    let fileDeleted = false;
    for (const filePath of videoPaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`已删除视频文件: ${filePath}`);
        fileDeleted = true;
        break;
      }
    }

    if (!fileDeleted) {
      console.log(`未找到视频文件: ${filename}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('通过文件名删除视频文件失败:', error);
    throw error;
  }
}