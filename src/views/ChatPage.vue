<template>
  <div class="chat-page">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <i class="el-icon-chat-dot-round"></i>
          <span v-if="!sidebarCollapsed">阿孝AI</span>
        </div>
        <el-button 
          v-if="!sidebarCollapsed"
          type="primary" 
          size="small" 
          icon="el-icon-plus"
          @click="handleNewChat"
          class="new-chat-btn"
        >
          新对话
        </el-button>
      </div>
      
      <div class="conversations-list" v-if="!sidebarCollapsed">
        <div 
          v-for="conversation in sortedConversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === currentConversationId }"
          @click="handleSwitchConversation(conversation.id)"
        >
          <div class="conversation-content">
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-time">{{ formatTime(conversation.updateTime) }}</div>
          </div>
          <el-dropdown trigger="click" @command="(cmd) => handleConversationCommand(cmd, conversation.id)">
            <span class="el-dropdown-link">
              <i class="el-icon-more"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="delete">
                <i class="el-icon-delete"></i> 删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        
        <div v-if="sortedConversations.length === 0" class="empty-tip">
          <i class="el-icon-chat-line-round"></i>
          <p>暂无对话历史</p>
        </div>
      </div>
      
      <div class="sidebar-footer" v-if="!sidebarCollapsed">
        <el-button 
          size="small" 
          icon="el-icon-delete"
          @click="handleClearAll"
        >
          清空历史
        </el-button>
      </div>
      
      <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <i :class="sidebarCollapsed ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"></i>
      </div>
    </div>
    
    <!-- 主聊天区域 -->
    <div class="chat-main">
      <div class="chat-container">
        <!-- 空状态 -->
        <div v-if="currentMessages.length === 0" class="empty-state">
          <div class="empty-icon">
            <i class="el-icon-chat-dot-round"></i>
          </div>
          <h2>你好，我是阿孝AI</h2>
          <p>一个智能对话助手，随时为您提供帮助</p>
          <div class="quick-questions">
            <div 
              v-for="(question, index) in quickQuestions"
              :key="index"
              class="question-card"
              @click="handleQuickQuestion(question)"
            >
              <i :class="question.icon"></i>
              <span>{{ question.text }}</span>
            </div>
          </div>
        </div>
        
        <!-- 消息列表 -->
        <div v-else class="messages-container" ref="messagesContainer">
          <div 
            v-for="message in currentMessages"
            :key="message.id"
            class="message-item"
            :class="message.role"
          >
            <div class="message-avatar">
              <i :class="message.role === 'user' ? 'el-icon-user-solid' : 'el-icon-service'"></i>
            </div>
            <div class="message-content">
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>
          
          <!-- 加载动画 -->
          <div v-if="isGenerating" class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="1"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入消息... (Shift + Enter 换行，Enter 发送)"
            @keydown.native="handleKeyDown"
            :disabled="isGenerating"
          ></el-input>
          <el-button 
            type="primary" 
            icon="el-icon-s-promotion"
            circle
            :disabled="!inputMessage.trim() || isGenerating"
            @click="handleSend"
            class="send-btn"
          ></el-button>
        </div>
          <div class="input-tips">
          <span>阿孝AI 可能会出错，请核查重要信息</span>
          </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';

