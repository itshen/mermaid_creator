// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 设置页面背景色为浅灰色
    document.body.style.backgroundColor = '#f8f8f8';
    
    // 初始化Mermaid
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        backgroundColor: '#ffffff',
        themeVariables: {
            background: '#ffffff'
        }
    });

    // 设置输入框placeholder，根据操作系统区分
    const userInput = document.getElementById('userInput');
    if (userInput) {
        // 检测是否为Mac系统
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (isMac) {
            userInput.placeholder = "输入您想生成的图表描述...（按Enter换行，按⌘+Enter发送）";
        } else {
            userInput.placeholder = "输入您想生成的图表描述...（按Enter换行，按Ctrl+Enter发送）";
        }
    }

    // 初始化Quill编辑器
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: '在这里查看和编辑Mermaid代码...',
        modules: {
            toolbar: false
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
        // 如果有活跃的对话，加载该对话的最后一个图表和最后一条用户消息
        const conversation = loadConversation(activeId);
        
        // 确保加载最后一条用户消息到顶部显示区
        if (conversation && conversation.messages && conversation.messages.length > 0) {
            const userMessages = conversation.messages.filter(msg => msg.role === 'user');
            if (userMessages.length > 0) {
                const lastUserMessage = userMessages[userMessages.length - 1];
                updateLastUserInput(lastUserMessage.content);
            }
        }
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
    
    // 用户回复区域
    const lastUserInput = document.getElementById('lastUserInput');
    const copyLastInputBtn = document.getElementById('copyLastInputBtn');

    // SVG下载按钮
    const copySvgBtn = document.getElementById('copySvgBtn');
    
    // 版本保存按钮
    const saveVersionBtn = document.getElementById('saveVersionBtn');
    const versionsDrawer = document.getElementById('versionsDrawer');
    const closeVersions = document.getElementById('closeVersions');
    const toggleVersionsBtn = document.getElementById('toggleVersionsBtn');

    // 设置抽屉事件
    settingsBtn.addEventListener('click', openSettingsDrawer);
    closeSettings.addEventListener('click', closeSettingsDrawer);

    saveSettings.addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value.trim();
        localStorage.setItem('qwenApiKey', apiKey);
        closeSettingsDrawer();
        showToast('设置已保存');
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
            // 显示背景
            versionsDrawer.classList.remove('hidden');
            // 等一帧以确保过渡效果正常
            requestAnimationFrame(() => {
                // 滑入抽屉
                const drawerContent = versionsDrawer.querySelector('div');
                if (drawerContent) {
                    drawerContent.classList.remove('translate-x-full');
                }
            });
        } else {
            // 关闭抽屉
            closeVersionsDrawer();
        }
    });
    
    closeVersions.addEventListener('click', closeVersionsDrawer);
    
    // 抽取关闭版本抽屉的函数，确保一致性
    function closeVersionsDrawer() {
        const versionsDrawer = document.getElementById('versionsDrawer');
        if (!versionsDrawer) return;
        
        // 滑出抽屉
        const drawerContent = versionsDrawer.querySelector('div');
        if (drawerContent) {
            drawerContent.classList.add('translate-x-full');
            // 等待过渡完成后隐藏背景
            setTimeout(() => {
                versionsDrawer.classList.add('hidden');
            }, 300);
        } else {
            versionsDrawer.classList.add('hidden');
        }
    }
    
    // 保存版本按钮事件
    saveVersionBtn.addEventListener('click', openSaveVersionDialog);
    
    // 设置保存版本对话框按钮事件
    const cancelSaveVersion = document.getElementById('cancelSaveVersion');
    const confirmSaveVersion = document.getElementById('confirmSaveVersion');
    const saveVersionDialog = document.getElementById('saveVersionDialog');
    const versionNameInput = document.getElementById('versionNameInput');
    
    if (cancelSaveVersion && saveVersionDialog) {
        cancelSaveVersion.addEventListener('click', closeSaveVersionDialog);
    }
    
    if (confirmSaveVersion && saveVersionDialog && versionNameInput) {
        confirmSaveVersion.addEventListener('click', () => {
            const versionName = versionNameInput.value.trim();
            if (versionName) {
                saveCurrentVersion(versionName);
                closeSaveVersionDialog();
            } else {
                showToast('请输入版本名称', 2000);
            }
        });
        
        // 添加按Enter键确认的支持
        versionNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmSaveVersion.click();
            } else if (e.key === 'Escape') {
                closeSaveVersionDialog();
            }
        });
    }
    
    // 点击对话框背景关闭
    if (saveVersionDialog) {
        saveVersionDialog.addEventListener('click', (e) => {
            if (e.target === saveVersionDialog) {
                closeSaveVersionDialog();
            }
        });
    }
    
    // 添加键盘快捷键功能
    userInput.addEventListener('keydown', (e) => {
        // 只有按下Ctrl+Enter或Command+Enter才发送消息
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // 阻止默认行为
            if (!sendBtn.disabled) {
                sendBtn.click(); // 触发发送按钮点击
            }
        }
        // 所有其他情况的Enter键都正常处理（包括普通Enter和Shift+Enter）
    });

    // 发送消息事件
    sendBtn.addEventListener('click', async () => {
        const input = userInput.value.trim();
        if (!input) return;

        // 立即更新最后用户输入显示
        updateLastUserInput(input);

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
            
            // 显示Toast通知
            showToast('SVG图表已开始下载');
            
            // 清理对象URL
            setTimeout(() => {
                URL.revokeObjectURL(svgUrl);
            }, 100);
        } catch (err) {
            console.error('下载SVG失败：', err);
            showToast('下载SVG失败：' + err.message, 3000);
        }
    });
    
    // 复制最后用户输入的按钮事件
    if (copyLastInputBtn) {
        copyLastInputBtn.addEventListener('click', () => {
            const lastUserInput = document.getElementById('lastUserInput');
            const textToCopy = lastUserInput.dataset.fullText || lastUserInput.textContent;
            
            if (!textToCopy) return;
            
            // 复制到剪贴板
            navigator.clipboard.writeText(textToCopy).then(() => {
                // 显示Toast通知
                showToast('用户输入已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败：', err);
                showToast('复制失败：' + err.message, 3000);
            });
        });
    }

    // 初始添加编辑器事件监听器
    addEditorEventListener(quill);
    
    // 点击抽屉背景关闭
    settingsDrawer.addEventListener('click', (e) => {
        if (e.target === settingsDrawer) {
            closeSettingsDrawer();
        }
    });
    
    versionsDrawer.addEventListener('click', (e) => {
        if (e.target === versionsDrawer) {
            closeVersionsDrawer();
        }
    });
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
            content: '你是一个专业的Mermaid图表生成助手。你的任务是将用户的中文描述转化为有效的Mermaid语法图表代码。\n\n请注意以下要点：\n\n1. **图表类型选择**：\n   - 根据用户的需求智能选择最合适的图表类型（流程图、时序图、类图、状态图等）\n   - 如果用户已提供了Mermaid代码或指定了图表类型，请保持该类型不变，除非用户明确要求更改\n\n2. **语法规范**：\n   - 节点ID必须使用英文字母、数字和下划线，不含空格和特殊字符\n   - 连接关系必须使用英文符号和标识符\n   - 节点文本中使用中文括号"（）"而非英文括号"()"\n   - 避免在节点文本中使用特殊字符如: [],(),{},&,#等，用中文对应符号替代\n\n3. **代码质量**：\n   - 确保所有引号、括号配对完整\n   - 排版清晰，注意节点间距和布局美观\n   - 添加适当的注释帮助理解复杂图表\n\n请仅返回被```mermaid和```包裹的代码，不要返回其他解释或内容。'
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
            
            // 顶部用户输入显示设置为系统使用说明
            updateLastUserInput('系统使用说明');
            
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

