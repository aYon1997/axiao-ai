// 模拟API接口，使用 Promise.resolve 模拟返回

// 模拟的AI回复内容库
const mockResponses = [
  '您好！我是阿孝问问，一个智能对话助手。我可以帮助您解答问题、提供建议、进行创意讨论等。请问有什么我可以帮助您的吗？',
  '这是一个很好的问题。让我来帮您分析一下：\n\n首先，我们需要考虑几个关键因素...\n\n其次，根据实际情况...\n\n最后，我建议...',
  '关于这个话题，我有以下几点看法：\n\n1. 从技术角度来看，这确实是一个值得探讨的方向\n2. 考虑到实际应用场景，我们需要权衡利弊\n3. 综合来看，这个方案具有一定的可行性',
  '理解您的想法。这个问题涉及到多个层面：\n\n**理论层面**：相关研究表明...\n\n**实践层面**：在实际应用中...\n\n**建议**：基于以上分析，我认为...',
  '很高兴能和您讨论这个话题！根据我的了解：\n\n✓ 这个方向确实很有前景\n✓ 需要注意的关键点包括...\n✓ 可以尝试从以下几个方面入手...\n\n希望这些信息对您有帮助！'
];

// 模拟延迟
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 模拟流式输出的发送消息接口
 * @param {string} message - 用户消息
 * @param {function} onChunk - 接收每个数据块的回调函数
 * @returns {Promise} 
 */
export function sendMessage(message, onChunk) {
  return new Promise((resolve) => {
    // 根据用户消息选择回复
    let response = '';
    
    if (message.toLowerCase().includes('hello') || message.includes('你好') || message.includes('您好')) {
      response = mockResponses[0];
    } else if (message.includes('?') || message.includes('？') || message.includes('吗') || message.includes('什么')) {
      response = mockResponses[Math.floor(Math.random() * (mockResponses.length - 1)) + 1];
    } else {
      response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }
    
    // 模拟流式输出
    let index = 0;
    const streamInterval = setInterval(() => {
      if (index < response.length) {
        // 每次输出1-3个字符
        const chunkSize = Math.floor(Math.random() * 3) + 1;
        const chunk = response.slice(index, index + chunkSize);
        index += chunkSize;
        
        if (onChunk && typeof onChunk === 'function') {
          onChunk(chunk);
        }
      } else {
        clearInterval(streamInterval);
        resolve({
          success: true,
          message: '发送成功'
        });
      }
    }, 50); // 每50ms输出一次
  });
}

/**
 * 获取对话历史（模拟接口）
 * @returns {Promise}
 */
export function getConversations() {
  return Promise.resolve({
    success: true,
    data: []
  });
}

/**
 * 删除对话（模拟接口）
 * @param {string} conversationId - 对话ID
 * @returns {Promise}
 */
export function deleteConversation(conversationId) {
  return delay(300).then(() => {
    return Promise.resolve({
      success: true,
      message: '删除成功'
    });
  });
}

/**
 * 清空所有对话（模拟接口）
 * @returns {Promise}
 */
export function clearAllConversations() {
  return delay(300).then(() => {
    return Promise.resolve({
      success: true,
      message: '清空成功'
    });
  });
}

export default {
  sendMessage,
  getConversations,
  deleteConversation,
  clearAllConversations
};

