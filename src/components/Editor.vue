<template>
  <div class="editor-container">
    <h2>{{ isNew ? 'New Note' : 'Edit Note' }}</h2>
    <div class="editor-layout">
      <div class="editor-section">
        <div class="tiptap-toolbar" v-if="editor">
          <button @click="editor.chain().focus().toggleBold().run()" :class="{ active: editor.isActive('bold') }" title="Bold"><b>B</b></button>
          <button @click="editor.chain().focus().toggleItalic().run()" :class="{ active: editor.isActive('italic') }" title="Italic"><i>I</i></button>
          <button @click="editor.chain().focus().toggleStrike().run()" :class="{ active: editor.isActive('strike') }" title="Strike"><s>S</s></button>
          <button @click="editor.chain().focus().toggleCode().run()" :class="{ active: editor.isActive('code') }" title="Code">&lt;/&gt;</button>
          <button @click="editor.chain().focus().setLink({ href: prompt('URL:') }).run()" :class="{ active: editor.isActive('link') }" title="Link">🔗</button>
          <div class="dropdown" @mouseleave="showImageDropdown = false">
            <button @click.prevent="showImageDropdown = !showImageDropdown" title="Insert Image">🖼️</button>
            <div v-if="showImageDropdown" class="dropdown-content">
              <input type="file" accept="image/*" @change="onImageSelected" />
            </div>
          </div>
          <span class="divider"></span>
          <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ active: editor.isActive('heading', { level: 1 }) }" title="Heading 1">H1</button>
          <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ active: editor.isActive('heading', { level: 2 }) }" title="Heading 2">H2</button>
          <button @click="editor.chain().focus().setParagraph().run()" :class="{ active: editor.isActive('paragraph') }" title="Paragraph">¶</button>
          <span class="divider"></span>
          <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ active: editor.isActive('bulletList') }" title="Bullet List">• List</button>
          <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ active: editor.isActive('orderedList') }" title="Ordered List">1. List</button>
          <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ active: editor.isActive('codeBlock') }" title="Code Block">[code]</button>
          <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ active: editor.isActive('blockquote') }" title="Blockquote">""</button>
          <span class="divider"></span>
          <button @click="editor.chain().focus().setHorizontalRule().run()" title="Horizontal Rule">―</button>
          <span class="divider"></span>
          <button @click="editor.chain().focus().undo().run()" title="Undo">⟲</button>
          <button @click="editor.chain().focus().redo().run()" title="Redo">⟳</button>
        </div>
        <editor-content :editor="editor" class="editor" />
      </div>
    </div>
    <div class="editor-footer">
      <button @click="save">Save</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { getFileContent, saveFile, getAuthenticatedUser, fetchGithubImageBlob, deleteFile, getOctokit } from '@/github.js';

