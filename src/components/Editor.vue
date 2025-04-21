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
          const notePath = `notes/${this.filename}/markdown.md`;
          const { content: fileContent, sha } = await getFileContent(this.owner, this.repo, notePath);
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
        height: 400,
        after: () => {
          console.log('Vditor initialized successfully');
        },
        cache: {
          enable: false
        },
        preview: {
          mode: 'both',
          url: (url) => {
            // If the URL is a relative path, convert it to a full GitHub raw URL
            if (!url.startsWith('http')) {
              return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/notes/${this.filename}/${url}`;
            }
            return url;
          }
        },
        upload: {
          accept: 'image/*',
          handler: async (files) => {
            const file = files[0];
            const reader = new FileReader();
            
            return new Promise((resolve, reject) => {
              reader.onload = async (e) => {
                try {
                  const base64Content = e.target.result.split(',')[1];
                  const timestamp = Date.now();
                  
                  // Get the note directory name
                  let noteDir;
                  if (this.isNew) {
                    const noteName = prompt('Enter note name first', 'note');
                    if (!noteName) {
                      reject(new Error('Note name is required'));
                      return;
                    }
                    noteDir = `notes/${noteName}`;
                  } else {
                    // For existing notes, use the current filename (which is the note name)
                    noteDir = `notes/${this.filename}`;
                  }
                  
                  // Sanitize the filename to remove any invalid characters
                  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                  const imageFilename = `${timestamp}-${sanitizedFilename}`;
                  const imagePath = `${noteDir}/${imageFilename}`;
                  
                  await saveFile(this.owner, this.repo, imagePath, base64Content, null, `Upload image: ${sanitizedFilename}`);
                  
                  // Get the raw GitHub URL for the image
                  const imageUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${imagePath}`;
                  
                  // Return the markdown image syntax with the full URL for WYSIWYG display
                  resolve(`![${sanitizedFilename}](${imageUrl})`);
                } catch (error) {
                  console.error('Error uploading image:', error);
                  reject(error);
                }
              };
              reader.readAsDataURL(file);
            });
          }
        }
      });
    },
    methods: {
      async save() {
        if (!this.vditor) {
          alert('Editor is not ready yet. Please wait a moment and try again.');
          return;
        }
        const content = this.vditor.getValue();
        if (this.isNew) {
          const noteName = prompt('Enter note name (this will create a directory)', 'note');
          if (!noteName) return;
          
          // Sanitize the note name
          const sanitizedNoteName = noteName.replace(/[^a-zA-Z0-9-]/g, '_');
          
          // Create the note directory structure
          const noteDir = `notes/${sanitizedNoteName}`;
          const notePath = `${noteDir}/markdown.md`;
          
          try {
            // Save the markdown file
            await saveFile(this.owner, this.repo, notePath, content);
            this.isNew = false;
            this.$router.push(`/edit/${sanitizedNoteName}`);
          } catch (error) {
            alert('Error saving new note: ' + error.message);
          }
        } else {
          // Sanitize the note name if needed
          const sanitizedNoteName = this.filename.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`;
          const notePath = `${noteDir}/markdown.md`;
          try {
            await saveFile(this.owner, this.repo, notePath, content, this.sha);
            const { sha } = await getFileContent(this.owner, this.repo, notePath);
            this.sha = sha;
            alert('Note saved successfully!');
          } catch (error) {
            alert('Error updating note: ' + error.message);
          }
        }
      },
      changeMode() {
        this.vditor.setMode(this.mode);
      },
    },
  };
  </script>