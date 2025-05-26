// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 设置页面背景色为浅灰色
    document.body.style.backgroundColor = '#f8f8f8';
    
    // 添加修复状态标志
    window.isFixingMermaid = false;
    // 添加Mermaid初始化标志
    window.isMermaidInitialized = false;
    
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
    
    // 在Mermaid初始化后设置标志
    setTimeout(() => {
        window.isMermaidInitialized = true;
        console.log('Mermaid初始化完成');
    }, 200);

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

    // 延迟初始化，确保Mermaid库已加载
    setTimeout(() => {
        // 检查并确保有示例对话
        checkAndResetConversations();
        
        // 加载对话历史
        loadConversations();
        
        // 获取活跃的对话ID
        const activeId = localStorage.getItem('activeConversationId');
        if (activeId) {
            // 如果有活跃的对话，延迟加载该对话的最后一个图表和最后一条用户消息
            setTimeout(() => {
                const conversation = loadConversation(activeId);
                
                // 确保加载最后一条用户消息到顶部显示区
                if (conversation && conversation.messages && conversation.messages.length > 0) {
                    const userMessages = conversation.messages.filter(msg => msg.role === 'user');
                    if (userMessages.length > 0) {
                        const lastUserMessage = userMessages[userMessages.length - 1];
                        updateLastUserInput(lastUserMessage.content);
                    }
                }
            }, 300);
        }
    }, 500);

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
    // 添加重置应用按钮
    const resetAppBtn = document.getElementById('resetAppBtn');
    
    // 发送按钮
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    
    // 用户回复区域
    const lastUserInput = document.getElementById('lastUserInput');
    const copyLastInputBtn = document.getElementById('copyLastInputBtn');

    // SVG下载按钮
    const copySvgBtn = document.getElementById('copySvgBtn');
    
    // 添加PNG下载按钮
    const copyPngBtn = document.getElementById('copyPngBtn');
    
    // 版本抽屉相关
    const versionsDrawer = document.getElementById('versionsDrawer');
    const closeVersions = document.getElementById('closeVersions');
    const toggleVersionsBtn = document.getElementById('toggleVersionsBtn');

    // 复制代码和打开ProcessOn按钮
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const openProcessOnBtn = document.getElementById('openProcessOnBtn');

    // 设置抽屉事件
    settingsBtn.addEventListener('click', openSettingsDrawer);
    closeSettings.addEventListener('click', closeSettingsDrawer);

    saveSettings.addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value.trim();
        localStorage.setItem('qwenApiKey', apiKey);
        closeSettingsDrawer();
        showToast('设置已保存');
    });
    
    // 添加重置应用按钮事件
    if (resetAppBtn) {
        resetAppBtn.addEventListener('click', () => {
            if (confirm('确定要重置应用吗？这将清除所有对话和设置，恢复到初始状态。')) {
                // 保存API Key
                const apiKey = localStorage.getItem('qwenApiKey');
                
                // 清除所有localStorage
                localStorage.clear();
                
                // 恢复API Key
                if (apiKey) {
                    localStorage.setItem('qwenApiKey', apiKey);
                }
                
                // 重置已查看示例标记
                localStorage.removeItem('hasSeenExamples');
                
                // 创建新的示例对话
                createExampleConversations();
                
                // 关闭设置抽屉
                closeSettingsDrawer();
                
                // 显示提示
                showToast('应用已重置', 3000);
            }
        });
    }
    
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
            
            // 获取对话
            const conversation = getConversation(activeConversationId);
            if (conversation) {
                // 添加时间戳
                const currentTime = new Date().toISOString();
                
                // 检查最后一条消息是否已经是相同内容的用户消息
                let shouldAddUserMessage = true;
                if (conversation.messages.length > 0) {
                    const lastMsg = conversation.messages[conversation.messages.length - 1];
                    if (lastMsg.role === 'user' && lastMsg.content === input) {
                        // 已经有相同内容的用户消息，不需要再添加
                        shouldAddUserMessage = false;
                        console.log('检测到重复的用户消息，跳过添加');
                    }
                }
                
                // 检查是否在旧版本上发送新消息
                const isOnHistoricalVersion = !!conversation.currentVersionId;
                
                // 只有在需要添加时才添加用户消息
                if (shouldAddUserMessage) {
                    // 如果是在历史版本上发送新消息，添加提示日志
                    if (isOnHistoricalVersion) {
                        console.log(`在历史版本(${conversation.currentVersionId})上发送新消息，将修剪历史记录`);
                    }
                    
                    conversation.messages.push({
                        role: 'user',
                        content: input,
                        timestamp: currentTime
                    });
                    
                    // 保存用户消息
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
                        // 检查是否有重复的AI响应，确保不会添加重复消息
                        const lastUserMsgIndex = findLastIndexOfRole(conversation.messages, 'user');
                        let shouldAddResponse = true;
                        
                        if (lastUserMsgIndex !== -1) {
                            // 检查最后一个用户消息后面是否已经有助手响应
                            if (lastUserMsgIndex + 1 < conversation.messages.length && 
                                conversation.messages[lastUserMsgIndex + 1].role === 'assistant') {
                                // 已经有响应，更新而不是添加
                                conversation.messages[lastUserMsgIndex + 1] = {
                                    role: 'assistant',
                                    content: result,
                                    timestamp: new Date().toISOString()
                                };
                                shouldAddResponse = false;
                            }
                        }
                        
                        // 如果需要添加新响应
                        if (shouldAddResponse) {
                            conversation.messages.push({
                                role: 'assistant',
                                content: result,
                                timestamp: new Date().toISOString()
                            });
                        }
                        
                        // 将当前响应自动添加为新版本
                        const versionName = ` ${input.substring(0, 20)}${input.length > 20 ? '...' : ''}`;
                        const newVersion = addVersion(conversation, versionName, input, mermaidCode);
                        
                        // 将新版本设置为当前版本
                        if (newVersion) {
                            conversation.currentVersionId = newVersion.id;
                        }
                        
                        // 保存回对话历史（由于已经触发过历史修剪，这里不再重复修剪）
                        updateConversation(activeConversationId, conversation, false);
                        
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
    
    // 下载PNG按钮事件
    if (copyPngBtn) {
        copyPngBtn.addEventListener('click', () => {
            console.log('PNG下载按钮被点击');
            const svgElement = document.querySelector('#preview svg');
            console.log('获取到的SVG元素:', svgElement);
            if (!svgElement) {
                console.error('找不到SVG元素');
                alert('没有可供下载的图表');
                return;
            }
            
            console.log('调用showPngSizeDialog');
            // 显示尺寸输入对话框
            showPngSizeDialog(svgElement);
        });
    }
    
    // 复制代码按钮事件
    copyCodeBtn.addEventListener('click', () => {
        const code = quill.getText().trim();
        if (!code) {
            showToast('没有可供复制的代码', 2000);
            return;
        }

        // 复制到剪贴板
        navigator.clipboard.writeText(code).then(() => {
            // 显示Toast通知
            showToast('Mermaid代码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败：', err);
            showToast('复制失败：' + err.message, 3000);
        });
    });
    
    // 打开ProcessOn按钮事件
    openProcessOnBtn.addEventListener('click', () => {
        const code = quill.getText().trim();
        if (!code) {
            showToast('没有可用的Mermaid代码', 2000);
            return;
        }

        // 打开ProcessOn网站
        const processOnUrl = 'https://www.processon.com/diagrams';
        window.open(processOnUrl, '_blank');
        
        // 显示提示
        showToast('已打开ProcessOn，请在新窗口中粘贴Mermaid代码', 3000);
        
        // 复制代码到剪贴板，方便用户粘贴
        navigator.clipboard.writeText(code).catch(err => {
            console.error('复制代码失败：', err);
        });
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
    
    // 添加全局键盘快捷键处理
    document.addEventListener('keydown', (e) => {
        // 处理 Ctrl+S 或 Cmd+S 快捷键
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault(); // 阻止默认的保存页面行为
            
            // 显示保存动画
            showSaveAnimation();
            
            // 触发手动保存逻辑
            const currentCode = quill.getText().trim();
            if (currentCode) {
                // 手动触发保存
                const activeConversationId = localStorage.getItem('activeConversationId');
                if (activeConversationId) {
                    const conversation = getConversation(activeConversationId);
                    if (conversation) {
                        // 创建或更新手动编辑版本
                        const versionName = `手动编辑`;
                        const savedVersion = addVersion(conversation, versionName, '手动编辑', currentCode);
                        
                        if (savedVersion) {
                            // 设置为当前版本
                            conversation.currentVersionId = savedVersion.id;
                            
                            // 保存对话
                            updateConversation(activeConversationId, conversation, false);
                            
                            // 更新版本列表
                            loadVersions();
                        }
                    }
                }
            }
        }
    });
    
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

// 修改addEditorEventListener函数，添加高亮功能
function addEditorEventListener(quill) {
    // 移除之前的监听器以防重复
    quill.off('text-change');
    
    // 设置元素高亮功能
    const highlightManager = setupElementHighlight(quill);
    
    // 添加防抖函数
    let saveTimeout = null;
    const debouncedSave = (text) => {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            // 自动保存到当前对话
            const activeConversationId = localStorage.getItem('activeConversationId');
            if (activeConversationId) {
                const conversation = getConversation(activeConversationId);
                if (conversation) {
                    // 创建或更新手动编辑版本
                    const versionName = `手动编辑`;
                    const savedVersion = addVersion(conversation, versionName, '手动编辑', text);
                    
                    if (savedVersion) {
                        // 设置为当前版本
                        conversation.currentVersionId = savedVersion.id;
                        
                        // 保存对话
                        updateConversation(activeConversationId, conversation, false);
                        
                        // 更新版本列表
                        loadVersions();
                        
                        // 显示保存成功提示
                        showToast('手动编辑已自动保存', 1500);
                        
                        console.log('自动保存成功');
                    }
                }
            }
        }, 1000); // 1秒后自动保存
    };
    
    // 添加新的监听器
    quill.on('text-change', (delta, oldDelta, source) => {
        const text = quill.getText().trim();
        if (text) {
            updateMermaidPreview(text);
            
            // 如果是用户输入（不是程序设置），则触发自动保存
            if (source === 'user') {
                debouncedSave(text);
            }
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
                //showToast('请求超时，已恢复输入状态', 3000);
            }
        }, 120000); // 2分钟超时
    }
}

