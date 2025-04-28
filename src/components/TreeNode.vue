<template>
  <li>
    <div class="tree-node" @click="toggle">
      <span v-if="node.type === 'dir'">
        {{ expanded ? '📂' : '📁' }} {{ node.name }}
      </span>
      <span v-else>📄 {{ node.name }}</span>
    </div>
    <ul v-if="expanded">
      <li v-if="loading">Loading...</li>
      <TreeNode
        v-for="child in children"
        :key="child.path"
        :node="child"
        @file-clicked="$emit('file-clicked', $event)"
      />
    </ul>
  </li>
</template>

<script>
import { ref } from 'vue';
import { getOctokit } from '@/github.js';

export default {
  name: 'TreeNode',
  props: { node: Object },
  emits: ['file-clicked'],
  components: { TreeNode: null }, // will be set in setup
  setup(props, { emit }) {
    const expanded = ref(false);
    const children = ref([]);
    const loading = ref(false);
    const toggle = async () => {
      if (props.node.type === 'dir') {
        expanded.value = !expanded.value;
        if (expanded.value && children.value.length === 0) {
          loading.value = true;
          try {
            const octokit = getOctokit();
            const { owner, repo } = props.node;
            const res = await octokit.repos.getContent({ owner, repo, path: props.node.path });
            children.value = Array.isArray(res.data)
              ? res.data.map(item => ({ ...item, owner, repo }))
              : [];
          } catch (e) {
            children.value = [];
          }
          loading.value = false;
        }
      } else {
        emit('file-clicked', props.node.path);
      }
    };
    return { expanded, children, loading, toggle };
  }
};
</script>

<style scoped>
.tree-node {
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}
.tree-node:hover {
  background: #e0e0e0;
}
</style> 