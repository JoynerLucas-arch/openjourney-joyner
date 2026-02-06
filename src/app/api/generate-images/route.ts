import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Helper function to save image locally
async function saveImageLocally(imageBuffer: ArrayBuffer, prompt: string): Promise<string> {
  try {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').substring(0, 1000);
    const filename = `generated_image_${timestamp}_${sanitizedPrompt}.png`;
    
    // Create the full path to save the image
    const publicDir = path.join(process.cwd(), 'public', 'generated-images');
    const filePath = path.join(publicDir, filename);
    
    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Save the image file
    fs.writeFileSync(filePath, Buffer.from(imageBuffer));
    
    // Return the public URL path
    return `/generated-images/${filename}`;
  } catch (error) {
    console.error('保存图片时出错:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {

    const { prompt, accessKey, secretKey } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = accessKey || secretKey || process.env.ALIYUN_IMAGE_API_KEY || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: "未提供图片生成API Key。请在设置中配置图片生成的API Key。" 
      }, { status: 401 });
    }

    console.log("Generating image for prompt:", prompt);

    const requestUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    const requestBody = {
      model: "wan2.6-t2i",
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }]
          }
        ]
      },
      parameters: {
        prompt_extend: true,
        watermark: false,
        n: 1,
        size: "1696*960"
      }
    };

    const submitResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Submit task error:", errorText);
      throw new Error(`Task submission failed: ${submitResponse.statusText} - ${errorText}`);
    }

    const submitData = await submitResponse.json();

    const content = submitData?.output?.choices?.[0]?.message?.content;
    const imageItem = Array.isArray(content) ? content.find((item: { image?: string }) => item.image) : undefined;
    const imageUrl = imageItem?.image;

    if (!imageUrl) {
      throw new Error('响应中未找到图片URL');
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    let localImagePath;
    try {
      localImagePath = await saveImageLocally(imageBuffer, prompt);
      console.log('图片保存成功:', localImagePath);
    } catch (saveError) {
      console.error('保存图片失败:', saveError);
    }

    const filename = localImagePath ? path.basename(localImagePath) : `${Date.now()}-0`;
    const imageId = filename.replace(/\.[^/.]+$/, "");

    return NextResponse.json({ 
      success: true, 
      images: [{
        id: imageId,
        url: localImagePath || `data:image/png;base64,${imageBase64}`,
        imageBytes: imageBase64,
        prompt,
        created_at: new Date().toISOString()
      }],
      prompt 
    });

  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "Failed to generate images" }, 
      { status: 500 }
    );
  }
}
