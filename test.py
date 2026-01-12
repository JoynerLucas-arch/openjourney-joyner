import json
import sys
import os
import base64
import datetime
import hashlib
import hmac
import requests


method = 'POST'
host = 'visual.volcengineapi.com'
region = 'cn-north-1'
endpoint = 'https://visual.volcengineapi.com'
service = 'cv'

def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def getSignatureKey(key, dateStamp, regionName, serviceName):
    kDate = sign(key.encode('utf-8'), dateStamp)
    kRegion = sign(kDate, regionName)
    kService = sign(kRegion, serviceName)
    kSigning = sign(kService, 'request')
    return kSigning

def formatQuery(parameters):
    request_parameters_init = ''
    for key in sorted(parameters):
        request_parameters_init += key + '=' + parameters[key] + '&'
    request_parameters = request_parameters_init[:-1]
    return request_parameters

def signV4Request(access_key, secret_key, service, req_query, req_body):
    if access_key is None or secret_key is None:
        print('No access key is available.')
        sys.exit()

    t = datetime.datetime.utcnow()
    current_date = t.strftime('%Y%m%dT%H%M%SZ')
    # current_date = '20210818T095729Z'
    datestamp = t.strftime('%Y%m%d')  # Date w/o time, used in credential scope
    canonical_uri = '/'
    canonical_querystring = req_query
    signed_headers = 'content-type;host;x-content-sha256;x-date'
    payload_hash = hashlib.sha256(req_body.encode('utf-8')).hexdigest()
    content_type = 'application/json'
    canonical_headers = 'content-type:' + content_type + '\n' + 'host:' + host + \
        '\n' + 'x-content-sha256:' + payload_hash + \
        '\n' + 'x-date:' + current_date + '\n'
    canonical_request = method + '\n' + canonical_uri + '\n' + canonical_querystring + \
        '\n' + canonical_headers + '\n' + signed_headers + '\n' + payload_hash
    # print(canonical_request)
    algorithm = 'HMAC-SHA256'
    credential_scope = datestamp + '/' + region + '/' + service + '/' + 'request'
    string_to_sign = algorithm + '\n' + current_date + '\n' + credential_scope + '\n' + hashlib.sha256(
        canonical_request.encode('utf-8')).hexdigest()
    # print(string_to_sign)
    signing_key = getSignatureKey(secret_key, datestamp, region, service)
    # print(signing_key)
    signature = hmac.new(signing_key, (string_to_sign).encode(
        'utf-8'), hashlib.sha256).hexdigest()
    # print(signature)

    authorization_header = algorithm + ' ' + 'Credential=' + access_key + '/' + \
        credential_scope + ', ' + 'SignedHeaders=' + \
        signed_headers + ', ' + 'Signature=' + signature
    # print(authorization_header)
    headers = {'X-Date': current_date,
               'Authorization': authorization_header,
               'X-Content-Sha256': payload_hash,
               'Content-Type': content_type
               }
    # print(headers)

    # ************* SEND THE REQUEST *************
    request_url = endpoint + '?' + canonical_querystring

    print('\nBEGIN REQUEST++++++++++++++++++++++++++++++++++++')
    print('Request URL = ' + request_url)
    try:
        r = requests.post(request_url, headers=headers, data=req_body)
    except Exception as err:
        print(f'error occurred: {err}')
        raise
    else:
        print('\nRESPONSE++++++++++++++++++++++++++++++++++++')
        print(f'Response code: {r.status_code}\n')
        # 使用 replace 方法将 \u0026 替换为 &
        resp_str = r.text.replace("\\u0026", "&")
        print(f'Response body: {resp_str}\n')
        return r.json()

def queryTask(access_key, secret_key, task_id):
    """查询任务结果"""
    # 查询任务的Query参数
    query_params = {
        'Action': 'CVSync2AsyncGetResult',
        'Version': '2022-08-31',
    }
    formatted_query = formatQuery(query_params)
    
    # 查询任务的Body参数
    body_params = {
        "req_key": "jimeng_t2i_v31",
        "task_id": task_id,
        "req_json": json.dumps({"return_url": True})  # 返回图片链接
    }
    formatted_body = json.dumps(body_params)
    
    return signV4Request(access_key, secret_key, service, formatted_query, formatted_body)

def downloadAndSaveImage(image_url, filename):
    """下载并保存图片"""
    try:
        response = requests.get(image_url)
        if response.status_code == 200:
            # 确保目录存在
            os.makedirs('generated_images', exist_ok=True)
            filepath = os.path.join('generated_images', filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f'图片已保存到: {filepath}')
            return filepath
        else:
            print(f'下载图片失败，状态码: {response.status_code}')
            return None
    except Exception as e:
        print(f'下载图片时出错: {e}')
        return None


if __name__ == "__main__":
    import time
    
    # 请求凭证，从访问控制申请
    access_key = 'AKLTZDZiYmE2ODU4ZTQxNGExMTg1OTYxNTI4YTk3MGNiZWY'
    secret_key = 'WmpZek1XWTNZV1l4WldJNE5EUm1OR0U0T0RFeVlqWTRNVFEwWTJRMVlXWQ=='

    # 第一步：提交任务
    print("=== 提交图片生成任务 ===")
    query_params = {
        'Action': 'CVSync2AsyncSubmitTask',
        'Version': '2022-08-31',
    }
    formatted_query = formatQuery(query_params)

    body_params = {
        "req_key": "jimeng_t2i_v31",
        "prompt": "A majestic ice warrior in blue armor standing in a snowy landscape",
        "width": 1024,
        "height": 1024
    }
    formatted_body = json.dumps(body_params)
    
    submit_response = signV4Request(access_key, secret_key, service,
                                  formatted_query, formatted_body)
    
    if submit_response and 'data' in submit_response and 'task_id' in submit_response['data']:
        task_id = submit_response['data']['task_id']
        print(f"任务提交成功，task_id: {task_id}")
        
        # 第二步：查询任务结果
        print("\n=== 查询任务结果 ===")
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            print(f"第 {attempt} 次查询...")
            
            query_response = queryTask(access_key, secret_key, task_id)
            
            if query_response and 'data' in query_response:
                data = query_response['data']
                status = data.get('status', '')
                
                print(f"任务状态: {status}")
                
                if status == 'done':
                    # 任务完成，获取图片
                    if 'image_urls' in data and data['image_urls']:
                        image_url = data['image_urls'][0]
                        print(f"\n生成的图片URL: {image_url}")
                        
                        # 下载并保存图片
                        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                        filename = f"generated_image_{timestamp}.png"
                        saved_path = downloadAndSaveImage(image_url, filename)
                        
                        if saved_path:
                            print(f"\n✅ 图片生成完成！")
                            print(f"图片URL: {image_url}")
                            print(f"本地保存路径: {saved_path}")
                        break
                    else:
                        print("响应中没有找到图片URL")
                        break
                elif status == 'failed':
                    print("任务失败")
                    if 'message' in data:
                        print(f"失败原因: {data['message']}")
                    break
                elif status in ['running', 'pending']:
                    print("任务还在处理中，等待5秒后重试...")
                    time.sleep(5)
                else:
                    print(f"未知状态: {status}")
                    time.sleep(3)
            else:
                print("查询响应异常")
                time.sleep(3)
        
        if attempt >= max_attempts:
            print("\n❌ 达到最大查询次数，任务可能仍在处理中")
    else:
        print("任务提交失败")