// 发送请求到AI
async function sendToAI(userInput, currentMermaidCode) {
    const apiKey = localStorage.getItem('qwenApiKey');
    if (!apiKey) {
        throw new Error('请先在设置中配置API Key');
    }

    const currentTime = new Date().toISOString();
    const activeConversationId = localStorage.getItem('activeConversationId');
    const conversation = getConversation(activeConversationId);
    
    // 准备发送到AI的消息
    let messages = [];
    
    // 如果有现有对话，使用对话中的历史记录
    if (conversation && conversation.messages && conversation.messages.length > 0) {
        // 确保系统消息在第一位
        const systemMessage = conversation.messages.find(msg => msg.role === 'system');
        if (systemMessage) {
            messages.push(systemMessage);
            
            // 添加系统消息之后的所有历史消息（除了系统消息和最后一个AI响应）
            // 使用新数组避免直接修改原始消息
            const nonSystemMessages = conversation.messages
                .filter(msg => msg.role !== 'system')
                .slice(-20); // 保留最近20条非系统消息
            
            // 检查最后一条消息是否是当前要发送的用户消息
            let hasCurrentUserMessage = false;
            if (nonSystemMessages.length > 0) {
                const lastMsg = nonSystemMessages[nonSystemMessages.length - 1];
                if (lastMsg.role === 'user' && lastMsg.content === userInput) {
                    hasCurrentUserMessage = true;
                }
            }
            
            // 移除最后一条AI消息，因为我们将使用当前编辑器中的代码
            const lastAIMessageIndex = findLastIndexOfRole(nonSystemMessages, 'assistant');
            if (lastAIMessageIndex !== -1) {
                nonSystemMessages.splice(lastAIMessageIndex, 1);
            }
            
            // 添加历史消息
            messages = messages.concat(nonSystemMessages);
            
            // 添加当前编辑器中的Mermaid代码作为最后一条AI消息
            if (currentMermaidCode) {
                messages.push({
                    role: 'assistant',
                    content: '```mermaid\n' + currentMermaidCode + '\n```',
                    timestamp: currentTime
                });
            }
            
            // 只有在历史消息中没有当前用户消息时才添加
            if (!hasCurrentUserMessage) {
                // 添加当前用户输入
                messages.push({
                    role: 'user',
                    content: userInput,
                    timestamp: currentTime
                });
            }
        } else {
            // 如果没有系统消息，添加默认系统消息
            messages.push({
                role: 'system',
                content: '你是一个专业的Mermaid图表生成助手。你的任务是将用户的中文描述转化为有效的Mermaid语法图表代码，或修复现有Mermaid代码中的错误。\n\n请注意以下要点：\n\n1. **图表类型选择**：\n   - 根据用户的需求智能选择最合适的图表类型（流程图、时序图、类图、状态图等）\n   - 如果用户已提供了Mermaid代码或指定了图表类型，请保持该类型不变，除非用户明确要求更改\n\n2. **语法规范**：\n   - 节点ID必须使用英文字母、数字和下划线，不含空格和特殊字符\n   - 连接关系必须使用英文符号和标识符\n   - 节点文本中使用中文括号"（）"而非英文括号"()"\n   - 避免在节点文本中使用特殊字符如: [],(),{},&,#等，用中文对应符号替代\n\n3. **代码质量**：\n   - 确保所有引号、括号配对完整\n   - 排版清晰，注意节点间距和布局美观\n   - 添加适当的注释帮助理解复杂图表\n\n4. **错误修复**：\n   - 当遇到Mermaid解析错误时，请仔细分析错误信息和位置\n   - 常见错误包括：语法错误、括号不匹配、箭头方向错误、缺少必要元素\n   - 修复时确保保留原图表的逻辑和结构\n\n请仅返回被```mermaid和```包裹的代码，不要返回其他解释或内容。',
                timestamp: currentTime
            });
            
            // 添加历史消息，但不包括最后一个AI响应
            let historicalMessages = conversation.messages.slice(-20);
            
            // 移除最后一条AI消息，因为我们将使用当前编辑器中的代码
            const lastAIMessageIndex = findLastIndexOfRole(historicalMessages, 'assistant');
            if (lastAIMessageIndex !== -1) {
                historicalMessages.splice(lastAIMessageIndex, 1);
            }
            
            // 检查最后一条消息是否是当前要发送的用户消息
            let hasCurrentUserMessage = false;
            if (historicalMessages.length > 0) {
                const lastMsg = historicalMessages[historicalMessages.length - 1];
                if (lastMsg.role === 'user' && lastMsg.content === userInput) {
                    hasCurrentUserMessage = true;
                }
            }
            
            messages = messages.concat(historicalMessages);
            
            // 添加当前编辑器中的Mermaid代码作为最后一条AI消息
            if (currentMermaidCode) {
                messages.push({
                    role: 'assistant',
                    content: '```mermaid\n' + currentMermaidCode + '\n```',
                    timestamp: currentTime
                });
            }
            
            // 只有在历史消息中没有当前用户消息时才添加
            if (!hasCurrentUserMessage) {
                messages.push({
                    role: 'user',
                    content: userInput,
                    timestamp: currentTime
                });
            }
        }
    } else {
        // 如果没有现有对话，创建新的消息列表
        messages = [
            {
                role: 'system',
                content: '你是一个专业的Mermaid图表生成助手。你的任务是将用户的中文描述转化为有效的Mermaid语法图表代码，或修复现有Mermaid代码中的错误。\n\n请注意以下要点：\n\n1. **图表类型选择**：\n   - 根据用户的需求智能选择最合适的图表类型（流程图、时序图、类图、状态图等）\n   - 如果用户已提供了Mermaid代码或指定了图表类型，请保持该类型不变，除非用户明确要求更改\n\n2. **语法规范**：\n   - 节点ID必须使用英文字母、数字和下划线，不含空格和特殊字符\n   - 连接关系必须使用英文符号和标识符\n   - 节点文本中使用中文括号"（）"而非英文括号"()"\n   - 避免在节点文本中使用特殊字符如: [],(),{},&,#等，用中文对应符号替代\n\n3. **代码质量**：\n   - 确保所有引号、括号配对完整\n   - 排版清晰，注意节点间距和布局美观\n   - 添加适当的注释帮助理解复杂图表\n\n4. **错误修复**：\n   - 当遇到Mermaid解析错误时，请仔细分析错误信息和位置\n   - 常见错误包括：语法错误、括号不匹配、箭头方向错误、缺少必要元素\n   - 修复时确保保留原图表的逻辑和结构\n\n请仅返回被```mermaid和```包裹的代码，不要返回其他解释或内容。',
                timestamp: currentTime
            }
        ];
        
        // 如果已有Mermaid代码，将其添加到消息中作为助手的前一个响应
        if (currentMermaidCode) {
            messages.push({
                role: 'assistant',
                content: '```mermaid\n' + currentMermaidCode + '\n```',
                timestamp: currentTime
            });
        }
        
        // 添加当前用户输入
        messages.push({
            role: 'user',
            content: userInput,
            timestamp: currentTime
        });
    }

    // 确保发送前检查并去除重复的消息
    messages = deduplicateMessages(messages);

    // 使用代理服务器发送请求
    const response = await fetch('/proxy/qwen', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            api_key: apiKey,
            model: 'qwen-plus-latest',
            messages: messages
        })
    });

    // 检查响应
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API请求失败: ${errorData.message || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    // 适配通义千问 API 响应格式
    const content = data.output && data.output.choices && data.output.choices[0] && 
                    data.output.choices[0].message && data.output.choices[0].message.content || '';
    
    // 输出调试信息
    console.log('发送到API的消息历史:', JSON.stringify(messages));
    
    return content;
}