// 加载图表列表到UI
function loadConversations() {
    const titleList = document.getElementById('titleList');
    const conversations = getConversations();
    const activeId = localStorage.getItem('activeConversationId');
    
    // 清空列表
    titleList.innerHTML = '';
    
    // 如果没有对话，创建示例图表对话
    if (conversations.length === 0) {
        createExampleConversations();
        return; // 会通过createExampleConversations重新调用loadConversations
    }
    
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
    
    // 获取最后一条用户消息并显示
    const userMessages = conversation.messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        updateLastUserInput(lastUserMessage.content);
    } else {
        // 如果没有用户消息，清空显示
        updateLastUserInput('');
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
        showToast('没有活跃的对话', 3000);
        return;
    }
    
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
        showToast('找不到当前对话', 3000);
        return;
    }
    
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) return;
    
    const mermaidCode = quill.getText().trim();
    if (!mermaidCode) {
        showToast('当前没有可保存的图表代码', 3000);
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
    
    showToast(`已保存版本: ${versionName}`);
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

// 更新最后用户输入显示
function updateLastUserInput(text) {
    const lastUserInput = document.getElementById('lastUserInput');
    if (!lastUserInput) return;
    
    if (!text) {
        lastUserInput.textContent = '';
        lastUserInput.dataset.fullText = '';
        return;
    }
    
    // 显示用户输入文本（自动截断）
    lastUserInput.textContent = text;
    
    // 保存完整文本用于复制
    lastUserInput.dataset.fullText = text;
}

// 显示Toast通知
function showToast(message = '已复制到剪贴板', duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    // 设置消息
    if (message) {
        toast.textContent = message;
    }
    
    // 显示Toast
    toast.classList.remove('invisible', 'opacity-0');
    toast.classList.add('opacity-100');
    
    // 设置自动隐藏
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        
        // 等待淡出动画完成后隐藏
        setTimeout(() => {
            toast.classList.add('invisible');
        }, 300);
    }, duration);
}

