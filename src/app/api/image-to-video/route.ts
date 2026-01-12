import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Helper function to create signing key
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = crypto.createHmac('sha256', key).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
  return kSigning;
}

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

    // Use user-provided credentials if available, otherwise fallback to environment variables
    const accessKeyId = accessKey || process.env.JIMENG_VIDEO_ACCESS_KEY;
    const secretAccessKey = secretKey || process.env.JIMENG_VIDEO_SECRET_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ 
        error: "未提供视频生成API凭证。请在设置中配置视频生成的Access Key和Secret Key。" 
      }, { status: 401 });
    }

    console.log("正在为图片生成视频，提示词：", prompt);

    // Helper function to format query parameters
    const formatQuery = (parameters: Record<string, string>): string => {
      let requestParameters = '';
      for (const key of Object.keys(parameters).sort()) {
        requestParameters += key + '=' + parameters[key] + '&';
      }
      return requestParameters.slice(0, -1);
    };

    // Prepare request for JiMeng AI Image-to-Video API
    const method = 'POST';
    const host = 'visual.volcengineapi.com';
    const region = 'cn-north-1';
    const endpoint = 'https://visual.volcengineapi.com';
    const service = 'cv';

    // Step 1: Submit task
    const queryParams = {
      'Action': 'CVSync2AsyncSubmitTask',
      'Version': '2022-08-31',
    };
    const formattedQuery = formatQuery(queryParams);

    // Determine req_key based on model selection
    const reqKey = model === 'jimeng_ti2v_v30_pro' ? 'jimeng_ti2v_v30_pro' : 'jimeng_i2v_first_v30_1080';
    
    console.log('图生视频请求参数:');
    console.log('- 选择的模型:', model || '未指定(使用默认)');
    console.log('- 实际使用的req_key:', reqKey);
    console.log('- 提示词:', prompt);
    
    const bodyParams = {
      "req_key": reqKey,
      "binary_data_base64": [imageBytes],
      "prompt": prompt,
      "seed": -1,
      "frames": 121  // 121 frames = 5 seconds
    };
    const body = JSON.stringify(bodyParams);

    // Signing logic for JiMeng AI
    const t = new Date();
    const currentDate = t.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z';
    const datestamp = t.toISOString().slice(0, 10).replace(/-/g, '');
    const canonicalUri = '/';
    const canonicalQuerystring = formattedQuery;
    const signedHeaders = 'content-type;host;x-content-sha256;x-date';
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    const contentType = 'application/json';
    
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-content-sha256:${payloadHash}\nx-date:${currentDate}\n`;
    
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const algorithm = 'HMAC-SHA256';
    const credentialScope = `${datestamp}/${region}/${service}/request`;
    const stringToSign = `${algorithm}\n${currentDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
    
    const signingKey = getSignatureKey(secretAccessKey, datestamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers = {
      'X-Date': currentDate,
      'Authorization': authorization,
      'X-Content-Sha256': payloadHash,
      'Content-Type': contentType
    };

    const requestUrl = `${endpoint}?${canonicalQuerystring}`;

    // Step 1: Submit task
    console.log('提交图生视频任务到即梦AI...');
    const submitResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("提交任务时出错：", errorText);
      throw new Error(`任务提交失败： ${submitResponse.statusText} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    
    if (!submitData.data || !submitData.data.task_id) {
      throw new Error('任务提交失败：未返回任务ID');
    }

    const taskId = submitData.data.task_id;
    console.log(`图生视频任务提交成功, 任务ID: ${taskId}`);

    // Step 2: Query task result with polling
    const maxAttempts = 20; // Increased for video generation
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`查询尝试 ${attempt}/${maxAttempts}`);
      
      // Wait 10 seconds between attempts for video generation
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Prepare query request
      const queryT = new Date();
      const queryCurrentDate = queryT.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z';
      const queryDatestamp = queryT.toISOString().slice(0, 10).replace(/-/g, '');
      
      const queryParams = {
        'Action': 'CVSync2AsyncGetResult',
        'Version': '2022-08-31',
      };
      const queryFormattedQuery = formatQuery(queryParams);
      
      const queryBodyParams = {
        "req_key": reqKey,
        "task_id": taskId,
      };
      const queryBody = JSON.stringify(queryBodyParams);
      
      const queryPayloadHash = crypto.createHash('sha256').update(queryBody).digest('hex');
      const queryCanonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-content-sha256:${queryPayloadHash}\nx-date:${queryCurrentDate}\n`;
      const queryCanonicalRequest = `${method}\n${canonicalUri}\n${queryFormattedQuery}\n${queryCanonicalHeaders}\n${signedHeaders}\n${queryPayloadHash}`;
      const queryStringToSign = `${algorithm}\n${queryCurrentDate}\n${queryDatestamp}/${region}/${service}/request\n${crypto.createHash('sha256').update(queryCanonicalRequest).digest('hex')}`;
      
      const querySigningKey = getSignatureKey(secretAccessKey, queryDatestamp, region, service);
      const querySignature = crypto.createHmac('sha256', querySigningKey).update(queryStringToSign).digest('hex');
      const queryAuthorization = `${algorithm} Credential=${accessKeyId}/${queryDatestamp}/${region}/${service}/request, SignedHeaders=${signedHeaders}, Signature=${querySignature}`;
      
      const queryHeaders = {
        'X-Date': queryCurrentDate,
        'Authorization': queryAuthorization,
        'X-Content-Sha256': queryPayloadHash,
        'Content-Type': contentType
      };
      
      const queryRequestUrl = `${endpoint}?${queryFormattedQuery}`;
      
      const queryResponse = await fetch(queryRequestUrl, {
        method: 'POST',
        headers: queryHeaders,
        body: queryBody
      });
      
      if (!queryResponse.ok) {
        console.error(`查询尝试 ${attempt} 失败:`, queryResponse.statusText);
        continue;
      }
      
      const queryData = await queryResponse.json();
      
      if (queryData.data) {
        const status = queryData.data.status;
        console.log(`任务状态: ${status}`);
        
        if (status === 'done') {
          if (queryData.data.video_url) {
            const videoUrl = queryData.data.video_url;
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
        } else if (status === 'failed') {
          const message = queryData.data.message || '任务失败';
          throw new Error(`图生视频失败: ${message}`);
        } else if (status === 'in_queue' || status === 'generating') {
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