// 去除重复消息
function deduplicateMessages(messages) {
    // 创建一个新数组存储去重后的消息
    const dedupedMessages = [];
    const seenContent = new Set();
    
    // 确保系统消息在最前面
    const systemMessages = messages.filter(msg => msg.role === 'system');
    if (systemMessages.length > 0) {
        dedupedMessages.push(systemMessages[0]); // 只保留第一条系统消息
        seenContent.add(`system:${systemMessages[0].content}`);
    }
    
    // 处理非系统消息
    for (const msg of messages) {
        if (msg.role === 'system') continue; // 系统消息已处理
        
        // 创建消息的唯一标识
        const msgKey = `${msg.role}:${msg.content}`;
        
        // 如果这条消息没见过，添加到结果中
        if (!seenContent.has(msgKey)) {
            dedupedMessages.push(msg);
            seenContent.add(msgKey);
        }
    }
    
    return dedupedMessages;
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
    
    // 检查Mermaid是否初始化完成
    if (!window.isMermaidInitialized) {
        console.log('Mermaid尚未完成初始化，延迟渲染');
        previewDiv.innerHTML = `<div class="p-4 text-gray-500">正在等待Mermaid初始化...</div>`;
        
        // 延迟重试
        setTimeout(() => {
            updateMermaidPreview(code, retryCount);
        }, 300);
        return;
    }
    
    previewDiv.innerHTML = `<div class="mermaid">${code}</div>`;
    
    try {
        // 添加错误处理回调
        mermaid.parseError = function(err, hash) {
            console.error('Mermaid解析错误:', err, hash);
            // 保存到window对象以便于访问
            window.mermaidLastError = { err, hash };
            
            // 添加Toast通知，包含位置信息
            const locationInfo = hash && hash.loc ? `第${hash.loc.first_line || '?'}行` : '';
            const errorMsg = err.message || '未知错误';
            showToast(`Mermaid解析错误: ${errorMsg} ${locationInfo ? `(${locationInfo})` : ''}`, 5000);
            
            // 显示错误信息和询问用户是否重新生成
            showMermaidErrorDialog(code, { err, hash });
        };
        
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
        
        // 检查是否有解析错误的详细信息
        const mermaidError = window.mermaidLastError || error;
        
        // 提取位置信息
        const locationInfo = mermaidError.hash && mermaidError.hash.loc ? 
            `第${mermaidError.hash.loc.first_line || '?'}行` : '';
        
        // 显示Toast通知，加入位置信息
        showToast(`Mermaid渲染错误: ${error.message || '未知错误'} ${locationInfo ? `(${locationInfo})` : ''}`, 5000);
        
        // 显示错误信息和询问用户是否重新生成
        showMermaidErrorDialog(code, mermaidError);
    }
}

// 显示Mermaid错误对话框，询问用户是否重新生成
function showMermaidErrorDialog(code, error) {
    // 获取详细的错误信息
    let errorDetails;
    try {
        if (error instanceof Error) {
            errorDetails = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                details: error.str || error.hash || error.details || ''
            };
        } else {
            errorDetails = error;
        }
    } catch (e) {
        console.warn('提取错误详情失败:', e);
        errorDetails = { message: '未知Mermaid错误' };
    }

    // 显示错误信息在预览区域
    const previewDiv = document.getElementById('preview');
    const locationInfo = errorDetails.hash && errorDetails.hash.loc ? 
        `第${errorDetails.hash.loc.first_line || '?'}行` : '';
    
    previewDiv.innerHTML = `
        <div class="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">
            <div class="flex items-center mb-3">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <h3 class="font-bold text-lg">Mermaid图表渲染错误</h3>
            </div>
            <div class="mb-4">
                <p class="font-medium">错误信息：${errorDetails.message || '未知错误'}</p>
                ${locationInfo ? `<p class="text-sm mt-1">错误位置：${locationInfo}</p>` : ''}
                ${errorDetails.details ? `<p class="text-sm mt-1 text-gray-600">详细信息：${errorDetails.details}</p>` : ''}
            </div>
            <div class="flex space-x-3">
                <button id="regenerate-mermaid" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    请AI重新生成
                </button>
                <button id="ignore-error" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                    忽略错误
                </button>
                <button id="edit-manually" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                    手动修改
                </button>
            </div>
        </div>
    `;

    // 添加按钮事件监听器
    const regenerateBtn = document.getElementById('regenerate-mermaid');
    const ignoreBtn = document.getElementById('ignore-error');
    const editBtn = document.getElementById('edit-manually');

    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            requestMermaidFix(code, errorDetails);
        });
    }

    if (ignoreBtn) {
        ignoreBtn.addEventListener('click', () => {
            // 显示原始错误的代码，但不再尝试渲染
            previewDiv.innerHTML = `
                <div class="text-gray-500 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p class="mb-2">已忽略Mermaid渲染错误</p>
                    <p class="text-sm">您可以在编辑器中手动修改代码，或点击"请AI重新生成"按钮</p>
                </div>
            `;
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            // 聚焦到编辑器
            const quill = Quill.find(document.getElementById('editor-container'));
            if (quill) {
                quill.focus();
            }
            
            // 显示提示信息
            previewDiv.innerHTML = `
                <div class="text-blue-500 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <p class="mb-2">请在左侧编辑器中修改Mermaid代码</p>
                    <p class="text-sm">修改后预览将自动更新</p>
                </div>
            `;
            
            showToast('请在编辑器中手动修改代码', 3000);
        });
    }
}

// 请求AI修复Mermaid语法错误（修改为用户主动触发）
async function requestMermaidFix(code, error) {
    // 检查是否已经有修复请求在进行中
    if (window.isFixingMermaid) {
        console.log('已有修复请求在进行中，跳过重复请求');
        showToast('正在修复中，请稍候...', 2000);
        return;
    }

    const activeConversationId = localStorage.getItem('activeConversationId');
    if (!activeConversationId) {
        showToast('没有活跃的对话，无法请求修复', 3000);
        return;
    }

    // 获取详细的错误信息
    let errorDetails;
    try {
        if (error instanceof Error) {
            errorDetails = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                details: error.str || error.hash || error.details || ''
            };
        } else {
            errorDetails = error;
        }
    } catch (e) {
        console.warn('提取错误详情失败:', e);
        errorDetails = { message: '未知Mermaid错误' };
    }

    // 显示开始修复的Toast通知
    showToast(`正在请求AI修复Mermaid图表...`, 3000);

    // 创建修复请求消息，包含更详细的错误信息
    const fixRequest = `我的Mermaid图表代码有语法错误，请修复：
错误类型: ${errorDetails.name || '语法错误'}
错误信息: ${errorDetails.message || JSON.stringify(error)}
${errorDetails.details ? `错误详情: ${errorDetails.details}` : ''}
${errorDetails.stack ? `错误堆栈: ${errorDetails.stack.split('\n')[0]}` : ''}

当前代码:
\`\`\`mermaid
${code}
\`\`\`

请分析错误原因并修复代码。你的回复必须只包含修复后的完整Mermaid代码，不要包含任何解释或其他内容。`;

    // 获取当前对话
    const conversation = getConversation(activeConversationId);
    if (!conversation) {
        showToast('找不到当前对话', 3000);
        return;
    }

    // 设置修复状态为进行中
    window.isFixingMermaid = true;

    // 显示正在修复的提示
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = `<div class="text-blue-500 p-4">正在请求AI修复Mermaid语法错误，请稍候...</div>`;

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
            
            // 检查是否已有类似的修复请求，避免重复
            const lastUserContent = findLastUserFixRequest(conversation.messages, 'Mermaid图表代码有语法错误');
            
            // 创建当前时间戳
            const currentTime = new Date().toISOString();
            
            // 如果已存在修复请求，则删除之前的修复请求及其回复
            if (lastUserContent !== -1) {
                // 删除最后一次修复请求之后的所有消息（即之前的修复尝试）
                conversation.messages = conversation.messages.slice(0, lastUserContent);
            }
            
            // 添加AI修复响应到对话历史（确保始终保持system消息在最前面）
            const systemMessage = conversation.messages.find(msg => msg.role === 'system');
            const nonSystemMessages = conversation.messages.filter(msg => msg.role !== 'system');
            
            // 构建新的消息数组
            let newMessages = [];
            if (systemMessage) {
                newMessages.push(systemMessage);
            }
            
            // 添加其他旧消息
            newMessages = newMessages.concat(nonSystemMessages);
            
            // 添加新的修复请求和回复
            newMessages.push({
                role: 'user',
                content: fixRequest,
                timestamp: currentTime
            });
            
            newMessages.push({
                role: 'assistant',
                content: result,
                timestamp: currentTime
            });
            
            conversation.messages = newMessages;
            
            // 检查当前是否正在查看某个版本
            const isViewingVersion = !!conversation.currentVersionId;
            
            // 如果正在查看某个版本，则更新该版本的代码
            if (isViewingVersion) {
                const versionIndex = conversation.versions.findIndex(v => v.id === conversation.currentVersionId);
                if (versionIndex !== -1) {
                    // 更新版本中的代码
                    conversation.versions[versionIndex].code = fixedCode;
                    // 添加修复标记
                    if (!conversation.versions[versionIndex].name.includes('(已修复)')) {
                        conversation.versions[versionIndex].name += ' (已修复)';
                    }
                    // 记录修复时间
                    conversation.versions[versionIndex].fixedAt = currentTime;
                    console.log(`已更新版本 ${conversation.currentVersionId} 的代码`);
                }
            } else {
                // 如果不是查看特定版本，则取最后一个版本进行更新
                if (conversation.versions && conversation.versions.length > 0) {
                    const lastVersionIndex = conversation.versions.length - 1;
                    // 更新最后一个版本的代码
                    conversation.versions[lastVersionIndex].code = fixedCode;
                    // 添加修复标记
                    if (!conversation.versions[lastVersionIndex].name.includes('(已修复)')) {
                        conversation.versions[lastVersionIndex].name += ' (已修复)';
                    }
                    // 记录修复时间
                    conversation.versions[lastVersionIndex].fixedAt = currentTime;
                    console.log(`已更新最后版本的代码`);
                } else {
                    // 如果没有任何版本，创建一个新版本
                    const lastUserMessage = findLastUserMessage(conversation.messages);
                    const versionName = lastUserMessage ? 
                        `${lastUserMessage.substring(0, 20)}${lastUserMessage.length > 20 ? '...' : ''} (已修复)` : 
                        '自动修复版本';
                    
                    addVersion(conversation, versionName, lastUserMessage || '自动修复', fixedCode);
                    console.log(`已创建新的修复版本`);
                }
            }
            
            updateConversation(activeConversationId, conversation, false);
            
            // 刷新版本列表UI
            loadVersions();
            
            // 显示修复成功的Toast
            showToast(`Mermaid图表已修复并更新到版本历史`, 3000);
            
            // 尝试使用修复后的代码更新预览
            updateMermaidPreview(fixedCode);
            
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
        // 显示修复失败的Toast
        showToast(`修复失败: ${error.message}`, 4000);
        
        // 重新显示错误对话框
        showMermaidErrorDialog(code, error);
    } finally {
        // 恢复输入和按钮状态
        if (quill) {
            toggleInputState(true, quill);
        }
        
        // 重置修复状态
        window.isFixingMermaid = false;
    }
}

