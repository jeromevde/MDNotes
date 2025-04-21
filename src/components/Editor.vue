<template>
  <div class="editor-container">
    <h2>{{ isNew ? 'New Note' : 'Edit Note' }}</h2>
    <div class="editor-layout">
      <div class="editor-section">
        <MonacoEditor
          v-if="isEditorReady"
          class="editor"
          v-model="content"
          language="markdown"
          theme="vs"
          :options="editorOptions"
          @change="onEditorChange"
        />
      </div>
      <div class="preview-section">
        <div class="preview-header">
          <span>Preview</span>
        </div>
        <div class="preview" v-html="renderedContent"></div>
      </div>
    </div>
    <div class="editor-footer">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import * as monaco from 'monaco-editor';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getFileContent, saveFile, getAuthenticatedUser } from '@/github.js';

export default {
  components: {
    MonacoEditor
  },
  setup() {
    const content = ref('');
    const filename = ref('');
    const sha = ref(null);
    const owner = ref('');
    const repo = ref('');
    const isNew = ref(false);
    const renderedContent = ref('');
    const isEditorReady = ref(false);
    const pendingImages = ref([]);
    const editorRef = ref(null);

    const editorOptions = {
      automaticLayout: true,
      minimap: {
        enabled: false
      },
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      fontSize: 14,
      fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
      theme: 'vs'
    };

    // Update preview content
    const updatePreview = () => {
      const markdown = content.value;
      // Convert relative image paths to GitHub raw URLs
      const processedMarkdown = markdown.replace(
        /!\[(.*?)\]\((\.\/.*?)\)/g,
        (match, alt, path) => `![${alt}](https://raw.githubusercontent.com/${owner.value}/${repo.value}/main/notes/${filename.value}/${path.slice(2)})`
      );
      renderedContent.value = DOMPurify.sanitize(marked(processedMarkdown));
    };

    // Handle editor changes
    const onEditorChange = () => {
      updatePreview();
    };

    // Watch for content changes
    watch(content, () => {
      updatePreview();
    });

    // Handle image upload
    const handleImageUpload = async (file) => {
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64Content = e.target.result;
            const timestamp = Date.now();
            const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const imageFilename = `${timestamp}-${sanitizedFilename}`;
            
            // Store the image data for later upload
            pendingImages.value.push({
              base64Content,
              filename: imageFilename,
              originalName: sanitizedFilename
            });
            
            // Return the markdown with a placeholder
            resolve(`![${sanitizedFilename}](./${imageFilename})`);
          } catch (error) {
            console.error('Error processing image:', error);
            reject(error);
          }
        };
        reader.readAsDataURL(file);
      });
    };

    // Set up drag and drop for images
    const setupDragAndDrop = () => {
      const editorElement = document.querySelector('.editor');
      if (!editorElement) return;

      editorElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });

      editorElement.addEventListener('drop', async (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          try {
            const markdown = await handleImageUpload(files[0]);
            // Insert the markdown at the current cursor position or at the end
            if (editorRef.value) {
              const model = editorRef.value.getModel();
              const position = model.getPosition();
              const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
              model.applyEdits([{ range, text: `\n${markdown}\n` }]);
            } else {
              content.value += `\n${markdown}\n`;
            }
          } catch (error) {
            console.error('Error handling image drop:', error);
            alert('Error processing image: ' + error.message);
          }
        }
      });
    };

    // Save the current content
    const save = async () => {
      try {
        // First, upload any pending images
        for (const image of pendingImages.value) {
          const noteDir = `notes/${filename.value}`;
          const imagePath = `${noteDir}/${image.filename}`;
          await saveFile(owner.value, repo.value, imagePath, image.base64Content, null, `Upload image: ${image.originalName}`);
        }
        // Clear pending images after upload
        pendingImages.value = [];

        if (isNew.value) {
          const noteName = prompt('Enter note name (this will create a directory)', 'note');
          if (!noteName) return;
          
          const sanitizedNoteName = noteName.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`;
          const notePath = `${noteDir}/markdown.md`;
          
          await saveFile(owner.value, repo.value, notePath, content.value);
          isNew.value = false;
          window.location.href = `/edit/${sanitizedNoteName}`;
        } else {
          const sanitizedNoteName = filename.value.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`;
          const notePath = `${noteDir}/markdown.md`;
          await saveFile(owner.value, repo.value, notePath, content.value, sha.value);
          const { sha: newSha } = await getFileContent(owner.value, repo.value, notePath);
          sha.value = newSha;
          alert('Note saved successfully!');
        }
      } catch (error) {
        console.error('Error saving:', error);
        alert('Error saving: ' + error.message);
      }
    };

    onMounted(async () => {
      repo.value = localStorage.getItem('github_repo');
      if (!repo.value || !localStorage.getItem('github_token')) {
        window.location.href = '/settings';
        return;
      }
      const user = await getAuthenticatedUser();
      owner.value = user.login;

      if (window.location.pathname !== '/new') {
        filename.value = window.location.pathname.split('/').pop();
        try {
          const notePath = `notes/${filename.value}/markdown.md`;
          const { content: fileContent, sha: fileSha } = await getFileContent(owner.value, repo.value, notePath);
          
          // Set content and show editor
          content.value = fileContent;
          sha.value = fileSha;
          isEditorReady.value = true;
          
          // Wait for the next tick to ensure the editor is mounted
          await nextTick();
          updatePreview();
          setupDragAndDrop();
        } catch (error) {
          console.error(error);
          alert('Error loading file: ' + error.message);
        }
      } else {
        isNew.value = true;
        content.value = '# New Note\n\nStart writing your note here...';
        isEditorReady.value = true;
        
        // Wait for the next tick to ensure the editor is mounted
        await nextTick();
        updatePreview();
        setupDragAndDrop();
      }
    });

    return {
      content,
      save,
      renderedContent,
      isNew,
      editorOptions,
      onEditorChange,
      isEditorReady,
      editorRef
    };
  }
};
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
}

.editor-layout {
  display: flex;
  flex: 1;
  gap: 1rem;
  margin: 1rem 0;
  min-height: 0;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid #ccc;
  background: white;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.preview {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.editor {
  flex: 1;
  border: 1px solid #ccc;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 0;
}

button {
  padding: 0.5rem 1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}
</style>