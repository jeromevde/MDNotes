export class Search{
  constructor(state, github){
    this.state = state;
    this.github = github;
  }

  async maybeLoadReverseIndex(){
    // optional file at .search/index.json
    try{
      const has = Array.isArray(this.state.files) && this.state.files.some(f => f.path === '.search/index.json');
      if (!has) { this.state.searchIndex = null; return; }
      const { content } = await this.github.getFile('.search/index.json');
      this.state.searchIndex = JSON.parse(content);
    }catch{ this.state.searchIndex = null; }
  }

  filterFiles(files, q){
    // Prefer reverse index if available
    if (this.state.searchIndex){
      const idx = this.state.searchIndex;
      const paths = new Set();
      const tokens = q.split(/\s+/).filter(Boolean);
      for (const t of tokens){
        const hit = idx.tokens?.[t] || [];
        for (const p of hit) paths.add(p);
      }
      return files.filter(f=> paths.has(f.path) || f.path.toLowerCase().includes(q));
    }
    // fallback: filter by name only (no content without fetching all)
    return files.filter(f => f.path.toLowerCase().includes(q));
  }
}
