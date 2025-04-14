<template>
    <div>
      <h2>Notes</h2>
      <ul>
        <li v-for="file in files" :key="file.name">
          <a @click="editFile(file.name)">{{ file.name }}</a>
        </li>
      </ul>
      <button @click="createNewFile">New Note</button>
    </div>
  </template>
  
  <script>
  import { getFiles, getAuthenticatedUser } from '@/github.js';
  
  export default {
    data() {
      return {
        files: [],
        owner: '',
        repo: '',
      };
    },
    async mounted() {
      try {
        const user = await getAuthenticatedUser();
        this.owner = user.login;
        this.repo = localStorage.getItem('github_repo');
        if (!this.repo || !localStorage.getItem('github_token')) {
          this.$router.push('/settings');
          return;
        }
        const files = await getFiles(this.owner, this.repo);
        this.files = files.filter(file => file.type === 'file' && file.name.endsWith('.md'));
      } catch (error) {
        console.error(error);
        alert('Error loading files: ' + error.message);
      }
    },
    methods: {
      editFile(filename) {
        this.$router.push(`/edit/${filename}`);
      },
      createNewFile() {
        this.$router.push('/new');
      },
    },
  };
  </script>