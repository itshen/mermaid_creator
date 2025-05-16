# Mermaid创建器

一个纯HTML前端应用，使用TailwindCSS样式和JavaScript功能，专门用于创建和编辑Mermaid图表。所有数据均存储在浏览器本地，无需后端服务。

## 功能特点

- 使用AI助手生成Mermaid图表代码
- 实时预览Mermaid图表
- 支持导出SVG和PNG格式
- 保存对话历史记录
- 纯前端应用，数据保存在本地

## 使用方法

1. 打开`index.html`文件即可使用本应用
2. 点击右上角"设置"按钮配置Qwen API密钥
3. 在文本框中输入描述，点击发送按钮生成图表
4. 可以在Quill编辑器中直接修改Mermaid代码
5. 使用右侧按钮导出图表为SVG或PNG格式

## 技术栈

- 前端：纯HTML + TailwindCSS + JavaScript
- 编辑器：Quill
- 图表渲染：Mermaid.js
- AI模型：Qwen (qwen-plus-latest)

## 本地运行

由于这是一个纯前端应用，您可以：

1. 直接在浏览器中打开`index.html`
2. 或者使用任何简单的HTTP服务器，例如：

```bash
# 使用Python启动一个简单的HTTP服务器
python3.11 -m http.server
```

然后在浏览器中访问 `http://localhost:8000`

## 注意事项

- 您需要自己提供Qwen API密钥才能使用AI功能
- 所有数据均存储在浏览器本地存储中，清除浏览器数据会导致历史记录丢失 