// 查找最后一次修复请求的索引
function findLastUserFixRequest(messages, searchText) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user' && messages[i].content.includes(searchText)) {
            return i;
        }
    }
    return -1;
}

// 查找最后一条用户消息的内容
function findLastUserMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user' && !messages[i].content.includes('Mermaid图表代码有语法错误')) {
            return messages[i].content;
        }
    }
    return null;
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
function updateConversation(id, updatedConversation, trimHistory = true) {
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
        
        // 检查是否需要修剪历史记录
        if (trimHistory) {
            // 如果有当前版本ID且添加了新消息，则需要修剪历史
            if (updatedConversation.currentVersionId && updatedConversation.messages.length > conversations[index].messages.length) {
                // 修剪版本历史 - 只保留当前加载的版本及更早的版本
                if (updatedConversation.versions && updatedConversation.versions.length > 0) {
                    const versionIndex = updatedConversation.versions.findIndex(v => v.id === updatedConversation.currentVersionId);
                    if (versionIndex !== -1) {
                        // 只保留当前版本及之前的版本
                        updatedConversation.versions = updatedConversation.versions.filter((v, idx) => idx <= versionIndex);
                        console.log(`已修剪版本历史，保留当前版本(${updatedConversation.currentVersionId})及之前的版本`);
                    }
                }
                
                // 只有在trimHistory为true时才清除currentVersionId标记
                if (trimHistory) {
                    delete updatedConversation.currentVersionId;
                }
            }
            
            // 限制消息历史长度，确保不超过80k
            updatedConversation = limitConversationSize(updatedConversation, 80000);
        }
        
        conversations[index] = updatedConversation;
        localStorage.setItem('conversations', JSON.stringify(conversations));
        
        // 刷新UI
        loadConversations();
    }
}

