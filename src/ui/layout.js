export function renderLayout(root){
  root.innerHTML = `
    <div class="app-shell">
      <div class="header">
        <strong>MDNotes</strong>
        <input id="search" type="search" placeholder="Search notes…" />
        <span class="spacer"></span>
        <span id="status" class="status"></span>
  <button id="btn-settings" title="Configure GitHub connection">Settings</button>
      </div>

      <aside class="sidebar">
        <div class="explorer-toolbar">
          <button id="btn-new">New</button>
          <button id="btn-del">Delete</button>
          <button id="btn-refresh">Refresh</button>
        </div>
        <div id="tag-filter" class="tag-filter"></div>
        <ul id="file-tree" class="file-tree"></ul>
      </aside>

      <section class="main">
        <div class="editor-toolbar">
          <select id="mode">
            <option value="edit">Split</option>
            <option value="preview">Preview</option>
            <option value="source">Source</option>
          </select>
          <span id="path-label" class="status"></span>
          <span class="spacer"></span>
          <select id="branch"></select>
          <button id="btn-save" class="primary">Save</button>
        </div>
        <div class="split">
          <div class="editor"><textarea id="editor" placeholder="# Start writing…"></textarea></div>
          <div id="preview" class="preview"></div>
        </div>
      </section>

      <footer class="header">
        <span>State is saved locally. Paste images into editor; they upload on save.</span>
      </footer>
    </div>
    <div id="settings-overlay" class="modal-overlay hidden">
      <div id="settings-modal" class="modal-panel">
        <h3 style="margin-top:0">GitHub Settings</h3>
        <div class="modal-grid">
          <label>Owner <input id="cfg-owner" placeholder="octocat" /></label>
          <label>Repo <input id="cfg-repo" placeholder="notes" /></label>
          <label>Branch <input id="cfg-branch" placeholder="main" /></label>
          <label>Token <input id="cfg-token" type="password" placeholder="ghp_..." /></label>
          <label class="row" style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem"><input type="checkbox" id="cfg-remember" /> Remember token on this device</label>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
          <button id="cfg-cancel">Cancel</button>
          <button id="cfg-save" class="primary">Save</button>
        </div>
        <p class="status" style="margin-bottom:0">Tip: create a fine-grained PAT with contents:read/write.</p>
      </div>
    </div>
  `;
}
