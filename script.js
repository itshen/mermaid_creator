// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Mermaid
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        backgroundColor: '#ffffff'
    });

    // 初始化Quill编辑器
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: '在这里查看和编辑Mermaid代码...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });

    // 加载保存的API KEY
    const savedApiKey = localStorage.getItem('qwenApiKey') || '';
    document.getElementById('apiKey').value = savedApiKey;

    // 加载对话历史
    loadConversations();
    
    // 获取活跃的对话ID
    const activeId = localStorage.getItem('activeConversationId');
    if (activeId) {
        // 如果有活跃的对话，加载该对话的最后一个图表
        loadConversation(activeId);
    } else {
        // 如果没有活跃的对话，显示示例图表
        const exampleMermaidCode = `graph TD
    A[开始] --> B{是否有API Key?}
    B -->|是| C[发送请求到AI]
    B -->|否| D[显示设置页面]
    C --> E[更新预览]
    D --> F[保存API Key]
    F --> C
    E --> G[下载SVG]
    G --> H[结束]`;
        
        quill.setText(exampleMermaidCode);
        updateMermaidPreview(exampleMermaidCode);
    }

    // 设置按钮事件
    setupEventListeners(quill);
});

// 设置事件监听器
function setupEventListeners(quill) {
    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const settingsDrawer = document.getElementById('settingsDrawer');
    const newConversationBtn = document.getElementById('newConversationBtn');

    // 发送按钮
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');

    // SVG下载按钮
    const copySvgBtn = document.getElementById('copySvgBtn');
    
    // 版本保存按钮
    const saveVersionBtn = document.getElementById('saveVersionBtn');
    const versionsDrawer = document.getElementById('versionsDrawer');
    const closeVersions = document.getElementById('closeVersions');
    const toggleVersionsBtn = document.getElementById('toggleVersionsBtn');

    // 设置抽屉事件
    settingsBtn.addEventListener('click', () => {
        settingsDrawer.classList.remove('hidden');
    });

    closeSettings.addEventListener('click', () => {
        settingsDrawer.classList.add('hidden');
    });

    saveSettings.addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value.trim();
        localStorage.setItem('qwenApiKey', apiKey);
        settingsDrawer.classList.add('hidden');
        alert('设置已保存');
    });
    
    // 新建对话按钮事件
    newConversationBtn.addEventListener('click', () => {
        createNewConversation();
        document.getElementById('userInput').focus();
    });
    
    // 版本抽屉事件
    toggleVersionsBtn.addEventListener('click', () => {
        const versionsDrawer = document.getElementById('versionsDrawer');
        if (versionsDrawer.classList.contains('hidden')) {
            // 打开版本抽屉前先更新版本列表
            loadVersions();
            versionsDrawer.classList.remove('hidden');
        } else {
            versionsDrawer.classList.add('hidden');
        }
    });
    
    closeVersions.addEventListener('click', () => {
        versionsDrawer.classList.add('hidden');
    });
    
    // 保存版本按钮事件
    saveVersionBtn.addEventListener('click', () => {
        const versionName = prompt('请输入此版本的名称：', '版本 ' + new Date().toLocaleString());
        if (versionName) {
            saveCurrentVersion(versionName);
        }
    });
    
    // 添加键盘快捷键功能
    userInput.addEventListener('keydown', (e) => {
        // 直接Enter键发送消息（因为现在是单行输入框）
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // 阻止默认行为
            if (!sendBtn.disabled) {
                sendBtn.click(); // 触发发送按钮点击
            }
        }
        // Ctrl+Enter或Command+Enter也支持
        else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault(); // 阻止默认行为
            if (!sendBtn.disabled) {
                sendBtn.click(); // 触发发送按钮点击
            }
        }
    });

    // 发送消息事件
    sendBtn.addEventListener('click', async () => {
        const input = userInput.value.trim();
        if (!input) return;

        // 禁用输入和按钮
        toggleInputState(false, quill);
        
        // 获取当前Mermaid代码（如果有）
        const currentMermaidCode = quill.getText().trim();
        
        try {
            // 当前活跃的对话ID
            const activeConversationId = localStorage.getItem('activeConversationId') || createNewConversation();
            
            // 添加用户消息到对话历史
            const conversation = getConversation(activeConversationId);
            if (conversation) {
                conversation.messages.push({
                    role: 'user',
                    content: input
                });
                updateConversation(activeConversationId, conversation);
            }
            
            // 发送请求到AI并处理响应
            const result = await sendToAI(input, currentMermaidCode);
            
            // 提取Mermaid代码
            const mermaidCode = extractMermaidCode(result);
            
            if (mermaidCode) {
                // 更新编辑器内容前先移除事件监听器，防止死循环
                quill.off('text-change');
                
                // 更新编辑器内容
                quill.setText(mermaidCode);
                
                // 更新预览
                updateMermaidPreview(mermaidCode);
                
                // 添加AI响应到对话历史
                if (conversation) {
                    conversation.messages.push({
                        role: 'assistant',
                        content: result
                    });
                    
                    // 将当前响应自动添加为新版本
                    const versionName = `回复: ${input.substring(0, 20)}${input.length > 20 ? '...' : ''}`;
                    addVersion(conversation, versionName, input, mermaidCode);
                    
                    updateConversation(activeConversationId, conversation);
                    
                    // 更新版本列表
                    loadVersions();
                }
                
                // 延迟添加事件监听器
                setTimeout(() => {
                    // 重新添加事件监听器
                    addEditorEventListener(quill);
                }, 100);
            } else {
                alert('未能从AI响应中提取有效的Mermaid代码');
                console.error('无法提取Mermaid代码，完整响应:', result);
            }
        } catch (error) {
            console.error('发送请求时出错：', error);
            alert('发送请求时出错：' + error.message);
        } finally {
            // 清空输入框
            userInput.value = '';
            
            // 恢复输入和按钮状态
            toggleInputState(true, quill);
        }
    });

    // 下载SVG按钮事件
    copySvgBtn.addEventListener('click', () => {
        const svgElement = document.querySelector('#preview svg');
        if (!svgElement) {
            alert('没有可供下载的SVG');
            return;
        }

        try {
            // 获取SVG内容
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // 创建下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = svgUrl;
            downloadLink.download = 'mermaid_diagram_' + new Date().toISOString().replace(/[:.]/g, '-') + '.svg';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // 清理对象URL
            setTimeout(() => {
                URL.revokeObjectURL(svgUrl);
            }, 100);
        } catch (err) {
            console.error('下载SVG失败：', err);
            alert('下载SVG失败：' + err.message);
        }
    });

    // 初始添加编辑器事件监听器
    addEditorEventListener(quill);
}

