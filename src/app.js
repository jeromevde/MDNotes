import { renderLayout } from './ui/layout.js';
import { initFileExplorer } from './ui/fileExplorer.js';
import { initEditor } from './ui/editor.js';
import { initPreview } from './ui/preview.js';
import { initToolbar } from './ui/toolbar.js';
import { Storage } from './services/storage.js';
import { GitHub } from './services/github.js';
import { Autosave } from './services/autosave.js';
import { Search } from './features/search.js';
import { Tags } from './features/tags.js';
import { ImagePaste } from './features/images.js';
import { mdToHtml } from './utils/markdown.js';

// App state (kept minimal and persisted via localStorage)
const state = {
  repo: null, // { owner, name, branch }
  token: null,
  files: [], // { path, sha, type }
  activePath: null,
  content: '', // editor content
  dirty: false,
  tags: new Set(),
  searchIndex: null, // optional downloaded reverse index
};

function showToast(msg, kind = 'ok', timeout = 2500) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('ok', 'err');
  el.classList.add(kind);
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), timeout);
}

async function bootstrap() {
  const root = document.getElementById('app');
  renderLayout(root);

  // Restore saved session
  const saved = Storage.loadSession();
  if (saved) Object.assign(state, saved);

  const ui = {
    header: {
      search: document.querySelector('#search'),
      status: document.querySelector('#status')
    },
    sidebar: {
      list: document.querySelector('#file-tree'),
      newBtn: document.querySelector('#btn-new'),
      delBtn: document.querySelector('#btn-del'),
      refreshBtn: document.querySelector('#btn-refresh'),
      tagFilter: document.querySelector('#tag-filter')
    },
    editor: {
      textarea: document.querySelector('#editor'),
    },
    preview: document.querySelector('#preview'),
    toolbar: {
      save: document.querySelector('#btn-save'),
      mode: document.querySelector('#mode'),
      branch: document.querySelector('#branch'),
      pathLabel: document.querySelector('#path-label'),
    }
  };

  // Settings modal refs
  const settings = {
    overlay: document.querySelector('#settings-overlay'),
    modal: document.querySelector('#settings-modal'),
    owner: document.querySelector('#cfg-owner'),
    repo: document.querySelector('#cfg-repo'),
    branch: document.querySelector('#cfg-branch'),
    token: document.querySelector('#cfg-token'),
  remember: document.querySelector('#cfg-remember'),
    save: document.querySelector('#cfg-save'),
    cancel: document.querySelector('#cfg-cancel'),
    openBtn: document.querySelector('#btn-settings'),
  };

  const applyStateToSettings = () => {
    settings.owner.value = state.repo?.owner || '';
    settings.repo.value = state.repo?.name || '';
    settings.branch.value = state.repo?.branch || 'main';
    settings.token.value = state.token || '';
  };
  applyStateToSettings();

  const showSettings = (show) => {
    settings.overlay.classList.toggle('hidden', !show);
    if (show) setTimeout(()=> settings.owner && settings.owner.focus(), 0);
  };
  // robust open handler: direct and delegated
  if (settings.openBtn){
    settings.openBtn.addEventListener('click', () => { applyStateToSettings(); showSettings(true); });
  }
  document.body.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.id === 'btn-settings') { applyStateToSettings(); showSettings(true); }
  });
  // keyboard shortcut: Ctrl+, (like VS Code)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ','){
      e.preventDefault();
      applyStateToSettings(); showSettings(true);
    }
  });
  settings.cancel.addEventListener('click', () => showSettings(false));
  if (settings.overlay){
    settings.overlay.addEventListener('click', (e) => { if (e.target === settings.overlay) showSettings(false); });
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') showSettings(false); });
  settings.save.addEventListener('click', async () => {
    const owner = settings.owner.value.trim();
    const repo = settings.repo.value.trim();
    const branch = (settings.branch.value.trim() || 'main');
    const token = settings.token.value.trim();
    if (!owner || !repo){
      showToast('Please fill Owner and Repo', 'err');
      (owner ? settings.repo : settings.owner).focus();
      return;
    }
    state.repo = { owner, name: repo, branch };
    state.token = token || null;
    Storage.saveSession(state, { includeToken: !!settings.remember.checked });
    showSettings(false);
    showToast('Settings saved');
    if (state.repo && state.token) await refreshFiles(github, ui);
  });

  // URL-based quick config: ?owner=...&repo=...&branch=...&token=...
  const params = new URLSearchParams(location.search);
  if (params.get('owner') && params.get('repo')){
    state.repo = { owner: params.get('owner'), name: params.get('repo'), branch: params.get('branch') || 'main' };
    if (params.get('token')) state.token = params.get('token');
  }

  // First run: prompt settings if not configured
  if (!state.repo || !state.repo.owner || !state.repo.name){
    showSettings(true);
  }

  const github = new GitHub(() => state.token, () => state.repo);
  const search = new Search(state, github);
  const tagFeature = new Tags(state);
  const images = new ImagePaste(state);
  const autosave = new Autosave(() => state, async () => {
    if (state.dirty && state.activePath) await saveNote(github, ui);
  });

  initToolbar(ui, state, onModeChange, onSave);
  initEditor(ui, state, onContentChange, images);
  initPreview(ui, state, mdToHtml);
  await initFileExplorer(ui, state, github, onSelectFile, onNewFile, onDeleteFile, tagFeature);

  // Search wiring
  ui.header.search.addEventListener('input', () => {
    renderFileList();
  });

  ui.sidebar.refreshBtn.addEventListener('click', async () => {
    await refreshFiles(github, ui);
  });

  // Before unload guard
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Visibility change autosave
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden && state.dirty && state.activePath) {
      try { await saveNote(github, ui); } catch {}
    }
  });

  function renderFileList() {
    const q = ui.header.search.value.trim().toLowerCase();
    const tagFilter = tagFeature.activeTag;
    const list = ui.sidebar.list;
    list.innerHTML = '';

    let files = state.files.filter(f => f.type === 'file' && f.path.endsWith('.md'));

    if (tagFilter) {
      files = files.filter(f => tagFeature.fileHasTag(f.path));
    }

    if (q) {
      files = search.filterFiles(files, q);
    }

    for (const f of files) {
      const li = document.createElement('li');
      li.textContent = f.path;
      if (f.path === state.activePath) li.classList.add('active');
      li.addEventListener('click', () => onSelectFile(f.path));
      const meta = document.createElement('span');
      meta.className = 'meta';
      const tags = tagFeature.getTagsForFile(f.path);
      meta.textContent = tags.length ? tags.map(t=>`#${t}`).join(' ') : '';
      li.appendChild(meta);
      list.appendChild(li);
    }
  }

  async function refreshFiles(github, ui){
    ui.header.status.textContent = 'Loading files…';
    try {
      state.files = await github.listRepoTree();
      await search.maybeLoadReverseIndex();
      renderFileList();
      ui.header.status.textContent = `${state.files.length} items`;
    } catch (e) {
      ui.header.status.textContent = 'Load failed';
      showToast('Failed to load repo files', 'err');
      console.error(e);
    }
  }

  async function onSelectFile(path){
    if (state.dirty && !confirm('Discard unsaved changes?')) return;
    ui.header.status.textContent = 'Loading…';
    try {
      const { content, sha } = await github.getFile(path);
      state.activePath = path;
      state.content = content;
      state.dirty = false;
      state.activeSha = sha;
      ui.editor.textarea.value = content;
      ui.toolbar.pathLabel.textContent = path;
      onModeChange();
      showToast('Loaded');
    } catch (e) {
      console.error(e); showToast('Open failed', 'err');
    } finally {
      ui.header.status.textContent = '';
      Storage.saveSession(state);
      renderFileList();
    }
  }

  async function onNewFile(){
    const name = prompt('New note path (e.g. notes/idea.md):');
    if (!name) return;
    if (!name.endsWith('.md')) return alert('Filename must end with .md');
    state.activePath = name;
    state.content = `# ${name.split('/').pop().replace(/\.md$/, '')}\n\n`;
    state.dirty = true;
    ui.editor.textarea.value = state.content;
    ui.toolbar.pathLabel.textContent = name;
    onModeChange();
    renderFileList();
  }

  async function onDeleteFile(){
    if (!state.activePath) return;
    if (!confirm(`Delete ${state.activePath}?`)) return;
    try{
      await github.deleteFile(state.activePath, state.activeSha || undefined, 'Delete note');
      state.activePath = null;
      state.content = '';
      state.dirty = false;
      ui.editor.textarea.value = '';
      ui.toolbar.pathLabel.textContent = '';
      await refreshFiles(github, ui);
      showToast('Deleted');
    }catch(e){
      console.error(e); showToast('Delete failed', 'err');
    }
  }

  function onContentChange(value){
    state.content = value;
    state.dirty = true;
    onModeChange();
    Storage.saveSession(state);
  }

  function onModeChange(){
    const mode = ui.toolbar.mode.value;
    document.querySelector('.split').style.gridTemplateColumns = mode === 'edit' ? '1fr 1fr' : (mode === 'preview' ? '0 1fr' : '1fr 0');
    ui.toolbar.save.classList.toggle('dirty', !!state.dirty);
    ui.preview.innerHTML = mdToHtml(state.content || '');
  ui.toolbar.save.disabled = !state.activePath;
  }

  async function saveNote(github, ui){
    if (!state.activePath) return;
    if (!state.repo || !state.repo.owner || !state.repo.name || !state.token){
      alert('Configure GitHub in Settings first');
      showSettings(true);
      return;
    }
    const msg = prompt('Commit message:', 'Update note');
    if (msg === null) return; // cancelled
    try{
      // Upload pending images first if any, placing them next to the note under assets/
      if (images.pending.length){
        const dir = state.activePath.split('/').slice(0,-1).join('/');
        const replacements = [];
        for (const item of images.pending){
          const path = (dir? dir + '/' : '') + (item.name.startsWith('.images/') ? item.name.replace('.images/','assets/') : 'assets/'+item.name);
          const arrayBuf = await item.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          let binary = '';
          for (let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            await github.upsertFile(path, base64, undefined, 'Add pasted image', true);
          replacements.push({ from: item.name, to: path });
        }
        images.pending.length = 0;
        // Replace placeholders in content
        for (const r of replacements){
          state.content = state.content.split(r.from).join(r.to);
          ui.editor.textarea.value = state.content;
        }
      }
      const res = await github.upsertFile(state.activePath, state.content, state.activeSha || undefined, msg);
      state.activeSha = res.content.sha;
      state.dirty = false;
      Storage.saveSession(state);
      showToast('Saved');
      await refreshFiles(github, ui);
    }catch(e){
      console.error(e); showToast('Save failed', 'err');
    }
  }

  async function onSave(){
    if (!state.activePath){ showToast('Open or create a note first', 'err'); return; }
    await saveNote(github, ui);
  }

  // Ctrl+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
      e.preventDefault();
      onSave();
    }
  });

  // Branch selector
  ui.toolbar.branch.addEventListener('change', async () => {
    if (!state.repo) state.repo = {};
    state.repo.branch = ui.toolbar.branch.value;
    Storage.saveSession(state, { includeToken: true });
    await refreshFiles(github, ui);
  });

  // Initial load
  if (state.repo && state.token) {
    await refreshFiles(github, ui);
  } else {
    showToast('Configure repo and token in the top-right menu');
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
