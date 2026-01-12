import { NextRequest, NextResponse } from "next/server";
import { deleteMediaByFilename } from '@/lib/media';

export async function DELETE(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('id');
    const mediaType = searchParams.get('type') as 'image' | 'video';

    if (!filename || !mediaType) {
      return NextResponse.json({ 
        error: "缺少必要参数：文件名和类型" 
      }, { status: 400 });
    }

    if (mediaType !== 'image' && mediaType !== 'video') {
      return NextResponse.json({ 
        error: "无效的媒体类型，必须是 'image' 或 'video'" 
      }, { status: 400 });
    }

    // Only support filename-based deletion (no database operations)
    const success = await deleteMediaByFilename(filename, mediaType);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: "媒体文件删除成功" 
      });
    } else {
      return NextResponse.json({ 
        error: "删除失败：文件不存在或无权限删除" 
      }, { status: 404 });
    }

  } catch (error) {
    console.error("删除媒体文件时出错:", error);
    return NextResponse.json(
      { error: "删除媒体文件失败" }, 
      { status: 500 }
    );
  }
}