// 添加编辑器事件监听器，抽离为独立函数便于重用
function addEditorEventListener(quill) {
    // 移除之前的监听器以防重复
    quill.off('text-change');
    
    // 添加新的监听器
    quill.on('text-change', () => {
        const text = quill.getText().trim();
        if (text) {
            updateMermaidPreview(text);
        } else {
            // 清空预览区域，避免空内容触发mermaid错误
            document.getElementById('preview').innerHTML = '';
        }
    });
}

// 切换输入状态（启用/禁用）
function toggleInputState(enabled, quill) {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    
    if (enabled) {
        sendBtn.classList.remove('disabled');
        sendBtn.disabled = false;
        userInput.disabled = false;
        quill.enable();
        
        // 恢复按钮文本
        sendBtn.innerHTML = '发送';
    } else {
        sendBtn.classList.add('disabled');
        sendBtn.disabled = true;
        userInput.disabled = true;
        quill.disable();
        
        // 添加加载状态
        sendBtn.innerHTML = '<span class="loading"></span>';
        
        // 设置超时恢复
        setTimeout(() => {
            if (sendBtn.disabled) {
                toggleInputState(true, quill);
                alert('请求超时，已恢复输入状态');
            }
        }, 60000); // 1分钟超时
    }
}

// 发送请求到AI
async function sendToAI(userInput, currentMermaidCode) {
    const apiKey = localStorage.getItem('qwenApiKey');
    if (!apiKey) {
        throw new Error('请先在设置中配置API Key');
    }

    // 准备发送到AI的消息
    let messages = [
        {
            role: 'system',
            content: '你是一个专业的Mermaid图表生成助手。请根据用户的描述生成有效的Mermaid代码。请务必完整返回，不要做额外的省略。仅返回被```mermaid和```包裹的代码，不要返回其他内容。'
        },
        {
            role: 'user',
            content: userInput
        }
    ];

    // 如果已有Mermaid代码，将其添加到消息中
    if (currentMermaidCode) {
        messages.splice(1, 0, {
            role: 'assistant',
            content: '```mermaid\n' + currentMermaidCode + '\n```'
        });
    }

    // 使用本地代理服务器发送请求
    const response = await fetch('/proxy/qwen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            api_key: apiKey,
            model: 'qwen-plus',
            messages: messages
        })
    });

    // 检查响应
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API请求失败: ${errorData.message || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    // 适配新版API响应格式
    const content = data.output && data.output.choices && data.output.choices[0] && 
                    data.output.choices[0].message && data.output.choices[0].message.content || '';
    return content;
}

