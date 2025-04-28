<template>
  <div id="app">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/settings">Settings</router-link>
    </nav>
    <div class="main-layout">
      <Explorer @file-clicked="onFileClicked" />
      <div class="main-content">
        <router-view></router-view>
      </div>
    </div>
  </div>
</template>

<script>
import Explorer from './components/Explorer.vue';
export default {
  name: 'App',
  components: { Explorer },
  methods: {
    onFileClicked(path) {
      // You can handle file clicks here, e.g., navigate or preview
      // For now, just log
      console.log('File clicked:', path);
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 20px;
}
nav {
  margin-bottom: 20px;
}
.main-layout {
  display: flex;
  height: calc(100vh - 70px);
}
.main-content {
  flex: 1;
  overflow: auto;
}
</style>