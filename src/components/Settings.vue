<template>
    <div>
      <h2>Settings</h2>
      <label>GitHub Token: <input v-model="token" placeholder="Enter your token" /></label><br>
      <label>Repo Name: <input v-model="repo" placeholder="e.g., markdown-notes" /></label><br>
      <button @click="saveSettings">Save</button>
    </div>
  </template>
  
  <script>
  import { getAuthenticatedUser, getRepo, createRepo } from '@/github.js';
  
  export default {
    data() {
      return {
        token: localStorage.getItem('github_token') || '',
        repo: localStorage.getItem('github_repo') || '',
      };
    },
    methods: {
      async saveSettings() {
        localStorage.setItem('github_token', this.token);
        localStorage.setItem('github_repo', this.repo);
        try {
          const user = await getAuthenticatedUser();
          const owner = user.login;
          const repo = await getRepo(owner, this.repo);
          if (!repo) {
            await createRepo(this.repo);
            alert('Repository created successfully!');
          }
          this.$router.push('/'); // Redirect to home after saving
        } catch (error) {
          console.error(error);
          alert('Error: ' + (error.message || 'Could not create repository'));
        }
      },
    },
  };
  </script>