// 从AI响应中提取Mermaid代码
function extractMermaidCode(response) {
    try {
        // 首先尝试使用正则表达式匹配mermaid代码块
        const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/;
        const match = response.match(mermaidRegex);
        if (match) {
            return match[1].trim();
        }
        
        // 如果正则匹配失败，检查是否为JSON响应（字符串形式）
        if (response.includes('"content":')) {
            try {
                // 尝试解析为JSON
                const jsonObj = JSON.parse(response);
                // 检查是否有content字段
                if (jsonObj.content) {
                    const contentMatch = jsonObj.content.match(mermaidRegex);
                    if (contentMatch) {
                        return contentMatch[1].trim();
                    }
                }
            } catch (e) {
                console.warn('响应不是有效的JSON:', e);
            }
        }
        
        // 如果以上方法都失败，直接返回响应内容
        // 这是最后的后备措施，避免完全无法处理响应
        return response.trim();
    } catch (error) {
        console.error('提取Mermaid代码时出错:', error);
        return null;
    }
}

// 更新Mermaid预览
function updateMermaidPreview(code, retryCount = 0) {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = `<div class="mermaid">${code}</div>`;
    
    try {
        // 确保使用与mermaid.js版本兼容的方法进行渲染
        if (typeof mermaid.run === 'function') {
            // 新版mermaid使用run方法
            mermaid.run({
                nodes: document.querySelectorAll('.mermaid:not(.mermaid-processed)')
            });
        } else {
            // 旧版mermaid使用init方法
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        }
    } catch (error) {
        console.error('Mermaid渲染错误：', error);
        
        // 检查是否已经重试次数过多
        if (retryCount >= 3) {
            // 已达到最大重试次数，显示错误给用户
            previewDiv.innerHTML = `<div class="text-red-500 p-4">Mermaid图表渲染错误（已尝试3次修复）：${error.message}</div>`;
            return;
        }
        
        // 尝试请求AI修复语法错误
        const activeConversationId = localStorage.getItem('activeConversationId');
        if (activeConversationId) {
            // 获取当前对话以添加错误信息
            const conversation = getConversation(activeConversationId);
            if (conversation && conversation.messages.length > 0) {
                // 显示正在修复的提示
                previewDiv.innerHTML = `<div class="text-blue-500 p-4">正在请求AI修复Mermaid语法错误，请稍候...</div>`;
                
                // 调用修复函数
                requestMermaidFix(code, error, activeConversationId, retryCount).catch(fixError => {
                    console.error('请求AI修复图表失败：', fixError);
                    previewDiv.innerHTML = `<div class="text-red-500 p-4">修复请求失败：${fixError.message}</div>`;
                });
            }
        } else {
            // 没有活跃对话，直接显示错误
            previewDiv.innerHTML = `<div class="text-red-500 p-4">Mermaid图表渲染错误：${error.message}</div>`;
        }
    }
}

// 请求AI修复Mermaid语法错误
async function requestMermaidFix(code, error, conversationId, retryCount) {
    // 创建修复请求消息
    const fixRequest = `我的Mermaid图表代码有语法错误，请修复：
错误信息: ${error.message || JSON.stringify(error)}

当前代码:
\`\`\`mermaid
${code}
\`\`\`

请只返回修复后的完整代码，不要解释或添加其他内容。`;

    // 获取当前对话
    const conversation = getConversation(conversationId);
    if (!conversation) {
        throw new Error('找不到当前对话');
    }

    // 禁用输入和按钮
    const quill = Quill.find(document.getElementById('editor-container'));
    if (quill) {
        toggleInputState(false, quill);
    }

    try {
        // 发送修复请求到AI
        const result = await sendToAI(fixRequest, code);
        
        // 提取修复后的Mermaid代码
        const fixedCode = extractMermaidCode(result);
        
        if (fixedCode) {
            // 更新编辑器内容前先移除事件监听器，防止死循环
            if (quill) {
                quill.off('text-change');
                quill.setText(fixedCode);
            }
            
            // 添加AI修复响应到对话历史
            conversation.messages.push({
                role: 'user',
                content: fixRequest
            });
            
            conversation.messages.push({
                role: 'assistant',
                content: result
            });
            
            updateConversation(conversationId, conversation);
            
            // 尝试使用修复后的代码更新预览（增加重试计数）
            updateMermaidPreview(fixedCode, retryCount + 1);
            
            // 延迟添加事件监听器
            if (quill) {
                setTimeout(() => {
                    addEditorEventListener(quill);
                }, 100);
            }
        } else {
            throw new Error('未能从AI响应中提取有效的Mermaid代码');
        }
    } catch (error) {
        throw error;
    } finally {
        // 恢复输入和按钮状态
        if (quill) {
            toggleInputState(true, quill);
        }
    }
}