export default {
  name: 'ChatPage',
  data() {
    return {
      inputMessage: '',
      sidebarCollapsed: false,
      quickQuestions: [
        { icon: 'el-icon-data-line', text: 'AI PPT' },
        { icon: 'el-icon-document', text: 'AI文档' },
        { icon: 'el-icon-connection', text: 'AI翻译' },
        { icon: 'el-icon-files', text: 'AI文档鉴定' },
        { icon: 'el-icon-s-order', text: 'AI法律诉讼' }
      ]
    };
  },
  computed: {
    ...mapState(['currentConversationId', 'currentMessages', 'isGenerating']),
    ...mapGetters(['sortedConversations'])
  },
  mounted() {
    // 初始化时创建第一个对话
    if (this.sortedConversations.length === 0) {
      this.createConversation();
    }
  },
  methods: {
    ...mapActions(['createConversation', 'sendMessage']),
    ...mapMutations(['SWITCH_CONVERSATION', 'DELETE_CONVERSATION', 'CLEAR_ALL_CONVERSATIONS']),
    
    // 发送消息
    async handleSend() {
      if (!this.inputMessage.trim() || this.isGenerating) {
        return;
      }
      
      // 如果没有当前对话，创建一个
      if (!this.currentConversationId) {
        await this.createConversation();
      }
      
      const message = this.inputMessage;
      this.inputMessage = '';
      
      await this.sendMessage(message);
      
      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    
    // 快捷问题
    handleQuickQuestion(question) {
      this.inputMessage = question.text;
      this.handleSend();
    },
    
    // 新建对话
    async handleNewChat() {
      await this.createConversation();
      this.scrollToBottom();
    },
    
    // 切换对话
    handleSwitchConversation(id) {
      this.SWITCH_CONVERSATION(id);
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    
    // 对话操作
    handleConversationCommand(command, conversationId) {
      if (command === 'delete') {
        this.$confirm('确定要删除这个对话吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.DELETE_CONVERSATION(conversationId);
          this.$message.success('删除成功');
        }).catch(() => {});
      }
    },
    
    // 清空所有对话
    handleClearAll() {
      if (this.sortedConversations.length === 0) {
        return;
      }
      
      this.$confirm('确定要清空所有对话历史吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.CLEAR_ALL_CONVERSATIONS();
        this.createConversation();
        this.$message.success('已清空');
      }).catch(() => {});
    },
    
    // 键盘事件
    handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    },
    
    // 滚动到底部
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    
    // 格式化消息内容
    formatMessage(content) {
      return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    },
    
    // 格式化时间
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + ' 分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + ' 小时前';
      } else if (diff < 604800000) {
        return Math.floor(diff / 86400000) + ' 天前';
      } else {
        return date.toLocaleDateString();
      }
    }
  },
  watch: {
    currentMessages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.chat-page {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

/* 侧边栏样式 */
.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  position: relative;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 16px;
}

.logo i {
  font-size: 28px;
}

.new-chat-btn {
  width: 100%;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-item.active {
  background: #ecf5ff;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.el-dropdown-link {
  color: #909399;
  cursor: pointer;
  padding: 4px;
}

.el-dropdown-link:hover {
  color: #409eff;
}

.empty-tip {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-tip i {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.sidebar-footer .el-button {
  width: 100%;
}

.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-toggle:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #606266;
}

.empty-icon {
  font-size: 80px;
  color: #409eff;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 28px;
  margin-bottom: 12px;
  color: #303133;
}

.empty-state p {
  font-size: 16px;
  color: #909399;
  margin-bottom: 40px;
}

.quick-questions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  max-width: 900px;
}

.question-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  background: #f5f7fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 100px;
}

.question-card:hover {
  background: #ecf5ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.15);
}

.question-card i {
  font-size: 32px;
  color: #409eff;
}

.question-card span {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 消息列表 */
.messages-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 0;
}

.message-item {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-item.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.message-item.assistant .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
}

.message-content {
  flex: 1;
}

.message-text {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 8px;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-item.user .message-text {
  background: #409eff;
  color: #fff;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

/* 打字动画 */
.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 输入区域 */
.input-area {
  border-top: 1px solid #e4e7ed;
  padding: 20px;
  background: #fff;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper >>> .el-textarea {
  flex: 1;
}

.input-wrapper >>> .el-textarea__inner {
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
}

.send-btn {
  width: 46px;
  height: 46px;
  font-size: 20px;
}

.input-tips {
  max-width: 900px;
  margin: 12px auto 0;
  text-align: center;
  font-size: 12px;
  color: #909399;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>

