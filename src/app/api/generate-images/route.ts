import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
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

    // Use user-provided credentials if available, otherwise fallback to environment variables
    const accessKeyId = accessKey || process.env.JIMENG_IMAGE_ACCESS_KEY;
    const secretAccessKey = secretKey || process.env.JIMENG_IMAGE_SECRET_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ 
        error: "未提供图片生成API凭证。请在设置中配置图片生成的Access Key和Secret Key。" 
      }, { status: 401 });
    }

    console.log("Generating image for prompt:", prompt);

    // Helper functions for signing
    const sign = (key: string | Buffer, msg: string): Buffer => {
      return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
    };

    const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string): Buffer => {
      const kDate = sign(key, dateStamp);
      const kRegion = sign(kDate, regionName);
      const kService = sign(kRegion, serviceName);
      const kSigning = sign(kService, 'request');
      return kSigning;
    };

    const formatQuery = (parameters: Record<string, string>): string => {
      let requestParameters = '';
      for (const key of Object.keys(parameters).sort()) {
        requestParameters += key + '=' + parameters[key] + '&';
      }
      return requestParameters.slice(0, -1);
    };

    // Prepare request for JiMeng AI API
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

    const bodyParams = {
      "req_key": "jimeng_t2i_v31",
      "prompt": prompt,
      "width": 2560,
      "height": 1440
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
    console.log('Submitting task to JiMeng AI...');
    const submitResponse = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Submit task error:", errorText);
      throw new Error(`Task submission failed: ${submitResponse.statusText} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    
    if (!submitData.data || !submitData.data.task_id) {
      throw new Error('Task submission failed: No task ID returned');
    }

    const taskId = submitData.data.task_id;
    console.log(`Task submitted successfully, task_id: ${taskId}`);

    // Step 2: Query task result with polling
    const maxAttempts = 20;
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Querying task result, attempt ${attempt}...`);
      
      // Wait before querying
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Prepare query request
      const queryParams = {
        'Action': 'CVSync2AsyncGetResult',
        'Version': '2022-08-31',
      };
      const queryFormattedQuery = formatQuery(queryParams);
      
      const queryBodyParams = {
        "req_key": "jimeng_t2i_v31",
        "task_id": taskId,
        "req_json": JSON.stringify({"return_url": true})
      };
      const queryBody = JSON.stringify(queryBodyParams);
      
      // Sign query request
      const queryT = new Date();
      const queryCurrentDate = queryT.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z';
      const queryDatestamp = queryT.toISOString().slice(0, 10).replace(/-/g, '');
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
        console.error(`Query attempt ${attempt} failed:`, queryResponse.statusText);
        continue;
      }
      
      const queryData = await queryResponse.json();
      
      if (queryData.data) {
        const status = queryData.data.status;
        console.log(`Task status: ${status}`);
        
        if (status === 'done') {
          if (queryData.data.image_urls && queryData.data.image_urls.length > 0) {
            const imageUrl = queryData.data.image_urls[0];
            console.log('Image generation completed successfully');
            
            // Download the image and convert to base64
            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageBuffer).toString('base64');
              
              // Save image to public/generated-images directory
              let localImagePath;
              try {
                localImagePath = await saveImageLocally(imageBuffer, prompt);
                console.log('图片保存成功:', localImagePath);
              } catch (saveError) {
                console.error('保存图片失败:', saveError);
                // Continue with base64 if save fails
              }
              
              // Generate unique ID based on filename
              const filename = localImagePath ? path.basename(localImagePath) : `${Date.now()}-0`;
              const imageId = filename.replace(/\.[^/.]+$/, ""); // Remove file extension for ID
              
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
            } else {
              throw new Error('Failed to download generated image');
            }
          } else {
            throw new Error('No image URLs found in response');
          }
        } else if (status === 'failed') {
          const message = queryData.data.message || 'Task failed';
          throw new Error(`Image generation failed: ${message}`);
        } else if (status === 'running' || status === 'pending') {
          console.log('Task still processing, waiting...');
          continue;
        } else {
          console.log(`Unknown status: ${status}`);
          continue;
        }
      } else {
        console.log('Invalid query response');
        continue;
      }
    }
    
    throw new Error('Image generation timed out after maximum attempts');

  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "Failed to generate images" }, 
      { status: 500 }
    );
  }
}