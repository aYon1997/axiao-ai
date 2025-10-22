import Vue from 'vue';
import VueRouter from 'vue-router';
import ChatPage from '@/views/ChatPage.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: ChatPage
  }
];

const router = new VueRouter({
  mode: 'hash',
  routes
});

export default router;

