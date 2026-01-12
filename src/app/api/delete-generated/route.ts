import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { filename, type } = await request.json();

    if (!filename || !type) {
      return NextResponse.json({ error: "Filename and type are required" }, { status: 400 });
    }

    // Determine the directory based on type
    let targetDir: string;
    if (type === 'image') {
      targetDir = path.join(process.cwd(), 'public', 'generated-images');
    } else if (type === 'video') {
      targetDir = path.join(process.cwd(), 'public', 'generated-videos');
    } else {
      return NextResponse.json({ error: "Invalid type. Must be 'image' or 'video'" }, { status: 400 });
    }

    const filePath = path.join(targetDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Security check: ensure the file is within the expected directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(targetDir);
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    console.log(`Successfully deleted ${type}: ${filename}`);

    return NextResponse.json({ 
      success: true, 
      message: `${type} deleted successfully` 
    });

  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" }, 
      { status: 500 }
    );
  }
}