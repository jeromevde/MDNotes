<template>
  <div class="editor-container">
    <h2>{{ isNew ? 'New Note' : 'Edit Note' }}</h2>
    <div class="editor-layout">
      <div class="editor-section">
        <QuillEditor
          v-model:content="content"
          contentType="html"
          theme="snow"
          toolbar="full"
          :options="editorOptions"
          @update:content="onEditorChange"
        />
      </div>
    </div>
    <div class="editor-footer">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import 'quill/dist/quill.snow.css';
import { getFileContent, saveFile, getAuthenticatedUser } from '@/github.js';

export default {
  name: 'Editor',
  components: {
    QuillEditor
  },
  setup() {
    const content = ref('');
    const filename = ref('');
    const sha = ref(null);
    const owner = ref('');
    const repo = ref('');
    const isNew = ref(false);

    const editorOptions = {
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'header': 1 }, { 'header': 2 }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'direction': 'rtl' }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'font': [] }],
          [{ 'align': [] }],
          ['clean'],
          ['link', 'image']
        ]
      },
      placeholder: 'Start writing your note here...',
      theme: 'snow'
    };

    const onEditorChange = (html) => {
      content.value = html;
    };

    const save = async () => {
      try {
        if (isNew.value) {
          const noteName = prompt('Enter note name (this will create a directory)', 'note');
          if (!noteName) return;
          
          const sanitizedNoteName = noteName.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`.replace(/\/+/g, '/');
          const notePath = `${noteDir}/markdown.md`.replace(/\/+/g, '/');
          
          await saveFile(owner.value, repo.value, notePath, content.value);
          isNew.value = false;
          window.location.href = `/edit/${sanitizedNoteName}`;
        } else {
          const sanitizedNoteName = filename.value.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`.replace(/\/+/g, '/');
          const notePath = `${noteDir}/markdown.md`.replace(/\/+/g, '/');
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
          
          content.value = fileContent;
          sha.value = fileSha;
        } catch (error) {
          console.error(error);
          alert('Error loading file: ' + error.message);
        }
      } else {
        isNew.value = true;
        content.value = '<h1>New Note</h1><p>Start writing your note here...</p>';
      }
    });

    return {
      content,
      save,
      isNew,
      editorOptions,
      onEditorChange
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
  margin: 1rem 0;
  min-height: 0;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
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

:deep(.ql-container) {
  flex: 1;
  font-size: 16px;
  min-height: 200px;
}

:deep(.ql-editor) {
  min-height: 100%;
  padding: 1rem;
}

:deep(.ql-toolbar) {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

:deep(.ql-container) {
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
</style>