// 打开设置抽屉函数
function openSettingsDrawer() {
    if (!settingsDrawer) return;
    
    // 显示背景
    settingsDrawer.classList.remove('hidden');
    // 等一帧以确保过渡效果正常
    requestAnimationFrame(() => {
        // 滑入抽屉
        const drawerContent = settingsDrawer.querySelector('div');
        if (drawerContent) {
            drawerContent.classList.remove('translate-x-full');
        }
    });
}

// 关闭设置抽屉函数
function closeSettingsDrawer() {
    if (!settingsDrawer) return;
    
    // 滑出抽屉
    const drawerContent = settingsDrawer.querySelector('div');
    if (drawerContent) {
        drawerContent.classList.add('translate-x-full');
        // 等待过渡完成后隐藏背景
        setTimeout(() => {
            settingsDrawer.classList.add('hidden');
        }, 300);
    } else {
        settingsDrawer.classList.add('hidden');
    }
}

// 打开保存版本对话框
function openSaveVersionDialog() {
    const saveVersionDialog = document.getElementById('saveVersionDialog');
    const versionNameInput = document.getElementById('versionNameInput');
    
    if (!saveVersionDialog || !versionNameInput) {
        // 如果对话框元素不存在，回退到原来的prompt方法
        const versionName = prompt('请输入此版本的名称：', '版本 ' + new Date().toLocaleString());
        if (versionName) {
            saveCurrentVersion(versionName);
        }
        return;
    }
    
    // 设置默认版本名称
    versionNameInput.value = '版本 ' + new Date().toLocaleString();
    
    // 重置对话框状态
    const dialogContent = saveVersionDialog.querySelector('div');
    if (dialogContent) {
        dialogContent.classList.add('scale-95', 'opacity-0');
        dialogContent.classList.remove('scale-100', 'opacity-100');
    }
    
    // 显示对话框背景
    saveVersionDialog.classList.remove('hidden');
    saveVersionDialog.classList.remove('bg-opacity-50');
    saveVersionDialog.classList.add('bg-opacity-0');
    
    // 等一帧以确保过渡效果正常
    requestAnimationFrame(() => {
        // 显示对话框内容
        saveVersionDialog.classList.add('bg-black', 'bg-opacity-50');
        saveVersionDialog.classList.remove('bg-opacity-0');
        
        if (dialogContent) {
            dialogContent.classList.remove('scale-95', 'opacity-0');
            dialogContent.classList.add('scale-100', 'opacity-100');
        }
        
        // 聚焦输入框
        setTimeout(() => {
            versionNameInput.focus();
            versionNameInput.select();
        }, 100);
    });
}

// 关闭保存版本对话框
function closeSaveVersionDialog() {
    const saveVersionDialog = document.getElementById('saveVersionDialog');
    if (!saveVersionDialog) return;
    
    // 缩小并淡出对话框
    const dialogContent = saveVersionDialog.querySelector('div');
    if (dialogContent) {
        dialogContent.classList.remove('scale-100', 'opacity-100');
        dialogContent.classList.add('scale-95', 'opacity-0');
    }
    
    // 淡出背景
    saveVersionDialog.classList.remove('bg-opacity-50');
    saveVersionDialog.classList.add('bg-opacity-0');
    
    // 等待过渡完成后隐藏
    setTimeout(() => {
        saveVersionDialog.classList.add('hidden');
    }, 300);
}

