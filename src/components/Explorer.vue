<template>
  <div class="explorer">
    <h3>Repository Explorer</h3>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <ul class="tree-root">
        <TreeNode
          v-for="item in tree"
          :key="item.path"
          :node="item"
          @file-clicked="onFileClicked"
        />
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, defineComponent } from 'vue';
import { getOctokit, getAuthenticatedUser } from '@/github.js';
import TreeNode from './TreeNode.vue';

export default defineComponent({
  name: 'Explorer',
  components: { TreeNode },
  emits: ['file-clicked'],
  setup(_, { emit }) {
    const tree = ref([]);
    const loading = ref(true);
    onMounted(async () => {
      loading.value = true;
      try {
        const user = await getAuthenticatedUser();
        const owner = user.login;
        const repo = localStorage.getItem('github_repo');
        const octokit = getOctokit();
        const res = await octokit.repos.getContent({ owner, repo, path: '' });
        tree.value = Array.isArray(res.data)
          ? res.data.map(item => ({ ...item, owner, repo }))
          : [];
      } catch (e) {
        tree.value = [];
      }
      loading.value = false;
    });
    const onFileClicked = function(path) {
      const mdMatch = path.match(/^notes\/([^/]+)\/markdown\.md$/);
      if (mdMatch) {
        this.$router.push(`/edit/${mdMatch[1]}`);
      } else {
        console.log('File clicked:', path);
      }
      emit('file-clicked', path);
    };
    return { tree, loading, onFileClicked };
  }
});
</script>

<style scoped>
.explorer {
  width: 250px;
  background: #f7f7f7;
  border-right: 1px solid #ddd;
  height: 100vh;
  overflow-y: auto;
  padding: 0.5rem;
}
.tree-root, .tree-root ul {
  list-style: none;
  padding-left: 1em;
  margin: 0;
}
.tree-node {
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}
.tree-node:hover {
  background: #e0e0e0;
}
</style> 