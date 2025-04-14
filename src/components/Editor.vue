<template>
    <div>
      <h2>{{ isNew ? 'New Note' : 'Edit Note' }}</h2>
      <div id="editor"></div>
      <button @click="save">Save</button>
      <select v-model="mode" @change="changeMode">
        <option value="wysiwyg">WYSIWYG</option>
        <option value="sv">Source</option>
      </select>
    </div>
  </template>
  
  <script>
  import Vditor from 'vditor';
  import { getFileContent, saveFile, getAuthenticatedUser } from '@/github.js';
  
  export default {
    data() {
      return {
        vditor: null,
        filename: '',
        sha: null,
        owner: '',
        repo: '',
        mode: 'wysiwyg',
        isNew: false,
      };
    },
    async mounted() {
      this.repo = localStorage.getItem('github_repo');
      if (!this.repo || !localStorage.getItem('github_token')) {
        this.$router.push('/settings');
        return;
      }
      const user = await getAuthenticatedUser();
      this.owner = user.login;
  
      let content = '';
      if (this.$route.path !== '/new') {
        this.filename = this.$route.params.filename;
        try {
          const { content: fileContent, sha } = await getFileContent(this.owner, this.repo, `notes/${this.filename}`);
          content = fileContent;
          this.sha = sha;
        } catch (error) {
          console.error(error);
          alert('Error loading file: ' + error.message);
        }
      } else {
        this.isNew = true;
      }
  
      this.vditor = new Vditor('editor', {
        mode: this.mode,
        value: content,
        height: 400, // Optional: Adjust editor height
      });
    },
    methods: {
      async save() {
        const content = this.vditor.getValue();
        if (this.isNew) {
          const filename = prompt('Enter filename (without .md)', 'note');
          if (!filename) return;
          this.filename = `${filename}.md`;
          try {
            await saveFile(this.owner, this.repo, `notes/${this.filename}`, content);
            this.isNew = false;
            this.$router.push(`/edit/${this.filename}`);
          } catch (error) {
            alert('Error saving new file: ' + error.message);
          }
        } else {
          try {
            await saveFile(this.owner, this.repo, `notes/${this.filename}`, content, this.sha);
            const { sha } = await getFileContent(this.owner, this.repo, `notes/${this.filename}`);
            this.sha = sha; // Update SHA for future saves
            alert('File saved successfully!');
          } catch (error) {
            alert('Error updating file: ' + error.message);
          }
        }
      },
      changeMode() {
        this.vditor.setMode(this.mode);
      },
    },
  };
  </script>