// 创建新对话
function createNewConversation() {
    const id = Date.now().toString();
    const conversation = {
        id,
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
        versions: [] // 添加版本历史
    };
    
    // 保存到localStorage
    const conversations = getConversations();
    conversations.push(conversation);
    localStorage.setItem('conversations', JSON.stringify(conversations));
    
    // 设置为活跃对话
    localStorage.setItem('activeConversationId', id);
    
    // 更新UI
    loadConversations();
    
    try {
        // 清空编辑器和预览区域
        const quill = Quill.find(document.getElementById('editor-container'));
        if (quill) {
            // 临时移除事件监听器，防止触发死循环
            quill.off('text-change');
            
            // 清空编辑器内容
            quill.setText('');
            
            // 清空预览区
            document.getElementById('preview').innerHTML = '';
            
            // 清空版本列表
            document.getElementById('versionsList').innerHTML = '';
            
            // 延迟重新添加事件处理器
            setTimeout(() => {
                addEditorEventListener(quill);
            }, 50);
        }
    } catch (err) {
        console.error('清空编辑器出错:', err);
    }
    
    return id;
}

// 获取所有对话
function getConversations() {
    return JSON.parse(localStorage.getItem('conversations') || '[]');
}

// 获取单个对话
function getConversation(id) {
    const conversations = getConversations();
    return conversations.find(conv => conv.id === id);
}

// 更新对话
function updateConversation(id, updatedConversation) {
    const conversations = getConversations();
    const index = conversations.findIndex(conv => conv.id === id);
    
    if (index !== -1) {
        // 如果是首次添加消息，从用户输入中提取标题
        if (conversations[index].messages.length === 0 && 
            updatedConversation.messages.length > 0 &&
            updatedConversation.title === '新对话') {
            
            const firstMessage = updatedConversation.messages[0].content;
            updatedConversation.title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        }
        
        conversations[index] = updatedConversation;
        localStorage.setItem('conversations', JSON.stringify(conversations));
        
        // 刷新UI
        loadConversations();
    }
}

// 删除对话
function deleteConversation(id) {
    let conversations = getConversations();
    conversations = conversations.filter(conv => conv.id !== id);
    localStorage.setItem('conversations', JSON.stringify(conversations));
    
    // 如果删除的是当前活跃对话，重置活跃对话
    const activeId = localStorage.getItem('activeConversationId');
    if (activeId === id) {
        localStorage.removeItem('activeConversationId');
        
        // 清空编辑器
        const quill = Quill.find(document.getElementById('editor-container'));
        if (quill) {
            quill.setText('');
        }
        
        // 清空预览
        document.getElementById('preview').innerHTML = '';
    }
    
    // 刷新UI
    loadConversations();
}

// 加载对话列表到UI
function loadConversations() {
    const titleList = document.getElementById('titleList');
    const conversations = getConversations();
    const activeId = localStorage.getItem('activeConversationId');
    
    // 清空列表
    titleList.innerHTML = '';
    
    // 按创建时间逆序排序
    conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 添加到列表
    conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = `title-item ${conv.id === activeId ? 'active' : ''}`;
        li.innerHTML = `
            <span class="title-text truncate">${conv.title}</span>
            <button class="delete-btn text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        // 点击标题切换对话
        li.querySelector('.title-text').addEventListener('click', () => {
            loadConversation(conv.id);
        });
        
        // 点击删除按钮删除对话
        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除对话 "${conv.title}" 吗？`)) {
                deleteConversation(conv.id);
            }
        });
        
        titleList.appendChild(li);
    });
}