// 显示示例图表菜单 - 修改为只显示卡片界面，不直接加载示例
function displayExamples() {
    // 确保至少有一个对话
    const conversations = getConversations();
    if (conversations.length === 0) {
        createExampleConversations();
        return;
    }
    
    const preview = document.getElementById('preview');
    const examples = loadExamples();
    
    // 创建示例选择界面
    let examplesHtml = `
    <div class="examples-container p-4">
        <h2 class="text-xl font-bold mb-4">选择一个示例图表</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    `;
    
    // 添加每个示例的卡片
    Object.keys(examples).forEach(key => {
        const example = examples[key];
        examplesHtml += `
        <div class="example-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" data-type="${key}">
            <div class="p-3 bg-gray-50 border-b">
                <h3 class="font-medium">${example.name}</h3>
            </div>
            <div class="p-3 text-sm text-gray-600">
                点击加载 ${key} 类型的示例
            </div>
        </div>
        `;
    });
    
    examplesHtml += `
        </div>
    </div>
    `;
    
    // 显示示例选择界面
    preview.innerHTML = examplesHtml;
    
    // 为每个示例卡片添加点击事件
    document.querySelectorAll('.example-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-type');
            const example = examples[type];
            
            if (example) {
                // 更新编辑器内容
                const quill = Quill.find(document.getElementById('editor-container'));
                if (quill) {
                    // 临时移除事件监听器
                    quill.off('text-change');
                    
                    // 更新编辑器内容
                    quill.setText(example.code);
                    
                    // 更新预览
                    updateMermaidPreview(example.code);
                    
                    // 更新用户输入显示
                    updateLastUserInput(example.name);
                    
                    // 重新添加事件监听器
                    setTimeout(() => {
                        addEditorEventListener(quill);
                    }, 50);
                }
            }
        });
    });
}

// 创建示例图表对话
function createExampleConversations() {
    const examples = loadExamples();
    
    // 创建系统使用说明示例
    const tutorialId = Date.now().toString();
    const tutorialCode = `graph TD
    A[开始] --> B{是否有API Key?}
    B -->|是| C[发送请求到AI]
    B -->|否| D[显示设置页面]
    C --> E[更新预览]
    D --> F[保存API Key]
    F --> C
    E --> G[下载SVG]
    G --> H[结束]`;
    
    const tutorialConversation = {
        id: tutorialId,
        title: '系统使用说明',
        messages: [
            {
                role: 'user',
                content: '系统使用说明'
            },
            {
                role: 'assistant',
                content: '```mermaid\n' + tutorialCode + '\n```'
            }
        ],
        createdAt: new Date().toISOString(),
        versions: [{
            id: Date.now().toString() + '1',
            name: '系统使用说明',
            prompt: '系统使用说明',
            code: tutorialCode,
            createdAt: new Date().toISOString()
        }]
    };
    
    // 创建保存所有示例对话的数组
    const exampleConversations = [tutorialConversation];
    
    // 为每个示例创建对话
    Object.keys(examples).forEach((key, index) => {
        const example = examples[key];
        const exampleId = (Date.now() + index + 1).toString();
        
        const exampleConversation = {
            id: exampleId,
            title: example.name,
            messages: [
                {
                    role: 'user',
                    content: example.name
                },
                {
                    role: 'assistant',
                    content: '```mermaid\n' + example.code + '\n```'
                }
            ],
            createdAt: new Date(Date.now() - (index + 1) * 60000).toISOString(), // 错开创建时间
            versions: [{
                id: exampleId + 'v1',
                name: example.name,
                prompt: example.name,
                code: example.code,
                createdAt: new Date(Date.now() - (index + 1) * 60000).toISOString()
            }]
        };
        
        exampleConversations.push(exampleConversation);
    });
    
    // 保存示例对话到localStorage
    localStorage.setItem('conversations', JSON.stringify(exampleConversations));
    
    // 设置系统使用说明为活跃对话
    localStorage.setItem('activeConversationId', tutorialId);
    
    // 重新加载对话列表
    loadConversations();
    
    // 加载系统使用说明对话内容
    loadConversation(tutorialId);
}