export default {
  name: 'Editor',
  components: {
    EditorContent
  },
  setup() {
    const content = ref('');
    const filename = ref('');
    const sha = ref(null);
    const owner = ref('');
    const repo = ref('');
    const isNew = ref(false);
    const editor = ref(null);
    const showImageDropdown = ref(false);

    const initEditor = () => {
      if (editor.value) {
        editor.value.destroy();
      }
      editor.value = new Editor({
        content: content.value,
        extensions: [
          StarterKit,
          Link,
          Image
        ],
        onUpdate: async ({ editor }) => {
          content.value = editor.getHTML();
          await replaceImagesWithGithubBlobs();
        }
      });
    };

    const onImageSelected = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        editor.value.chain().focus().setImage({ src: e.target.result }).run();
        showImageDropdown.value = false;
      };
      reader.readAsDataURL(file);
    };

    const getGithubImageUrl = (src) => {
      if (src.startsWith('./')) {
        const imageName = src.replace('./', '');
        const noteName = filename.value;
        return `https://raw.githubusercontent.com/${owner.value}/${repo.value}/main/notes/${noteName}/${imageName}`;
      }
      return src;
    };

    const convertMarkdownImagesToGithubUrls = (markdown) => {
      // Replace ![](./filename.png) with <img src="https://raw.githubusercontent...">
      return markdown.replace(/!\[(.*?)\]\((\.\/[^)]+)\)/g, (match, alt, src) => {
        const url = getGithubImageUrl(src);
        return `<img src="${url}" alt="${alt}" />`;
      });
    };

    const replaceImagesWithGithubBlobs = async () => {
      await nextTick();
      if (!editor.value) return;
      // Get all image nodes in the document
      const { state, view } = editor.value;
      const tr = state.tr;
      let changed = false;
      state.doc.descendants(async (node, pos) => {
        if (node.type.name === 'image') {
          const src = node.attrs.src;
          if (src && (src.startsWith('https://raw.githubusercontent.com') || src.startsWith('./'))) {
            let imagePath = '';
            if (src.startsWith('https://raw.githubusercontent.com')) {
              const parts = src.split('/');
              const mainIdx = parts.findIndex(p => p === 'main');
              if (mainIdx !== -1) {
                imagePath = parts.slice(mainIdx + 1).join('/');
              }
            } else if (src.startsWith('./')) {
              const noteName = filename.value;
              imagePath = `notes/${noteName}/${src.replace('./', '')}`;
            }
            if (imagePath) {
              try {
                const blob = await fetchGithubImageBlob(owner.value, repo.value, imagePath);
                const blobUrl = URL.createObjectURL(blob);
                // Update the image node's src attribute in the editor
                editor.value.commands.command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    src: blobUrl
                  });
                  return true;
                });
                changed = true;
              } catch (e) {
                console.error('Failed to fetch image from GitHub:', imagePath, e);
              }
            }
          }
        }
      });
      // If any changes, force a re-render
      if (changed) {
        view.updateState(state.apply(tr));
      }
    };

    // Clean up unused images in the note's folder
    const cleanupUnusedImages = async () => {
      if (!owner.value || !repo.value || !filename.value) return;
      const noteDir = `notes/${filename.value}`;
      // 1. Get all files in the note's folder
      let files = [];
      try {
        const octokit = getOctokit();
        const response = await octokit.repos.getContent({
          owner: owner.value,
          repo: repo.value,
          path: noteDir
        });
        files = Array.isArray(response.data) ? response.data : [];
      } catch (e) {
        // Folder may not exist, nothing to clean
        return;
      }
      // 2. Get all image filenames referenced in the current content
      const usedImages = new Set();
      // Find all ./image.png references in the HTML content
      const regex = /<img[^>]+src=["']\.\/(.*?\.(png|jpg|jpeg|gif))["']/gi;
      let match;
      while ((match = regex.exec(content.value))) {
        usedImages.add(match[1]);
      }
      // 3. For each file in the folder, if it's an image and not used, delete it
      for (const file of files) {
        if (file.type === 'file' && /\.(png|jpg|jpeg|gif)$/i.test(file.name) && !usedImages.has(file.name)) {
          try {
            await deleteFile(owner.value, repo.value, file.path, file.sha);
            console.log('Deleted unused image:', file.path);
          } catch (e) {
            console.error('Failed to delete image:', file.path, e);
          }
        }
      }
    };

    const save = async () => {
      try {
        let updatedContent = content.value;
        // For new notes, get the note name from the prompt or filename
        let noteName = filename.value;
        if (isNew.value && !noteName) {
          noteName = prompt('Enter note name (this will create a directory)', 'note') || 'note';
        }
        // Find all base64 images in the content (robust regex, alt optional)
        const base64Images = [...updatedContent.matchAll(/<img[^>]+src=["'](data:image\/(png|jpeg|jpg|gif);base64,[^"']+)["'][^>]*>/gi)];
        for (const match of base64Images) {
          const base64 = match[1];
          // Generate a unique filename
          const extMatch = base64.match(/^data:image\/(png|jpeg|jpg|gif)/);
          const ext = extMatch ? extMatch[1] : 'png';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const noteDir = `notes/${noteName}`.replace(/\/+/g, '/');
          const imagePath = `${noteDir}/${fileName}`.replace(/\/+/g, '/');
          // Debug log
          console.log('Uploading image to:', imagePath);
          // Upload the image to GitHub
          await saveFile(owner.value, repo.value, imagePath, base64);
          // Replace ALL occurrences of this base64 string with the local path
          updatedContent = updatedContent.split(base64).join(`./${fileName}`);
        }
        // Save the updated content
        if (isNew.value) {
          if (!noteName) {
            noteName = prompt('Enter note name (this will create a directory)', 'note');
            if (!noteName) return;
          }
          const sanitizedNoteName = noteName.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`.replace(/\/+/g, '/');
          const notePath = `${noteDir}/markdown.md`.replace(/\/+/g, '/');
          await saveFile(owner.value, repo.value, notePath, updatedContent);
          isNew.value = false;
          await cleanupUnusedImages();
          window.location.href = `/edit/${sanitizedNoteName}`;
        } else {
          const sanitizedNoteName = filename.value.replace(/[^a-zA-Z0-9-]/g, '_');
          const noteDir = `notes/${sanitizedNoteName}`.replace(/\/+/g, '/');
          const notePath = `${noteDir}/markdown.md`.replace(/\/+/g, '/');
          await saveFile(owner.value, repo.value, notePath, updatedContent, sha.value);
          const { sha: newSha } = await getFileContent(owner.value, repo.value, notePath);
          sha.value = newSha;
          await cleanupUnusedImages();
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
          // Convert markdown images to HTML <img> tags with GitHub URLs
          content.value = convertMarkdownImagesToGithubUrls(fileContent);
          sha.value = fileSha;
          await nextTick();
          initEditor();
          await replaceImagesWithGithubBlobs();
        } catch (error) {
          console.error(error);
          alert('Error loading file: ' + error.message);
        }
      } else {
        isNew.value = true;
        content.value = '<h1>New Note</h1><p>Start writing your note here...</p>';
        await nextTick();
        initEditor();
      }
    });

    onUnmounted(() => {
      if (editor.value) {
        editor.value.destroy();
      }
    });

    return {
      content,
      save,
      isNew,
      editor,
      showImageDropdown,
      onImageSelected
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

.tiptap-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #ccc;
  border-bottom: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-bottom: 0;
}
.tiptap-toolbar button {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  color: #000;
}
.tiptap-toolbar button.active {
  background: #e0e0e0;
  color: #000;
}
.tiptap-toolbar .divider {
  width: 1px;
  height: 1.5em;
  background: #ccc;
  margin: 0 0.5rem;
  display: inline-block;
}
.tiptap-toolbar .dropdown {
  position: relative;
  display: inline-block;
}
.tiptap-toolbar .dropdown-content {
  display: block;
  position: absolute;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  top: 2.2em;
  left: 0;
  z-index: 10;
}
.tiptap-toolbar .dropdown-content input[type="file"] {
  display: block;
}
.editor {
  flex: 1;
  border: 1px solid #ccc;
  border-top: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  background: #fff;
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
:deep(.ProseMirror) {
  outline: none;
  min-height: 100%;
}
:deep(.ProseMirror p) {
  margin: 0.5em 0;
}
:deep(.ProseMirror h1) {
  font-size: 2em;
  margin: 0.5em 0;
}
:deep(.ProseMirror h2) {
  font-size: 1.5em;
  margin: 0.5em 0;
}
:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5em;
}
:deep(.ProseMirror code) {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
:deep(.ProseMirror pre) {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  margin: 0.5em 0;
}
:deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
}
</style>