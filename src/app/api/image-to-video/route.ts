import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Helper function to download and save video
async function downloadAndSaveVideo(videoUrl: string, prompt: string): Promise<string> {
  try {
    console.log('开始下载视频:', videoUrl);
    
    // Download the video
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }
    
    // Generate unique filename with prompt info
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').substring(0, 50);
    const filename = `generated_video_${timestamp}_${sanitizedPrompt}.mp4`;
    
    // Create the full path to save the video
    const publicDir = path.join(process.cwd(), 'public', 'generated-videos');
    const filePath = path.join(publicDir, filename);
    
    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Get video data as buffer
    const videoBuffer = await response.arrayBuffer();
    
    // Save the video file
    fs.writeFileSync(filePath, Buffer.from(videoBuffer));
    
    console.log('视频保存成功:', filePath);
    
    // Return the public URL path
    return `/generated-videos/${filename}`;
  } catch (error) {
    console.error('下载视频时出错:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageBytes, accessKey, secretKey, model } = await request.json();

    if (!prompt || !imageBytes) {
      return NextResponse.json({ error: "提示词和图片是必填项" }, { status: 400 });
    }

    const apiKey = accessKey || secretKey || process.env.ALIYUN_VIDEO_API_KEY || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: "未提供视频生成API Key。请在设置中配置视频生成的API Key。" 
      }, { status: 401 });
    }

    console.log("正在为图片生成视频，提示词：", prompt);

    const selectedModel = model || "wan2.6-i2v";
    const requestUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
    const imageUrl = imageBytes.startsWith('data:') ? imageBytes : `data:image/png;base64,${imageBytes}`;
    const requestBody = {
      model: selectedModel,
      input: {
        prompt,
        img_url: imageUrl
      },
      parameters: {
        resolution: "1080P",
        prompt_extend: true,
        duration: 5,
        shot_type: "single"
      }
    };

    const submitResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify(requestBody)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("提交任务时出错：", errorText);
      throw new Error(`任务提交失败： ${submitResponse.statusText} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    
    if (!submitData.output || !submitData.output.task_id) {
      throw new Error('任务提交失败：未返回任务ID');
    }

    const taskId = submitData.output.task_id;
    console.log(`图生视频任务提交成功, 任务ID: ${taskId}`);

    // Step 2: Query task result with polling
    const maxAttempts = 20; // Increased for video generation
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`查询尝试 ${attempt}/${maxAttempts}`);
      
      // Wait 10 seconds between attempts for video generation
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const queryResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!queryResponse.ok) {
        console.error(`查询尝试 ${attempt} 失败:`, queryResponse.statusText);
        continue;
      }
      
      const queryData = await queryResponse.json();
      
      if (queryData.output) {
        const status = queryData.output.task_status;
        console.log(`任务状态: ${status}`);
        
        if (status === 'SUCCEEDED') {
          const videoUrl = queryData.output.video_url || queryData.output.video_url_list?.[0] || queryData.output.videos?.[0]?.url;
          if (videoUrl) {
            console.log('图生视频成功，开始下载视频...');
            
            try {
              // Download video and save locally
              const localVideoPath = await downloadAndSaveVideo(videoUrl, prompt);
              
              // Generate unique ID based on filename
              const filename = path.basename(localVideoPath);
              const videoId = filename.replace(/\.[^/.]+$/, ""); // Remove file extension for ID
              
              // Return single video in array format to match expected structure
              return NextResponse.json({ 
                success: true, 
                videos: [{
                  id: videoId,
                  url: localVideoPath,
                  prompt,
                  created_at: new Date().toISOString()
                }],
                prompt 
              });
            } catch (downloadError) {
              console.error('视频下载失败:', downloadError);
              // Fallback to original URL if download fails
              return NextResponse.json({ 
                success: true, 
                videos: [{
                  id: `${Date.now()}-0`,
                  url: videoUrl
                }],
                prompt 
              });
            }
          } else {
            throw new Error('响应中未找到视频URL');
          }
        } else if (status === 'FAILED') {
          const message = queryData.output.message || '任务失败';
          throw new Error(`图生视频失败: ${message}`);
        } else if (status === 'PENDING' || status === 'RUNNING') {
          console.log('任务仍在处理中，请稍候...');
          continue;
        } else {
          console.log(`未知状态: ${status}`);
          continue;
        }
      } else {
        console.log('无效的查询响应');
        continue;
      }
    }
    
    throw new Error('图生视频在最大尝试次数后超时');

  } catch (error) {
    console.error("图生视频时出错:", error);
    return NextResponse.json(
      { error: "图生视频失败" }, 
      { status: 500 }
    );
  }
}
