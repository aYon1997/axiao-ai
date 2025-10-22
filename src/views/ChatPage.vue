<template>
  <div class="chat-page">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <i class="el-icon-chat-dot-round"></i>
          <span v-if="!sidebarCollapsed">阿孝问问</span>
        </div>
      </div>
      
      <!-- 功能目录 -->
      <div class="menu-section" v-if="!sidebarCollapsed">
        <div 
          v-for="(menu, index) in menuList"
          :key="index"
          class="menu-item"
          :class="{ active: menu.active }"
          @click="handleMenuClick(menu)"
        >
          <i :class="menu.icon"></i>
          <span>{{ menu.label }}</span>
          <i v-if="menu.hasArrow" class="el-icon-arrow-right menu-arrow"></i>
        </div>
      </div>
      
      <!-- 历史对话 -->
      <div class="history-section" v-if="!sidebarCollapsed">
        <div class="history-header">
          <span class="history-title">历史对话</span>
          <el-button 
            type="text" 
            size="mini"
            icon="el-icon-delete"
            @click="handleClearAll"
            class="clear-btn"
          >
            清空
          </el-button>
        </div>
        
        <div class="conversations-list">
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
          <h2>你好，我是阿孝问问</h2>
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
          <span>阿孝问问 可能会出错，请核查重要信息</span>
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
      ],
      menuList: [
        { icon: 'el-icon-chat-dot-round', label: '新对话', key: 'newChat', active: true },
        { icon: 'el-icon-document', label: 'AI文档', key: 'aiDoc', active: false },
        { icon: 'el-icon-picture', label: '图像生成', key: 'imageGen', active: false },
        { icon: 'el-icon-s-platform', label: 'AI翻译', key: 'aiTranslate', active: false },
        { icon: 'el-icon-files', label: 'AI文档鉴定', key: 'docCheck', active: false },
        { icon: 'el-icon-s-order', label: 'AI法律诉讼', key: 'aiLegal', active: false },
        { icon: 'el-icon-more', label: '更多', key: 'more', active: false, hasArrow: true }
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
    
    // 菜单点击
    handleMenuClick(menu) {
      if (menu.key === 'newChat') {
        this.handleNewChat();
      } else if (menu.key === 'more') {
        this.$message.info('更多功能敬请期待');
      } else {
        this.$message.info(`${menu.label}功能敬请期待`);
      }
      
      // 更新激活状态
      this.menuList.forEach(item => {
        item.active = item.key === menu.key;
      });
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
  padding: 20px 16px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.logo i {
  font-size: 24px;
}

/* 功能目录 */
.menu-section {
  padding: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  position: relative;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.menu-item i:first-child {
  font-size: 18px;
  width: 18px;
}

.menu-item span {
  flex: 1;
  font-size: 14px;
}

.menu-arrow {
  font-size: 12px;
  color: #c0c4cc;
}

/* 历史对话区域 */
.history-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
}

.history-title {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.clear-btn {
  padding: 4px 8px;
  color: #909399;
}

.clear-btn:hover {
  color: #409eff;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
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
  background: linear-gradient(180deg, #f8f9fe 0%, #ffffff 100%);
  position: relative;
}

.chat-main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  background: radial-gradient(ellipse at top, rgba(64, 158, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 32px;
  position: relative;
  z-index: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #606266;
  padding: 40px 20px;
}

.empty-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 50%;
  margin-bottom: 32px;
  position: relative;
}

.empty-icon::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.1;
  animation: pulse 3s ease-in-out infinite;
}

.empty-icon i {
  font-size: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.15;
  }
}

.empty-state h2 {
  font-size: 32px;
  margin-bottom: 16px;
  color: #303133;
  font-weight: 700;
}

.empty-state p {
  font-size: 16px;
  color: #909399;
  margin-bottom: 56px;
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
  gap: 12px;
  padding: 28px 20px;
  background: #ffffff;
  border: 1.5px solid #e8eaed;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 120px;
  position: relative;
  overflow: hidden;
}

.question-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.35s;
}

.question-card:hover {
  border-color: #667eea;
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.2);
}

.question-card:hover::before {
  opacity: 1;
}

.question-card i {
  font-size: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
  transition: transform 0.35s;
}

.question-card:hover i {
  transform: scale(1.1);
}

.question-card span {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  position: relative;
  z-index: 1;
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
  margin-bottom: 32px;
  animation: messageSlideIn 0.4s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
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
  max-width: calc(100% - 56px);
}

.message-text {
  padding: 16px 20px;
  border-radius: 16px;
  line-height: 1.8;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 15px;
  position: relative;
}

.message-item.assistant .message-text {
  background: #ffffff;
  color: #303133;
  border: 1px solid #e8eaed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.message-item.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
  margin-left: auto;
  max-width: 85%;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  padding-left: 4px;
}

/* 打字动画 */
.typing-indicator {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 16px;
  width: fit-content;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.typing-indicator span {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-12px) scale(1.1);
    opacity: 1;
  }
}

/* 输入区域 */
.input-area {
  padding: 24px 32px 32px;
  background: #ffffff;
  border-top: 1px solid #e8eaed;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 10;
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  gap: 16px;
  align-items: flex-end;
  position: relative;
}

.input-wrapper >>> .el-textarea {
  flex: 1;
}

.input-wrapper >>> .el-textarea__inner {
  border-radius: 16px;
  padding: 16px 20px;
  font-size: 15px;
  border: 2px solid #e8eaed;
  background: #ffffff;
  transition: all 0.3s;
  min-height: 56px !important;
  resize: none;
  overflow: hidden;
  overflow-y: auto;
}

.input-wrapper >>> .el-textarea__inner::-webkit-scrollbar {
  display: none;
}

.input-wrapper >>> .el-textarea__inner {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.input-wrapper >>> .el-textarea__inner:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.send-btn {
  width: 56px;
  height: 56px;
  font-size: 22px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.send-btn:active {
  transform: translateY(0);
}

.send-btn.is-disabled {
  background: #e8eaed;
  box-shadow: none;
}

.input-tips {
  max-width: 900px;
  margin: 16px auto 0;
  text-align: center;
  font-size: 13px;
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