// 限制对话历史大小
function limitConversationSize(conversation, maxSize) {
    if (!conversation || !conversation.messages) return conversation;
    
    // 计算当前消息的总大小
    let totalSize = JSON.stringify(conversation.messages).length;
    
    // 如果小于最大大小，直接返回
    if (totalSize <= maxSize) return conversation;
    
    // 确定每种角色的重要消息
    const systemMessages = conversation.messages.filter(msg => msg.role === 'system');
    
    // 确保从正确的顺序找到用户的第一条消息
    // 在Mermaid Creator中，消息顺序通常是: 
    // [system, user, assistant, user, assistant, ...]
    let firstUserMessage = null;
    for (let i = 0; i < conversation.messages.length; i++) {
        if (conversation.messages[i].role === 'user') {
            firstUserMessage = conversation.messages[i];
            break;
        }
    }
    
    // 计算必须保留的消息大小
    const mustKeepMessages = [...systemMessages];
    if (firstUserMessage) {
        // 检查这条消息是否已包含在系统消息集合中
        if (!mustKeepMessages.includes(firstUserMessage)) {
            mustKeepMessages.push(firstUserMessage);
        }
    }
    
    const mustKeepSize = JSON.stringify(mustKeepMessages).length;
    
    // 如果必须保留的消息已经超过最大大小，则只保留这些消息
    if (mustKeepSize > maxSize) {
        // 如果连必须保留的消息都超出大小，那么至少保留系统消息和尽可能多的用户消息
        if (systemMessages.length > 0) {
            conversation.messages = [systemMessages[0]];
            if (firstUserMessage && JSON.stringify(conversation.messages).length + JSON.stringify(firstUserMessage).length <= maxSize) {
                conversation.messages.push(firstUserMessage);
            }
        } else if (firstUserMessage) {
            conversation.messages = [firstUserMessage];
        } else {
            // 如果没有系统消息和用户消息，保留第一条消息
            conversation.messages = conversation.messages.slice(0, 1);
        }
        return conversation;
    }
    
    // 获取非必须保留的消息，排除系统消息和第一条用户消息
    let otherMessages = conversation.messages.filter(msg => {
        // 排除系统消息
        if (msg.role === 'system') return false;
        
        // 排除第一条用户消息
        if (firstUserMessage && msg === firstUserMessage) return false;
        
        return true;
    });
    
    // 按时间戳降序排序（如果有时间戳），最新的在前面
    otherMessages.sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1; // 没时间戳的放后面
        if (!b.timestamp) return -1; // 没时间戳的放后面
        return new Date(b.timestamp) - new Date(a.timestamp); // 降序排列，最新的在前
    });
    
    // 计算还能添加多少消息
    let remainingSize = maxSize - mustKeepSize;
    let additionalMessages = [];
    
    // 从最新的消息开始，保留尽可能多的消息
    for (let i = 0; i < otherMessages.length; i++) {
        const msg = otherMessages[i];
        const msgSize = JSON.stringify(msg).length;
        
        // 如果添加这条消息后超过限制，就停止
        if (msgSize > remainingSize) break;
        
        additionalMessages.push(msg);
        remainingSize -= msgSize;
    }
    
    // 合并必须保留的消息和额外消息
    let newMessages = [...mustKeepMessages, ...additionalMessages];
    
    // 按原始消息顺序和对话逻辑重新排序
    newMessages.sort((a, b) => {
        // 系统消息总是在最前面
        if (a.role === 'system' && b.role !== 'system') return -1;
        if (a.role !== 'system' && b.role === 'system') return 1;
        
        // 按时间戳升序排列
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return -1; // 无时间戳的消息放在前面
        if (!b.timestamp) return 1; // 无时间戳的消息放在前面
        return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    conversation.messages = newMessages;
    return conversation;
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
    
    // 删除检查是否删除了所有对话的部分，避免自动创建示例
    
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
    
    // 如果没有对话，显示空状态提示并提供加载示例按钮
    if (conversations.length === 0) {
        titleList.innerHTML = `
            <div class="p-4 text-center text-gray-500">
                暂无对话，点击"新建对话"按钮开始
                <div class="mt-2">
                    <button id="loadExamplesBtn" class="text-blue-500 hover:underline">加载示例对话</button>
                </div>
            </div>
        `;
        
        // 添加加载示例按钮的事件监听
        setTimeout(() => {
            const loadExamplesBtn = document.getElementById('loadExamplesBtn');
            if (loadExamplesBtn) {
                loadExamplesBtn.addEventListener('click', () => {
                    createExampleConversations();
                });
            }
        }, 0);
        
        return;
    }
    
    // 按创建时间逆序排序
    conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 添加到列表
    conversations.forEach(conv => {
        const li = document.createElement('li');
        li.className = `title-item ${conv.id === activeId ? 'active' : ''}`;
        li.dataset.id = conv.id;
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
            // 删除确认逻辑
            deleteConversation(conv.id);
            showToast(`已删除对话 "${conv.title}"`, 2000);
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
    
    // 通过ID查找对应的标题元素并高亮（不再通过标题文本匹配）
    const titleElements = document.querySelectorAll('.title-item');
    for (let i = 0; i < titleElements.length; i++) {
        if (titleElements[i].dataset.id === id) {
            titleElements[i].classList.add('active');
            break;
        }
    }
    
    let mermaidCode = '';
    let shouldLoadCurrentVersion = false;
    
    // 优先检查是否有当前版本
    if (conversation.currentVersionId && conversation.versions) {
        const currentVersion = conversation.versions.find(v => v.id === conversation.currentVersionId);
        if (currentVersion) {
            mermaidCode = currentVersion.code;
            shouldLoadCurrentVersion = true;
            console.log('加载当前版本:', currentVersion.name);
        }
    }
    
    // 如果没有当前版本，则获取最后一条助手消息中的Mermaid代码
    if (!mermaidCode) {
        const assistantMessages = conversation.messages.filter(msg => msg.role === 'assistant');
        if (assistantMessages.length > 0) {
            const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
            mermaidCode = extractMermaidCode(lastAssistantMessage.content);
        }
    }
    
    if (mermaidCode) {
        // 更新编辑器
        const quill = Quill.find(document.getElementById('editor-container'));
        if (quill) {
            // 临时移除事件监听器
            quill.off('text-change');
            
            quill.setText(mermaidCode);
            
            // 延迟更新预览，确保Mermaid库已初始化完成
            const previewDiv = document.getElementById('preview');
            // 先清空预览区域，避免在Mermaid初始化前显示错误代码
            previewDiv.innerHTML = '<div class="p-4 text-gray-500">正在准备预览...</div>';
            
            // 延迟渲染，确保Mermaid库有足够时间初始化
            setTimeout(() => {
                // 更新预览
                updateMermaidPreview(mermaidCode);
            }, 300);
            
            // 重新添加事件监听器
            setTimeout(() => {
                addEditorEventListener(quill);
            }, 500);
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
    
    // 对于手动编辑，需要判断是否应该创建新版本还是覆盖现有版本
    if (prompt === '手动编辑') {
        const existingManualEditIndex = conversation.versions.findIndex(v => v.prompt.startsWith('手动编辑'));
        
        // 检查最后一个版本是否是手动编辑版本
        const lastVersion = conversation.versions.length > 0 ? conversation.versions[conversation.versions.length - 1] : null;
        const isLastVersionManualEdit = lastVersion && lastVersion.prompt.startsWith('手动编辑');
        
        // 如果最后一个版本是手动编辑，则覆盖它（连续手动编辑合并）
        if (isLastVersionManualEdit && existingManualEditIndex !== -1) {
            // 找到最后一个手动编辑版本的索引
            const lastManualEditIndex = conversation.versions.length - 1;
            
            // 覆盖最后一个手动编辑版本
            conversation.versions[lastManualEditIndex] = {
                ...conversation.versions[lastManualEditIndex],
                name: conversation.versions[lastManualEditIndex].name, // 保持原名称
                code: code,
                updatedAt: new Date().toISOString()
            };
            console.log('合并连续手动编辑到现有版本');
            return conversation.versions[lastManualEditIndex];
        }
        
        // 如果最后一个版本不是手动编辑（即有AI版本），则创建新的手动编辑版本
        if (!isLastVersionManualEdit) {
            const timestamp = new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            name = `手动编辑 ${timestamp}`;
            console.log('创建新的手动编辑版本（上一个版本是AI生成）');
        }
        
        // 如果没有任何版本，创建第一个手动编辑版本
        if (conversation.versions.length === 0) {
            name = `手动编辑`;
            console.log('创建第一个手动编辑版本');
        }
    }
    
    // 对于AI生成的版本，保持原有的重复检查
    if (prompt !== '手动编辑') {
        const hasExistingVersion = conversation.versions.some(
            v => v.code === code && v.prompt === prompt
        );
        
        if (hasExistingVersion) {
            console.log('版本已存在，跳过添加');
            return null;
        }
    }
    
    const now = new Date().toISOString();
    
    // 创建新版本
    const newVersion = {
        id: Date.now().toString(),
        name: name,
        prompt: prompt,
        code: code,
        createdAt: now,
        updatedAt: now
    };
    
    conversation.versions.push(newVersion);
    console.log('添加新版本:', name);
    return newVersion;
}

// 查找与提示词相关的消息索引
function findRelatedMessages(messages, prompt) {
    const indexes = [];
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === 'user' && messages[i].content === prompt) {
            indexes.push(i);
            // 如果下一条消息是助手回复，也加入相关消息
            if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                indexes.push(i + 1);
            }
        }
    }
    return indexes;
}

// 确保消息有时间戳
function ensureMessagesHaveTimestamp(messages, prompt, fallbackTime) {
    for (let i = 0; i < messages.length; i++) {
        // 为提示词相关的消息添加时间戳（如果没有）
        if (messages[i].role === 'user' && messages[i].content === prompt && !messages[i].timestamp) {
            messages[i].timestamp = fallbackTime;
        }
        // 为紧跟着的助手消息添加时间戳（如果没有）
        if (i > 0 && messages[i-1].role === 'user' && messages[i-1].content === prompt &&
            messages[i].role === 'assistant' && !messages[i].timestamp) {
            messages[i].timestamp = fallbackTime;
        }
    }
}

// 查找特定角色的最后一个消息索引
function findLastIndexOfRole(messages, role) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === role) {
            return i;
        }
    }
    return -1;
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
    
    // 查找最新的手动编辑版本（可能有多个，取最新的）
    const manualEditVersions = versions.filter(v => v.prompt.startsWith('手动编辑'));
    const latestManualEditVersion = manualEditVersions.length > 0 ? manualEditVersions[0] : null;
    const currentVersionId = conversation.currentVersionId;
    
    versions.forEach(version => {
        const versionItem = document.createElement('div');
        
        // 判断是否为当前活动版本
        const isActive = version.id === currentVersionId || 
                        (latestManualEditVersion && version.id === latestManualEditVersion.id && !currentVersionId);
        
        versionItem.className = `version-item border-b border-gray-200 p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
            isActive ? 'bg-blue-50 border-blue-200' : ''
        }`;
        
        const formattedDate = new Date(version.createdAt).toLocaleString();
        
        versionItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium ${isActive ? 'text-blue-600' : ''}">${version.name}</span>
                <span class="text-xs text-gray-500">${formattedDate}</span>
            </div>
            <div class="text-sm text-gray-600 truncate mt-1">${version.prompt}</div>
            ${isActive ? '<div class="text-xs text-blue-500 mt-1">● 当前版本</div>' : ''}
        `;
        
        // 点击加载该版本
        versionItem.addEventListener('click', () => {
            loadVersion(version);
        });
        
        versionsList.appendChild(versionItem);
    });
    
    // 如果有手动编辑版本且没有设置当前版本，自动加载手动编辑版本
    if (latestManualEditVersion && !currentVersionId) {
        setTimeout(() => {
            loadVersion(latestManualEditVersion);
        }, 100);
    }
}

// 加载特定版本
function loadVersion(version) {
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) return;
    
    // 临时移除事件监听器
    quill.off('text-change');
    
    // 更新编辑器内容
    quill.setText(version.code);
    
    // 延迟更新预览，确保Mermaid库已初始化完成
    const previewDiv = document.getElementById('preview');
    // 先清空预览区域，避免在Mermaid初始化前显示错误代码
    previewDiv.innerHTML = '<div class="p-4 text-gray-500">正在准备预览...</div>';
    
    // 延迟渲染，确保Mermaid库有足够时间初始化
    setTimeout(() => {
        // 更新预览
        updateMermaidPreview(version.code);
    }, 300);
    
    // 更新最后用户输入显示
    updateLastUserInput(version.prompt);
    
    // 重新添加事件监听器
    setTimeout(() => {
        addEditorEventListener(quill);
    }, 500);
    
    // 标记当前加载的版本，而不是直接删除该版本之后的历史
    const activeConversationId = localStorage.getItem('activeConversationId');
    if (activeConversationId) {
        const conversation = getConversation(activeConversationId);
        if (conversation) {
            // 记录当前加载的版本ID，但不删除任何历史
            conversation.currentVersionId = version.id;
            
            // 保存回localStorage（只更新标记，不删除历史）
            updateConversation(activeConversationId, conversation, false);
        }
    }
    
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
    
    // 根据消息长度决定持续时间
    if (message.length > 50 && duration < 4000) {
        duration = 4000; // 对于长消息，增加显示时间
    }
    
    // 检查是否为错误消息
    const isError = message.toLowerCase().includes('错误') || 
                   message.toLowerCase().includes('失败') || 
                   message.toLowerCase().includes('error');
    
    // 设置消息
    if (message) {
        toast.textContent = message;
        
        // 根据消息类型设置不同的样式
        if (isError) {
            toast.classList.add('error-toast');
        } else {
            toast.classList.remove('error-toast');
        }
        
        // 调整最大宽度，使长消息能自动换行
        if (message.length > 40) {
            toast.style.maxWidth = '80%';
        } else {
            toast.style.maxWidth = '300px';
        }
    }
    
    // 显示Toast
    toast.classList.remove('invisible', 'opacity-0');
    toast.classList.add('opacity-100');
    
    // 清除之前的定时器
    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
    }
    
    // 设置自动隐藏
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        
        // 等待淡出动画完成后隐藏
        setTimeout(() => {
            toast.classList.add('invisible');
            // 重置样式
            toast.classList.remove('error-toast');
            toast.style.maxWidth = '';
        }, 300);
    }, duration);
}

// 显示保存动画
function showSaveAnimation() {
    // 创建保存动画元素
    let saveIndicator = document.getElementById('save-indicator');
    
    // 如果不存在，创建保存指示器
    if (!saveIndicator) {
        saveIndicator = document.createElement('div');
        saveIndicator.id = 'save-indicator';
        saveIndicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transform translate-y-full opacity-0 transition-all duration-300 z-50';
        saveIndicator.innerHTML = `
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>保存中...</span>
        `;
        document.body.appendChild(saveIndicator);
    }
    
    // 显示保存指示器
    saveIndicator.classList.remove('translate-y-full', 'opacity-0');
    saveIndicator.classList.add('translate-y-0', 'opacity-100');
    
    // 更新为保存中状态
    saveIndicator.innerHTML = `
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>保存中...</span>
    `;
    saveIndicator.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transform translate-y-0 opacity-100 transition-all duration-300 z-50';
    
    // 500ms后显示保存成功
    setTimeout(() => {
        saveIndicator.innerHTML = `
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>已保存</span>
        `;
        saveIndicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transform translate-y-0 opacity-100 transition-all duration-300 z-50';
        
        // 1.5秒后隐藏
        setTimeout(() => {
            saveIndicator.classList.remove('translate-y-0', 'opacity-100');
            saveIndicator.classList.add('translate-y-full', 'opacity-0');
        }, 1500);
    }, 500);
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
    const currentTime = new Date().toISOString();
    
    // 系统消息模板
    const systemPrompt = '你是一个专业的Mermaid图表生成助手。你的任务是将用户的中文描述转化为有效的Mermaid语法图表代码，或修复现有Mermaid代码中的错误。\n\n请注意以下要点：\n\n1. **图表类型选择**：\n   - 根据用户的需求智能选择最合适的图表类型（流程图、时序图、类图、状态图等）\n   - 如果用户已提供了Mermaid代码或指定了图表类型，请保持该类型不变，除非用户明确要求更改\n\n2. **语法规范**：\n   - 节点ID必须使用英文字母、数字和下划线，不含空格和特殊字符\n   - 连接关系必须使用英文符号和标识符\n   - 节点文本中使用中文括号"（）"而非英文括号"()"\n   - 避免在节点文本中使用特殊字符如: [],(),{},&,#等，用中文对应符号替代\n\n3. **代码质量**：\n   - 确保所有引号、括号配对完整\n   - 排版清晰，注意节点间距和布局美观\n   - 添加适当的注释帮助理解复杂图表\n\n4. **错误修复**：\n   - 当遇到Mermaid解析错误时，请仔细分析错误信息和位置\n   - 常见错误包括：语法错误、括号不匹配、箭头方向错误、缺少必要元素\n   - 修复时确保保留原图表的逻辑和结构\n\n请仅返回被```mermaid和```包裹的代码，不要返回其他解释或内容。';
    
    // 创建系统使用说明示例 - 确保语法完全正确
    const tutorialId = Date.now().toString();
    
    // 简化的流程图示例，减少出错可能性
    const tutorialCode = `graph TD
    A[开始] --> B{是否有API Key?}
    B -->|是| C[发送请求到AI]
    B -->|否| D[显示设置页面]
    C --> E[更新预览]
    D --> F[保存API Key]
    F --> C
    E --> G[下载图表]
    G --> H[结束]`;
    
    const tutorialConversation = {
        id: tutorialId,
        title: '系统使用说明',
        messages: [
            {
                role: 'system',
                content: systemPrompt,
                timestamp: currentTime
            },
            {
                role: 'user',
                content: '系统使用说明',
                timestamp: currentTime
            },
            {
                role: 'assistant',
                content: '```mermaid\n' + tutorialCode + '\n```',
                timestamp: currentTime
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
    
    // 为每个示例创建对话 - 只添加几个简单的例子，降低首次加载的复杂度
    // 选择几个较为简单的图表类型
    const simpleExampleKeys = ['flowchart', 'pie'];
    
    simpleExampleKeys.forEach((key, index) => {
        const example = examples[key];
        if (!example) return;
        
        const exampleId = (Date.now() + index + 1).toString();
        const exampleTime = new Date(Date.now() - (index + 1) * 60000).toISOString(); // 错开时间
        
        const exampleConversation = {
            id: exampleId,
            title: example.name,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                    timestamp: exampleTime
                },
                {
                    role: 'user',
                    content: example.name,
                    timestamp: exampleTime
                },
                {
                    role: 'assistant',
                    content: '```mermaid\n' + example.code + '\n```',
                    timestamp: exampleTime
                }
            ],
            createdAt: exampleTime,
            versions: [{
                id: exampleId + 'v1',
                name: example.name,
                prompt: example.name,
                code: example.code,
                createdAt: exampleTime
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
    
    // 使用延迟加载系统使用说明对话内容，确保Mermaid有足够时间初始化
    setTimeout(() => {
        loadConversation(tutorialId);
    }, 500);
    
    // 设置已经看过示例的标记
    localStorage.setItem('hasSeenExamples', 'true');
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

// 检查并重置会话 - 如果没有会话则创建示例
function checkAndResetConversations() {
    const conversations = getConversations();
    // 添加检查是否已经看过示例的标记
    const hasSeenExamples = localStorage.getItem('hasSeenExamples') === 'true';
    
    if (conversations.length === 0 && !hasSeenExamples) {
        console.log('未检测到任何对话且首次使用，创建示例对话...');
        createExampleConversations();
        // 设置已经看过示例的标记
        localStorage.setItem('hasSeenExamples', 'true');
        return true;
    }
    return false;
}

// 显示PNG尺寸输入对话框
function showPngSizeDialog(svgElement) {
    console.log('进入showPngSizeDialog函数');
    console.log('SVG元素:', svgElement);
    
    try {
        // 获取SVG原始尺寸
        const svgWidth = svgElement.viewBox.baseVal.width || svgElement.width.baseVal.value;
        const svgHeight = svgElement.viewBox.baseVal.height || svgElement.height.baseVal.value;
        
        console.log('获取到的SVG尺寸:', {width: svgWidth, height: svgHeight});
        
        // 计算宽高比
        const aspectRatio = svgHeight / svgWidth;
        console.log('宽高比:', aspectRatio);
        
        // 默认宽度
        const defaultWidth = 4096;
        const defaultHeight = Math.round(defaultWidth * aspectRatio);
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 class="text-lg font-medium mb-4">设置PNG导出尺寸</h3>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">宽度 (像素)</label>
                    <input type="number" id="png-width" class="w-full p-2 border rounded" value="${defaultWidth}" min="100" max="8192">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">高度 (像素)</label>
                    <input type="number" id="png-height" class="w-full p-2 border rounded" value="${defaultHeight}" min="100" max="8192">
                </div>
                <div class="mb-4">
                    <label class="flex items-center text-sm font-medium text-gray-700">
                        <input type="checkbox" id="maintain-ratio" class="mr-2" checked>
                        保持宽高比
                    </label>
                </div>
                <div class="flex justify-end space-x-3">
                    <button id="cancel-png" class="px-4 py-2 border rounded hover:bg-gray-100">取消</button>
                    <button id="confirm-png" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">下载</button>
                </div>
            </div>
        `;
        
        // 添加到DOM
        document.body.appendChild(dialog);
        
        // 获取输入元素
        const widthInput = document.getElementById('png-width');
        const heightInput = document.getElementById('png-height');
        const maintainRatioCheckbox = document.getElementById('maintain-ratio');
        const cancelButton = document.getElementById('cancel-png');
        const confirmButton = document.getElementById('confirm-png');
        
        // 保持宽高比的计算函数
        const updateHeight = () => {
            if (maintainRatioCheckbox.checked) {
                const width = parseFloat(widthInput.value);
                heightInput.value = Math.round(width * aspectRatio);
            }
        };
        
        const updateWidth = () => {
            if (maintainRatioCheckbox.checked) {
                const height = parseFloat(heightInput.value);
                widthInput.value = Math.round(height / aspectRatio);
            }
        };
        
        // 添加事件监听器
        widthInput.addEventListener('input', updateHeight);
        heightInput.addEventListener('input', updateWidth);
        
        // 取消按钮
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        // 确认按钮
        confirmButton.addEventListener('click', () => {
            const width = parseInt(widthInput.value, 10);
            const height = parseInt(heightInput.value, 10);
            
            // 验证输入
            if (isNaN(width) || isNaN(height) || width < 100 || height < 100) {
                showToast('请输入有效的尺寸（至少100像素）', 3000);
                return;
            }
            
            // 清除对话框
            document.body.removeChild(dialog);
            
            // 下载PNG
            downloadSvgAsPng(svgElement, width, height);
        });
    } catch (error) {
        console.error('显示PNG尺寸输入对话框时出错:', error);
        showToast('显示PNG尺寸输入对话框时出错：' + error.message, 3000);
    }
}

