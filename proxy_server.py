from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json
import ssl

class ProxyHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
    def do_POST(self):
        # 只处理代理请求
        if self.path == '/proxy/qwen':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # 获取API密钥和其他数据
            api_key = request_data.get('api_key', '')
            model = request_data.get('model', 'qwen-plus')
            messages = request_data.get('messages', [])
            
            # 准备发送到阿里云的请求
            target_url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
            
            data = {
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
                data=json.dumps(data).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            try:
                # 发送请求
                context = ssl.create_default_context()
                with urllib.request.urlopen(req, context=context) as response:
                    response_data = response.read()
                    
                    # 返回响应
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response_data)
            except urllib.error.HTTPError as e:
                # 处理API错误
                self.send_response(e.code)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_message = e.read().decode('utf-8')
                self.wfile.write(error_message.encode('utf-8'))
            except Exception as e:
                # 处理其他错误
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_data = json.dumps({'error': str(e)})
                self.wfile.write(error_data.encode('utf-8'))
        else:
            # 其他请求按照普通文件服务器处理
            return SimpleHTTPRequestHandler.do_GET(self)

def run(server_class=HTTPServer, handler_class=ProxyHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'启动代理服务器在 http://localhost:{port}')
    httpd.serve_forever()

if __name__ == '__main__':
    run() 