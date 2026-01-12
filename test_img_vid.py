import hashlib
import hmac
import json
import requests
import time
import base64
from datetime import datetime

# Step 1: AK/SK
# AK/SK from https://console.volcengine.com/iam/keymanage
# It is recommended to use environment variables to avoid hardcoding
# For example:
# import os
# AK = os.environ['VOLC_ACCESSKEY']
# SK = os.environ['VOLC_SECRETKEY']
AK = "AKLTNGMxOTU5ZjYxNDJjNDc3ZGEwNTI0NmU1MmFlNGExYjY"
SK = "WmpnMVpqUmtPR0V4WmpaaE5HVXhNMkkyWVdRNFpHWXpOek5rTWpRMVltRQ=="

# Step 2: Service parameters
# From https://www.volcengine.com/docs/85621/1798092
SERVICE = "cv"
REGION = "cn-north-1"
HOST = "visual.volcengineapi.com"
METHOD = "POST"
CONTENT_TYPE = "application/json"
SIGNED_HEADERS = "content-type;host;x-date"

def norm_uri(path):
    return "/" if not path else path

def norm_query(params):
    query = ""
    for key in sorted(params.keys()):
        if len(str(params[key])) > 0:
            query += "{}={}&".format(key, params[key])
    return query[:-1]

def hmac_sha256(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def hash_sha256(msg):
    return hashlib.sha256(msg.encode('utf-8')).hexdigest()

# Step 3: Create CanonicalRequest
def create_canonical_request(method, query, headers, payload):
    canonical_uri = norm_uri("/")
    canonical_query_string = norm_query(query)
    canonical_headers = ""
    for key in sorted(headers.keys()):
        canonical_headers += key.lower() + ":" + headers[key] + "\n"
    
    payload_hash = hashlib.sha256(payload).hexdigest()
    return f'{method}\n{canonical_uri}\n{canonical_query_string}\n{canonical_headers}\n{SIGNED_HEADERS}\n{payload_hash}'

# Step 4: Create StringToSign
def create_string_to_sign(canonical_request, t):
    algorithm = "HMAC-SHA256"
    date = t.strftime('%Y%m%d')
    credential_scope = f'{date}/{REGION}/{SERVICE}/request'
    
    hashed_canonical_request = hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    return f'{algorithm}\n{t.strftime("%Y%m%dT%H%M%SZ")}\n{credential_scope}\n{hashed_canonical_request}'

# Step 5: Calculate Signature
def calculate_signature(string_to_sign, t):
    date = t.strftime('%Y%m%d')
    k_date = hmac_sha256(SK.encode('utf-8'), date)
    k_region = hmac_sha256(k_date, REGION)
    k_service = hmac_sha256(k_region, SERVICE)
    k_signing = hmac_sha256(k_service, "request")
    return hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

# Step 6: Create Authorization header
def create_authorization_header(signature, t):
    date = t.strftime('%Y%m%d')
    credential_scope = f'{date}/{REGION}/{SERVICE}/request'
    return f'HMAC-SHA256 Credential={AK}/{credential_scope}, SignedHeaders={SIGNED_HEADERS}, Signature={signature}'

def encode_image_to_base64(image_path):
    """Convert image file to base64 string"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def main():
    # Submit task
    endpoint = f"https://{HOST}"
    
    t = datetime.utcnow()
    x_date = t.strftime('%Y%m%dT%H%M%SZ')
    
    # Submit task query
    submit_query = {
        "Action": "CVSync2AsyncSubmitTask",
        "Version": "2022-08-31",
    }
    
    # Use local image file: public/sample-images/generated-image-1.png
    image_path = "public/sample-images/generated-image-1.png"
    image_base64 = encode_image_to_base64(image_path)
    
    submit_body = {
        "req_key": "jimeng_i2v_first_v30_1080",
        # Using base64 encoded local image
        "binary_data_base64": [image_base64],
        "prompt": "a beautiful landscape with flowing water and gentle breeze",
        "seed": -1,
        "frames": 121  # 121 frames = 5 seconds, 241 frames = 10 seconds
    }
    
    submit_payload = json.dumps(submit_body).encode('utf-8')

    # Submit task headers
    submit_headers = {
        "Host": HOST,
        "Content-Type": CONTENT_TYPE,
        "X-Date": x_date,
    }

    canonical_request = create_canonical_request(METHOD, submit_query, submit_headers, submit_payload)
    string_to_sign = create_string_to_sign(canonical_request, t)
    signature = calculate_signature(string_to_sign, t)
    authorization = create_authorization_header(signature, t)
    
    submit_headers["Authorization"] = authorization

    print("--- Submitting image-to-video task ---")
    submit_url = f"{endpoint}?{norm_query(submit_query)}"
    r = requests.post(submit_url, headers=submit_headers, data=submit_payload)
    
    resp_json = r.json()
    print(r.status_code)
    print(json.dumps(resp_json, indent=4))

    if resp_json.get("code") != 10000:
        print("Submit task failed")
        return

    task_id = resp_json.get("data", {}).get("task_id")
    if not task_id:
        print("Failed to get task_id")
        return

    print(f"Task submitted successfully, task_id: {task_id}")

    # Query task loop
    while True:
        print("\n--- Querying task status ---")
        time.sleep(5) # wait for 5 seconds before querying

        t = datetime.utcnow()
        x_date = t.strftime('%Y%m%dT%H%M%SZ')

        # Query task query
        query_query = {
            "Action": "CVSync2AsyncGetResult",
            "Version": "2022-08-31",
        }

        # Query task body
        query_body = {
            "req_key": "jimeng_i2v_first_v30_1080",
            "task_id": task_id,
        }
        query_payload = json.dumps(query_body).encode('utf-8')

        # Query task headers
        query_headers = {
            "Host": HOST,
            "Content-Type": CONTENT_TYPE,
            "X-Date": x_date,
        }

        canonical_request = create_canonical_request(METHOD, query_query, query_headers, query_payload)
        string_to_sign = create_string_to_sign(canonical_request, t)
        signature = calculate_signature(string_to_sign, t)
        authorization = create_authorization_header(signature, t)
        
        query_headers["Authorization"] = authorization

        query_url = f"{endpoint}?{norm_query(query_query)}"
        r = requests.post(query_url, headers=query_headers, data=query_payload)
        
        resp_json = r.json()
        print(r.status_code)
        print(json.dumps(resp_json, indent=4))

        if resp_json.get("code") != 10000:
            print("Query task failed")
            break

        status = resp_json.get("data", {}).get("status")
        if status == "done":
            video_url = resp_json.get("data", {}).get("video_url")
            print(f"Task finished! Video URL: {video_url}")
            break
        elif status in ["in_queue", "generating"]:
            print(f"Task is {status}, waiting...")
        else:
            print(f"Task status: {status}. Exiting.")
            break

if __name__ == '__main__':
    main()