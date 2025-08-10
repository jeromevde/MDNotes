export async function initFileExplorer(ui, state, github, onSelectFile, onNewFile, onDeleteFile, tagsFeature){
  ui.sidebar.newBtn.addEventListener('click', onNewFile);
  ui.sidebar.delBtn.addEventListener('click', onDeleteFile);

  // tag filter rendering
  function renderTags(){
    const container = ui.sidebar.tagFilter;
    container.innerHTML = '';
    const allTags = Array.from(tagsFeature.getAllTags()).sort();
    const mk = (tag) => {
      const b = document.createElement('button');
      b.className = 'tag';
      b.textContent = `#${tag}`;
      if (tagsFeature.activeTag === tag) b.style.outline = '2px solid var(--accent)';
      b.addEventListener('click', () => { tagsFeature.toggleActiveTag(tag); renderTags(); });
      return b;
    };
    if (allTags.length){
      container.append(...allTags.map(mk));
    }
  }

  // Load branches for info only
  try {
    const branches = await github.listBranches();
    const sel = document.querySelector('#branch');
    sel.innerHTML = branches.map(b=>`<option ${state.repo?.branch===b? 'selected':''}>${b}</option>`).join('');
  } catch {}

  renderTags();
}
