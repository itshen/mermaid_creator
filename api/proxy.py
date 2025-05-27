from http.server import BaseHTTPRequestHandler
import urllib.request
import json
import ssl
from urllib.error import HTTPError

def proxy_to_qwen(request_body):
    """代理请求到通义千问API"""
    try:
        # 解析请求数据
        data = json.loads(request_body)
        api_key = data.get('api_key', '')
        model = data.get('model', 'qwen-plus-latest')
        messages = data.get('messages', [])
        
        # 准备发送到阿里云的请求
        target_url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        payload = {
            'model': model,
            'input': {
                'messages': messages
            },
            'parameters': {
                'result_format': 'message'
            }
        }
        
        # 创建请求
        req = urllib.request.Request(
            target_url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        # 发送请求
        context = ssl.create_default_context()
        with urllib.request.urlopen(req, context=context) as response:
            response_data = response.read().decode('utf-8')
            return {
                'statusCode': 200,
                'body': response_data,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
    except HTTPError as e:
        # 处理API错误
        error_message = e.read().decode('utf-8')
        return {
            'statusCode': e.code,
            'body': error_message,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    except Exception as e:
        # 处理其他错误
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }

def proxy_to_openrouter(request_body):
    """代理请求到OpenRouter API"""
    try:
        # 解析请求数据
        data = json.loads(request_body)
        api_key = data.get('api_key', '')
        model = data.get('model', 'anthropic/claude-sonnet-4')
        messages = data.get('messages', [])
        
        # 准备发送到OpenRouter的请求
        target_url = 'https://openrouter.ai/api/v1/chat/completions'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'HTTP-Referer': 'https://mermaid-creator.vercel.app',
        }
        
        payload = {
            'model': model,
            'messages': messages
        }
        
        # 创建请求
        req = urllib.request.Request(
            target_url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        # 发送请求
        context = ssl.create_default_context()
        with urllib.request.urlopen(req, context=context) as response:
            response_data = response.read().decode('utf-8')
            return {
                'statusCode': 200,
                'body': response_data,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
    except HTTPError as e:
        # 处理API错误
        error_message = e.read().decode('utf-8')
        return {
            'statusCode': e.code,
            'body': error_message,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    except Exception as e:
        # 处理其他错误
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }

# Vercel serverless函数入口点
def handler(request):
    """处理Vercel请求"""
    if request.method == 'OPTIONS':
        # 处理预检请求
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': ''
        }
    
    if request.method == 'POST':
        # 处理POST请求
        try:
            request_body = request.body
            
            # 根据路径决定使用哪个代理
            if hasattr(request, 'url') and '/proxy/openrouter' in request.url:
                return proxy_to_openrouter(request_body)
            else:
                # 默认使用Qwen
                return proxy_to_qwen(request_body)
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': str(e)}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
    
    # 默认返回（GET请求等）
    return {
        'statusCode': 200,
        'body': json.dumps({'status': 'ok', 'message': '代理服务器运行正常'}),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    } 