// 将SVG转换为PNG并下载
function downloadSvgAsPng(svgElement, width, height) {
    console.log('进入downloadSvgAsPng函数, 参数:', {width, height});
    console.log('SVG元素:', svgElement);
    
    try {
        // 显示加载提示
        showToast('正在生成PNG，请稍候...', 3000);
        
        // 获取SVG数据并添加跨域使用标记
        let svgData = new XMLSerializer().serializeToString(svgElement);
        
        // 确保SVG包含了必要的xmlns属性
        if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        console.log('SVG数据已处理，长度:', svgData.length);
        
        // 使用内联数据URL而不是Blob URL
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
        console.log('创建SVG Data URL');
        
        // 创建图像
        const img = new Image();
        console.log('创建Image对象');
        
        img.onload = function() {
            console.log('图像加载完成');
            try {
                // 创建canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                console.log('创建Canvas, 尺寸:', {width: canvas.width, height: canvas.height});
                
                // 获取绘图上下文
                const ctx = canvas.getContext('2d');
                console.log('获取绘图上下文:', ctx ? '成功' : '失败');
                
                // 设置白色背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                
                // 绘制SVG
                ctx.drawImage(img, 0, 0, width, height);
                console.log('绘制图像到Canvas完成');
                
                // 直接使用toDataURL而不是toBlob
                try {
                    console.log('使用toDataURL代替toBlob');
                    const dataUrl = canvas.toDataURL('image/png');
                    console.log('Canvas转换为DataURL完成, 长度:', dataUrl.length);
                    
                    // 创建下载链接
                    const downloadLink = document.createElement('a');
                    downloadLink.href = dataUrl;
                    downloadLink.download = 'mermaid_diagram_' + new Date().toISOString().replace(/[:.]/g, '-') + '.png';
                    console.log('创建下载链接, download属性:', downloadLink.download);
                    
                    document.body.appendChild(downloadLink);
                    console.log('添加下载链接到DOM');
                    
                    downloadLink.click();
                    console.log('触发下载链接点击');
                    
                    document.body.removeChild(downloadLink);
                    console.log('从DOM移除下载链接');
                    
                    // 显示成功提示
                    showToast('PNG图表已开始下载');
                } catch (dataUrlError) {
                    console.error('使用toDataURL出错:', dataUrlError);
                    showToast('导出PNG失败: ' + dataUrlError.message, 3000);
                }
            } catch (err) {
                console.error('PNG转换过程中出错：', err);
                showToast('PNG转换失败：' + err.message, 3000);
            }
        };
        
        img.onerror = function(error) {
            console.error('加载SVG图像失败:', error);
            showToast('加载SVG失败，无法生成PNG', 3000);
        };
        
        console.log('设置img.src');
        img.src = svgUrl;
        console.log('已设置img.src, 等待onload事件');
        
    } catch (err) {
        console.error('下载PNG失败：', err);
        showToast('下载PNG失败：' + err.message, 3000);
    }
}

