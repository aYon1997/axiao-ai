import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    // 当前对话ID
    currentConversationId: null,
    // 所有对话历史
    conversations: [],
    // 当前对话消息列表
    currentMessages: [],
    // 是否正在生成回复
    isGenerating: false
  },
  
  mutations: {
    // 创建新对话
    CREATE_CONVERSATION(state, conversation) {
      state.conversations.unshift(conversation);
      state.currentConversationId = conversation.id;
      state.currentMessages = [];
    },
    
    // 切换对话
    SWITCH_CONVERSATION(state, conversationId) {
      state.currentConversationId = conversationId;
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        state.currentMessages = conversation.messages || [];
      }
    },
    
    // 添加消息
    ADD_MESSAGE(state, message) {
      state.currentMessages.push(message);
      // 同步更新到对话历史
      const conversation = state.conversations.find(c => c.id === state.currentConversationId);
      if (conversation) {
        if (!conversation.messages) {
          conversation.messages = [];
        }
        conversation.messages.push(message);
        // 更新对话标题（使用第一条用户消息）
        if (message.role === 'user' && !conversation.title) {
          conversation.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
        }
        // 更新时间
        conversation.updateTime = Date.now();
      }
    },
    
    // 更新最后一条消息内容（用于流式输出）
    UPDATE_LAST_MESSAGE(state, content) {
      if (state.currentMessages.length > 0) {
        const lastMessage = state.currentMessages[state.currentMessages.length - 1];
        lastMessage.content = content;
        
        // 同步到对话历史
        const conversation = state.conversations.find(c => c.id === state.currentConversationId);
        if (conversation && conversation.messages && conversation.messages.length > 0) {
          conversation.messages[conversation.messages.length - 1].content = content;
        }
      }
    },
    
    // 设置生成状态
    SET_GENERATING(state, isGenerating) {
      state.isGenerating = isGenerating;
    },
    
    // 删除对话
    DELETE_CONVERSATION(state, conversationId) {
      const index = state.conversations.findIndex(c => c.id === conversationId);
      if (index !== -1) {
        state.conversations.splice(index, 1);
        // 如果删除的是当前对话，清空当前消息
        if (state.currentConversationId === conversationId) {
          state.currentConversationId = null;
          state.currentMessages = [];
        }
      }
    },
    
    // 清空所有对话
    CLEAR_ALL_CONVERSATIONS(state) {
      state.conversations = [];
      state.currentConversationId = null;
      state.currentMessages = [];
    }
  },
  
  actions: {
    // 创建新对话
    createConversation({ commit }) {
      const conversation = {
        id: Date.now().toString(),
        title: '新对话',
        messages: [],
        createTime: Date.now(),
        updateTime: Date.now()
      };
      commit('CREATE_CONVERSATION', conversation);
      return conversation.id;
    },
    
    // 发送消息
    async sendMessage({ commit, state }, content) {
      // 添加用户消息
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content,
        timestamp: Date.now()
      };
      commit('ADD_MESSAGE', userMessage);
      
      // 添加助手消息（初始为空）
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };
      commit('ADD_MESSAGE', assistantMessage);
      commit('SET_GENERATING', true);
      
      // 调用API
      const api = require('@/api');
      try {
        await api.sendMessage(content, (chunk) => {
          // 流式更新
          assistantMessage.content += chunk;
          commit('UPDATE_LAST_MESSAGE', assistantMessage.content);
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        commit('UPDATE_LAST_MESSAGE', '抱歉，发生了一些错误，请稍后再试。');
      } finally {
        commit('SET_GENERATING', false);
      }
    }
  },
  
  getters: {
    // 获取当前对话
    currentConversation: (state) => {
      return state.conversations.find(c => c.id === state.currentConversationId);
    },
    
    // 获取排序后的对话列表
    sortedConversations: (state) => {
      return [...state.conversations].sort((a, b) => b.updateTime - a.updateTime);
    }
  }
});