// 加载示例图表
function loadExamples() {
    // 示例图表集合
    const examples = {
        flowchart: {
            name: "科研项目流程图",
            code: `graph TD
    A[开始研究] --> B{文献综述}
    B -->|发现研究空白| C[提出研究问题]
    B -->|已有相似研究| D[寻找创新点]
    C --> E[设计实验方案]
    D --> E
    E --> F[准备实验材料]
    F --> G[执行实验]
    G --> H{数据分析}
    H -->|结果显著| I[撰写论文]
    H -->|结果不显著| J[修改实验方案]
    J --> F
    I --> K[投稿期刊]
    K --> L{审稿结果}
    L -->|接收| M[论文发表]
    L -->|修改后接收| N[根据意见修改]
    L -->|拒绝| O[投递其他期刊]
    N --> K
    O --> K
    M --> P[结束]`
        },
        sequenceDiagram: {
            name: "会议组织时序图",
            code: `sequenceDiagram
    participant 组织者
    participant 与会者
    participant 技术支持
    participant 场地
    
    组织者->>组织者: 确定会议主题与日期
    组织者->>场地: 预订会议室
    场地-->>组织者: 确认预订
    组织者->>与会者: 发送会议邀请
    与会者-->>组织者: 确认参加
    
    组织者->>技术支持: 申请设备支持
    技术支持-->>组织者: 确认支持
    
    Note right of 组织者: 会议准备阶段
    
    组织者->>与会者: 发送会议议程
    组织者->>组织者: 准备会议材料
    
    Note right of 组织者: 会议当天
    
    技术支持->>场地: 设置设备
    技术支持-->>组织者: 设备就绪
    与会者->>场地: 到达会议室
    组织者->>与会者: 开始会议
    
    组织者->>与会者: 会议总结
    组织者->>与会者: 发送会议记录
    与会者-->>组织者: 反馈意见`
        },
        classDiagram: {
            name: "研究数据结构类图",
            code: `classDiagram
    class 研究项目 {
        +String 项目名称
        +Date 开始日期
        +Date 结束日期
        +Float 经费预算
        +获取进度()
        +计算剩余经费()
    }
    
    class 研究人员 {
        +String 姓名
        +String 职称
        +String 专业领域
        +添加发表论文()
        +计算H指数()
    }
    
    class 实验数据 {
        +Date 采集日期
        +String 实验条件
        +Float[] 原始数据
        +分析数据()
        +导出图表()
    }
    
    class 论文 {
        +String 标题
        +String[] 作者列表
        +String 期刊名称
        +Date 发表日期
        +获取引用次数()
    }
    
    研究项目 "1" *-- "多" 研究人员 : 包含
    研究项目 "1" *-- "多" 实验数据 : 产生
    研究人员 "多" -- "多" 论文 : 发表
    实验数据 "多" -- "多" 论文 : 支持`
        },
        animalClass: {
            name: "动物类层次结构",
            code: `classDiagram
    class 动物 {
        +String 名称
        +int 年龄
        +float 体重
        +String 栖息地
        +进食()
        +移动()
        +休息()
        +繁殖()
    }
    
    class 哺乳动物 {
        +float 体温
        +int 妊娠期
        +哺乳()
        +保持体温()
    }
    
    class 鸟类 {
        +float 翼展
        +String 羽毛颜色
        +飞行()
        +筑巢()
        +鸣叫()
    }
    
    class 爬行动物 {
        +bool 是否有鳞片
        +bool 冷血
        +蜕皮()
        +晒太阳()
    }
    
    class 猫科动物 {
        -int 爪子数量
        +bool 夜视能力
        +捕猎()
        +攀爬()
    }
    
    class 犬科动物 {
        +int 嗅觉灵敏度
        +String 社会结构
        +嗅探()
        +吠叫()
    }
    
    动物 <|-- 哺乳动物
    动物 <|-- 鸟类
    动物 <|-- 爬行动物
    哺乳动物 <|-- 猫科动物
    哺乳动物 <|-- 犬科动物
    
    猫科动物 : +示例：狮子、老虎、家猫
    犬科动物 : +示例：狼、狐狸、家犬`
        },
        pie: {
            name: "研究经费分配饼图",
            code: `pie title 2023年度科研项目经费分配
    "设备购置" : 45.2
    "人员工资" : 30.0
    "材料费" : 15.5
    "会议差旅" : 5.0
    "出版费" : 3.0
    "其他" : 1.3`
        },
        radar: {
            name: "通义千问发展时间线",
            code: `timeline
    title 通义千问(Qwen)发展时间线
    section 2023年
      2023年9月 : Qwen
    section 2024年上半年
      2024年2月 : Qwen1.5
      2024年3月 : Qwen1.5-MoE
      2024年4月 : Qwen1.5-110B
      2024年5月 : Qwen-Max
      2024年6月 : Qwen2
    section 2024年下半年
      2024年8月 : Qwen2-VL/Audio/Math
      2024年9月 : Qwen2.5
      2024年11月 : QwQ
    section 2025年
      2025年3月 : Qwen2.5-Omni
      2025年4月 : Qwen3`
        }
    };

    return examples;
} 