// 添加元素高亮功能
function setupElementHighlight(quill) {
    const preview = document.getElementById('preview');
    let highlightedElement = null;
    let highlightedLines = [];
    let currentHoveredElement = null;
    
    // 将内部函数暴露到全局作用域
    window._highlightState = {
        highlightedElement,
        highlightedLines,
        preview
    };
    
    // 监听预览区鼠标移动事件，实现hover显示AI编辑按钮
    preview.addEventListener('mouseover', (e) => {
        const hoveredNode = findMermaidNode(e.target);
        
        if (hoveredNode && hoveredNode !== currentHoveredElement) {
            currentHoveredElement = hoveredNode;
            // 显示AI编辑按钮
            showAIEditButton(hoveredNode);
        }
    });
    
    // 监听鼠标离开预览区事件
    preview.addEventListener('mouseleave', () => {
        currentHoveredElement = null;
        // 只移除按钮，不移除输入框
        const editInput = document.getElementById('ai-edit-input');
        if (!editInput) {
            removeAIEditButton();
        }
    });
    
    // 监听预览区点击事件
    preview.addEventListener('click', (e) => {
        // 查找被点击的Mermaid元素
        const clickedNode = findMermaidNode(e.target);
        
        if (clickedNode) {
            // 清除之前的高亮
            clearHighlights();
            
            // 高亮点击的元素
            highlightElement(clickedNode);
            
            // 在编辑器中高亮对应的代码
            highlightCodeInEditor(clickedNode, quill);
        } else {
            // 点击空白处，清除所有高亮（但不关闭AI编辑输入框）
            const editInput = document.getElementById('ai-edit-input');
            if (!editInput) {
                clearHighlights();
            }
        }
    });
    
    // 查找Mermaid节点
    function findMermaidNode(target) {
        let element = target;
        
        // 向上查找直到找到节点元素或到达预览区
        while (element && element !== preview) {
            // 检查是否是节点元素
            if (element.classList.contains('node') || 
                element.classList.contains('edgePath') ||
                element.classList.contains('cluster') ||
                element.parentElement?.classList.contains('node')) {
                return element.classList.contains('node') ? element : element.parentElement;
            }
            element = element.parentElement;
        }
        
        return null;
    }
    
    // 高亮元素
    function highlightElement(element) {
        window._highlightState.highlightedElement = element;
        element.classList.add('highlighted');
        
        // 向SVG注入渐变定义
        injectGradientDefinition();
        
        // 如果是节点，也高亮相关的连接线
        const nodeId = getNodeId(element);
        if (nodeId) {
            highlightRelatedEdges(nodeId);
        }
        
        // 移除这里的显示AI编辑按钮调用，因为现在改为hover显示
        // showAIEditButton(element);
    }
    
    // 高亮相关的连接线
    function highlightRelatedEdges(nodeId) {
        const edges = preview.querySelectorAll('.edgePath');
        edges.forEach(edge => {
            const edgeLabel = edge.querySelector('.edgeLabel');
            if (edgeLabel && edgeLabel.textContent.includes(nodeId)) {
                edge.classList.add('highlighted');
            }
        });
    }
    
    // 在编辑器中高亮对应代码
    function highlightCodeInEditor(element, quill) {
        const nodeId = getNodeId(element);
        const nodeText = element.querySelector('.nodeLabel, .label, foreignObject > div')?.textContent?.trim();
        
        if (!nodeId && !nodeText) return;
        
        const text = quill.getText();
        const lines = text.split('\n');
        
        // 查找包含节点的行
        const matchingLines = [];
        lines.forEach((line, index) => {
            // 跳过空行和纯注释行
            if (!line.trim() || line.trim().startsWith('%%')) return;
            
            // 1. 精确匹配节点ID
            if (nodeId) {
                // 节点定义模式
                const nodeDefPatterns = [
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\[`),  // A[文本]
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\(`),  // A(文本)
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\{`),  // A{文本}
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\|`),  // A|文本|
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\>`),  // A>文本]
                    new RegExp(`^\\s*${escapeRegExp(nodeId)}\\s*\\[\\[`), // A[[文本]]
                ];
                
                // 节点引用模式（在箭头连接中）
                const nodeRefPatterns = [
                    new RegExp(`\\s+${escapeRegExp(nodeId)}\\s*--`),    // A --> B
                    new RegExp(`-->\\s*${escapeRegExp(nodeId)}\\s*`),   // A --> B
                    new RegExp(`\\s+${escapeRegExp(nodeId)}\\s*\\.`),   // A.->B
                    new RegExp(`\\.->\\s*${escapeRegExp(nodeId)}\\s*`), // A.->B
                    new RegExp(`\\s+${escapeRegExp(nodeId)}\\s*==`),    // A ==> B
                    new RegExp(`==>\\s*${escapeRegExp(nodeId)}\\s*`),   // A ==> B
                ];
                
                // 检查是否匹配任何模式
                const isMatch = [...nodeDefPatterns, ...nodeRefPatterns].some(pattern => pattern.test(line));
                if (isMatch) {
                    matchingLines.push(index);
                }
            }
            
            // 2. 如果有节点文本，也尝试匹配
            if (nodeText && !matchingLines.includes(index)) {
                // 转义特殊字符
                const escapedText = escapeRegExp(nodeText);
                
                // 检查是否包含节点文本（在方括号、圆括号等内）
                const textPatterns = [
                    new RegExp(`\\[${escapedText}\\]`),
                    new RegExp(`\\(${escapedText}\\)`),
                    new RegExp(`\\{${escapedText}\\}`),
                    new RegExp(`\\|${escapedText}\\|`),
                    new RegExp(`\\>${escapedText}\\]`),
                    new RegExp(`\\[\\[${escapedText}\\]\\]`),
                ];
                
                const hasText = textPatterns.some(pattern => pattern.test(line));
                if (hasText) {
                    matchingLines.push(index);
                }
            }
        });
        
        // 高亮找到的行
        if (matchingLines.length > 0) {
            highlightLines(quill, matchingLines);
        }
    }
    
    // 高亮指定的行
    function highlightLines(quill, lineNumbers) {
        window._highlightState.highlightedLines = lineNumbers;
        
        // 获取编辑器DOM元素
        const editor = quill.root;
        const lines = editor.querySelectorAll('.ql-editor > *');
        
        lineNumbers.forEach(lineNum => {
            if (lines[lineNum]) {
                lines[lineNum].classList.add('line-highlight');
                
                // 滚动到第一个高亮行
                if (lineNum === lineNumbers[0]) {
                    lines[lineNum].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            }
        });
    }
    
    // 监听编辑器变化，清除高亮
    quill.on('text-change', () => {
        clearHighlights();
    });
    
    return { clearHighlights };
}

// 显示AI编辑按钮
function showAIEditButton(element) {
    // 移除之前的编辑按钮（如果有）
    removeAIEditButton();
    
    // 获取预览区元素
    const preview = document.getElementById('preview');
    if (!preview) return;
    
    // 获取元素的位置
    const rect = element.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    
    // 创建编辑按钮容器
    const editButton = document.createElement('div');
    editButton.id = 'ai-edit-button';
    editButton.className = 'ai-edit-button';
    editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <title>AI编辑</title>
            <g fill="none">
                <path d="M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z"/>
                <path fill="currentColor" d="M17 3a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H3a1 1 0 0 1-1-1V8a5 5 0 0 1 5-5zm0 2H7a3 3 0 0 0-3 3v11h13a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3m-8 5a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1m6 0a1 1 0 0 1 .993.883L16 11v2a1 1 0 0 1-1.993.117L14 13v-2a1 1 0 0 1 1-1"/>
            </g>
        </svg>`;
    
    // 计算位置时考虑预览区的滚动偏移
    const scrollLeft = preview.scrollLeft;
    const scrollTop = preview.scrollTop;
    
    // 设置按钮位置（在元素右上角）
    editButton.style.position = 'absolute';
    editButton.style.left = `${rect.right - previewRect.left - 12 + scrollLeft}px`;
    editButton.style.top = `${rect.top - previewRect.top - 12 + scrollTop}px`;
    
    // 添加到预览区
    preview.style.position = 'relative';
    preview.appendChild(editButton);
    
    // 添加点击事件
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showAIEditInput(element, editButton);
    });
}

// 显示AI编辑输入框
function showAIEditInput(element, editButton) {
    // 移除之前的输入框（如果有）
    removeAIEditInput();
    
    // 获取预览区元素
    const preview = document.getElementById('preview');
    if (!preview) return;
    
    // 获取Quill编辑器实例
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) return;
    
    // 获取节点信息
    const nodeId = getNodeId(element);
    const nodeText = element.querySelector('.nodeLabel, .label, foreignObject > div')?.textContent?.trim();
    
    // 创建输入框容器
    const inputContainer = document.createElement('div');
    inputContainer.id = 'ai-edit-input';
    inputContainer.className = 'ai-edit-input';
    inputContainer.innerHTML = `
        <div class="ai-edit-header">
            <span>编辑节点: ${nodeId || nodeText || '未知节点'}</span>
            <button class="ai-edit-close">×</button>
        </div>
        <textarea class="ai-edit-textarea" placeholder="描述你想要的修改，例如：\n- 修改节点文本为...\n- 添加一个子节点...\n- 改变节点类型为..."></textarea>
        <div class="ai-edit-actions">
            <button class="ai-edit-cancel">取消</button>
            <button class="ai-edit-submit">修改</button>
        </div>
    `;
    
    // 设置输入框位置（在按钮下方）
    const buttonRect = editButton.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    
    // 计算位置时考虑预览区的滚动偏移
    const scrollLeft = preview.scrollLeft;
    const scrollTop = preview.scrollTop;
    
    inputContainer.style.position = 'absolute';
    inputContainer.style.left = `${Math.min(buttonRect.left - previewRect.left + scrollLeft, previewRect.width - 300)}px`;
    inputContainer.style.top = `${buttonRect.bottom - previewRect.top + 10 + scrollTop}px`;
    
    // 添加到预览区
    preview.appendChild(inputContainer);
    
    // 获取元素引用
    const textarea = inputContainer.querySelector('.ai-edit-textarea');
    const closeBtn = inputContainer.querySelector('.ai-edit-close');
    const cancelBtn = inputContainer.querySelector('.ai-edit-cancel');
    const submitBtn = inputContainer.querySelector('.ai-edit-submit');
    
    // 自动聚焦
    setTimeout(() => textarea.focus(), 50);
    
    // 添加快捷键支持
    textarea.addEventListener('keydown', (e) => {
        // 只有按下Ctrl+Enter或Command+Enter才发送消息
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // 阻止默认行为
            if (!submitBtn.disabled) {
                submitBtn.click(); // 触发发送按钮点击
            }
        }
        // 按ESC键关闭
        else if (e.key === 'Escape') {
            closeInput();
        }
        // 所有其他情况的Enter键都正常处理（包括普通Enter和Shift+Enter）
    });
    
    // 事件处理
    const closeInput = () => {
        removeAIEditInput();
    };
    
    closeBtn.addEventListener('click', closeInput);
    cancelBtn.addEventListener('click', closeInput);
    
    submitBtn.addEventListener('click', async () => {
        const userRequest = textarea.value.trim();
        if (!userRequest) {
            showToast('请输入修改要求', 2000);
            return;
        }
        
        // 禁用发送按钮并显示加载状态
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="loading"></span> 发送中...';
        
        // 获取当前代码
        const currentCode = quill.getText().trim();
        
        // 构建针对特定节点的修改请求
        const nodeInfo = {
            id: nodeId,
            text: nodeText,
            type: detectNodeType(element)
        };
        
        const aiRequest = `请修改Mermaid图表中的特定节点。

节点信息：
- 节点ID: ${nodeInfo.id || '未知'}
- 节点文本: ${nodeInfo.text || '未知'}
- 节点类型: ${nodeInfo.type || '未知'}

用户要求：${userRequest}

当前完整代码：
\`\`\`mermaid
${currentCode}
\`\`\`

请只修改指定的节点，保持其他部分不变。返回修改后的完整Mermaid代码。`;
        
        try {
            // 关闭输入框
            closeInput();
            
            // 清除高亮
            clearHighlights();
            
            // 发送到AI
            await sendNodeEditToAI(aiRequest, userRequest);
        } catch (error) {
            console.error('发送AI编辑请求失败:', error);
            showToast('发送失败：' + error.message, 3000);
        } finally {
            // 恢复按钮状态（如果输入框还存在的话）
            if (document.getElementById('ai-edit-input')) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
    
    // 按ESC键关闭
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeInput();
        }
    });
    
    // 防止点击输入框时触发预览区的点击事件
    inputContainer.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// 检测节点类型
function detectNodeType(element) {
    const shape = element.querySelector('rect, circle, polygon, path');
    if (!shape) return '未知';
    
    if (shape.tagName === 'rect') return '矩形';
    if (shape.tagName === 'circle') return '圆形';
    if (shape.tagName === 'polygon') return '菱形';
    if (shape.classList.contains('er')) return '圆角矩形';
    
    return '默认';
}

// 发送节点编辑请求到AI
async function sendNodeEditToAI(aiRequest, userRequest) {
    // 获取Quill编辑器实例
    const quill = Quill.find(document.getElementById('editor-container'));
    if (!quill) {
        showToast('编辑器未初始化', 2000);
        return;
    }
    
    // 更新用户输入显示
    updateLastUserInput(`编辑节点: ${userRequest}`);
    
    // 禁用输入
    toggleInputState(false, quill);
    
    try {
        // 获取当前对话
        const activeConversationId = localStorage.getItem('activeConversationId') || createNewConversation();
        const conversation = getConversation(activeConversationId);
        
        if (conversation) {
            const currentTime = new Date().toISOString();
            
            // 添加用户消息
            conversation.messages.push({
                role: 'user',
                content: aiRequest,
                timestamp: currentTime
            });
            
            // 保存用户消息
            updateConversation(activeConversationId, conversation, false);
            
            // 发送到AI
            const result = await sendToAI(aiRequest, quill.getText().trim());
            
            // 提取Mermaid代码
            const mermaidCode = extractMermaidCode(result);
            
            if (mermaidCode) {
                // 更新编辑器
                quill.off('text-change');
                quill.setText(mermaidCode);
                
                // 更新预览
                updateMermaidPreview(mermaidCode);
                
                // 添加AI响应
                conversation.messages.push({
                    role: 'assistant',
                    content: result,
                    timestamp: new Date().toISOString()
                });
                
                // 添加版本
                const versionName = `编辑节点: ${userRequest.substring(0, 20)}${userRequest.length > 20 ? '...' : ''}`;
                const newVersion = addVersion(conversation, versionName, aiRequest, mermaidCode);
                
                // 将新版本设置为当前版本
                if (newVersion) {
                    conversation.currentVersionId = newVersion.id;
                }
                
                // 保存对话
                updateConversation(activeConversationId, conversation, false);
                
                // 更新版本列表
                loadVersions();
                
                // 重新添加事件监听器
                setTimeout(() => {
                    addEditorEventListener(quill);
                }, 100);
                
                showToast('节点修改成功', 2000);
            } else {
                throw new Error('未能从AI响应中提取有效的Mermaid代码');
            }
        }
    } catch (error) {
        console.error('发送节点编辑请求时出错：', error);
        showToast('修改失败：' + error.message, 3000);
    } finally {
        // 恢复输入状态
        toggleInputState(true, quill);
    }
}

// 移除AI编辑按钮
function removeAIEditButton() {
    const existingButton = document.getElementById('ai-edit-button');
    if (existingButton) {
        existingButton.remove();
    }
}

// 移除AI编辑输入框
function removeAIEditInput() {
    const existingInput = document.getElementById('ai-edit-input');
    if (existingInput) {
        existingInput.remove();
    }
}

// 获取节点ID - 完整实现
function getNodeId(element) {
    // 尝试从不同的属性中获取节点ID
    
    // 1. 首先尝试从data-id属性获取（某些版本的Mermaid会设置这个）
    const dataId = element.getAttribute('data-id');
    if (dataId) return dataId;
    
    // 2. 从id属性中提取（格式通常是 flowchart-nodeId-xxx）
    const elementId = element.id;
    if (elementId && elementId.includes('flowchart-')) {
        const match = elementId.match(/flowchart-([^-]+)-/);
        if (match && match[1]) return match[1];
    }
    
    // 3. 从类名中提取ID
    const classMatch = Array.from(element.classList).find(cls => cls.includes('flowchart-'));
    if (classMatch) {
        const match = classMatch.match(/flowchart-([^-]+)-/);
        if (match && match[1]) return match[1];
    }
    
    // 4. 查找节点内的文本标签
    const labelElement = element.querySelector('.nodeLabel, .label, foreignObject > div');
    if (labelElement) {
        // 获取文本内容，但需要处理可能包含的HTML
        const textContent = labelElement.textContent?.trim();
        
        // 尝试从父元素的属性中找到对应的节点ID
        // Mermaid通常会在某处保存原始的节点ID
        const parentG = element.closest('g[id]');
        if (parentG && parentG.id.includes('-')) {
            const match = parentG.id.match(/([^-]+)$/);
            if (match && match[1] !== 'output') {
                // 提取ID部分，通常是数字
                const idMatch = parentG.id.match(/(\w+)-\d+$/);
                if (idMatch) return idMatch[1];
            }
        }
    }
    
    // 5. 最后的尝试：查找包含节点定义的文本
    const allText = element.textContent?.trim();
    if (allText) {
        // 如果文本很短（可能是节点ID），直接返回
        if (allText.length <= 10 && /^[A-Za-z0-9_]+$/.test(allText)) {
            return allText;
        }
    }
    
    return null;
}

// 清除所有高亮 - 全局函数
function clearHighlights() {
    const state = window._highlightState;
    if (!state) return;
    
    // 清除预览区高亮
    if (state.highlightedElement) {
        state.highlightedElement.classList.remove('highlighted');
        state.highlightedElement = null;
    }
    
    // 清除所有高亮的边
    const preview = document.getElementById('preview');
    if (preview) {
        preview.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    }
    
    // 清除编辑器高亮
    const editor = document.querySelector('.ql-editor');
    if (editor) {
        editor.querySelectorAll('.line-highlight').forEach(el => {
            el.classList.remove('line-highlight');
        });
    }
    
    if (state.highlightedLines) {
        state.highlightedLines = [];
    }
    
    // 移除AI编辑按钮和输入框
    removeAIEditButton();
    removeAIEditInput();
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 注入SVG渐变定义
function injectGradientDefinition() {
    const preview = document.getElementById('preview');
    if (!preview) return;
    
    const svg = preview.querySelector('svg');
    if (!svg) return;
    
    // 检查是否已经有渐变定义
    if (svg.querySelector('#highlight-gradient')) return;
    
    // 创建defs元素
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }
    
    // 创建渐变定义
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'highlight-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    
    // 添加渐变色停
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#8b5cf6');
    stop1.setAttribute('stop-opacity', '0.8');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#3b82f6');
    stop2.setAttribute('stop-opacity', '0.8');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    
    // 创建一个更柔和的发光滤镜
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'highlight-glow');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '2');
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
}