// 加载对话内容
function loadConversation(id) {
    const conversation = getConversation(id);
    if (!conversation) return;
    
    // 设置为活跃对话
    localStorage.setItem('activeConversationId', id);
    
    // 高亮选中的标题
    document.querySelectorAll('.title-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 查找包含特定标题文本的元素（浏览器兼容写法）
    const titleElements = document.querySelectorAll('.title-item');
    for (let i = 0; i < titleElements.length; i++) {
        const titleText = titleElements[i].querySelector('.title-text');
        if (titleText && titleText.textContent === conversation.title) {
            titleElements[i].classList.add('active');
            break;
        }
    }
    
    // 获取最后一条助手消息中的Mermaid代码
    const assistantMessages = conversation.messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        const mermaidCode = extractMermaidCode(lastAssistantMessage.content);
        
        if (mermaidCode) {
            // 更新编辑器
            const quill = Quill.find(document.getElementById('editor-container'));
            if (quill) {
                // 临时移除事件监听器
                quill.off('text-change');
                
                quill.setText(mermaidCode);
                
                // 更新预览
                updateMermaidPreview(mermaidCode);
                
                // 重新添加事件监听器
                setTimeout(() => {
                    addEditorEventListener(quill);
                }, 50);
            }
        }
    }
    return conversation;
}

// 添加新的polyfill
document.addEventListener('DOMContentLoaded', () => {
    // 确保基本的Element.prototype方法在所有浏览器中可用
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            var el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }
});

// 添加版本
function addVersion(conversation, name, prompt, code) {
    if (!conversation.versions) {
        conversation.versions = [];
    }
    
    conversation.versions.push({
        id: Date.now().toString(),
        name: name,
        prompt: prompt,
        code: code,
        createdAt: new Date().toISOString()
    });
}

// 保存当前版本
function saveCurrentVersion(versionName) {
    const activeConversationId = localStorage.getItem('activeConversationId');
    if (!activeConversationId) {
        alert('没有活跃的对话');
        return;
    }
    
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
        alert('找不到当前对话');
        return;
    }
    
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) return;
    
    const mermaidCode = quill.getText().trim();
    if (!mermaidCode) {
        alert('当前没有可保存的图表代码');
        return;
    }
    
    // 获取上一个用户输入作为prompt（如果存在）
    let lastPrompt = '手动保存';
    const userMessages = conversation.messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
        lastPrompt = userMessages[userMessages.length - 1].content;
    }
    
    // 添加版本
    addVersion(conversation, versionName, lastPrompt, mermaidCode);
    updateConversation(activeConversationId, conversation);
    
    // 更新版本列表
    loadVersions();
    
    alert('版本已保存');
}

// 加载版本列表
function loadVersions() {
    const versionsList = document.getElementById('versionsList');
    if (!versionsList) return;
    
    versionsList.innerHTML = '';
    
    const activeConversationId = localStorage.getItem('activeConversationId');
    if (!activeConversationId) return;
    
    const conversation = getConversation(activeConversationId);
    if (!conversation || !conversation.versions || conversation.versions.length === 0) {
        versionsList.innerHTML = '<p class="text-gray-500 p-4">暂无版本历史</p>';
        return;
    }
    
    // 按创建时间逆序排序
    const versions = [...conversation.versions].reverse();
    
    versions.forEach(version => {
        const versionItem = document.createElement('div');
        versionItem.className = 'version-item border-b border-gray-200 p-3 hover:bg-gray-50 transition-colors cursor-pointer';
        
        const formattedDate = new Date(version.createdAt).toLocaleString();
        
        versionItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium">${version.name}</span>
                <span class="text-xs text-gray-500">${formattedDate}</span>
            </div>
            <div class="text-sm text-gray-600 truncate mt-1">${version.prompt}</div>
        `;
        
        // 点击加载该版本
        versionItem.addEventListener('click', () => {
            loadVersion(version);
        });
        
        versionsList.appendChild(versionItem);
    });
}

// 加载特定版本
function loadVersion(version) {
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) return;
    
    // 临时移除事件监听器
    quill.off('text-change');
    
    // 更新编辑器内容
    quill.setText(version.code);
    
    // 更新预览
    updateMermaidPreview(version.code);
    
    // 重新添加事件监听器
    setTimeout(() => {
        addEditorEventListener(quill);
    }, 50);
    
    // 可选：关闭版本抽屉
    const versionsDrawer = document.getElementById('versionsDrawer');
    if (versionsDrawer) {
        versionsDrawer.classList.add('hidden');
    }
} 