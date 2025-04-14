import { createRouter, createWebHistory } from 'vue-router';
import FileList from '@/components/FileList.vue';
import Editor from '@/components/Editor.vue';
import Settings from '@/components/Settings.vue';

const routes = [
  { path: '/', component: FileList },
  { path: '/edit/:filename', component: Editor },
  { path: '/new', component: Editor },
  { path: '/settings', component: Settings },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;