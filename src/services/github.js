// Minimal GitHub content API client using fetch
// Requires a Personal Access Token with repo scope (classic) or fine-grained access.

const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s) => decodeURIComponent(escape(atob(s)));

export class GitHub{
  constructor(getToken, getRepo){
    this.getToken = getToken;
    this.getRepo = getRepo;
  }

  _headers(){
    const token = this.getToken();
    const h = { 'Accept': 'application/vnd.github+json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  _repoPath(path=''){
    const repo = this.getRepo();
    if (!repo) throw new Error('Repo not configured');
    const branch = repo.branch || 'main';
    return { owner: repo.owner, repo: repo.name, branch, path };
  }

  async listBranches(){
    const { owner, repo } = this._repoPath();
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers: this._headers() });
    if (!res.ok) throw new Error('GitHub branches failed');
    const data = await res.json();
    return data.map(b => b.name);
  }

  async listRepoTree(){
    const { owner, repo, branch } = this._repoPath();
    // Get the SHA for the branch head
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: this._headers() });
    if (!res.ok) throw new Error('GitHub tree failed');
    const data = await res.json();
    return data.tree; // [{ path, type, sha, size }]
  }

  async getFile(path){
    const { owner, repo, branch } = this._repoPath(path);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, { headers: this._headers() });
    if (!res.ok) throw new Error('GitHub get file failed');
    const data = await res.json();
    const content = data.content ? unb64(data.content.replace(/\n/g, '')) : '';
    return { content, sha: data.sha };
  }

  async upsertFile(path, content, sha, message, isBase64 = false){
    const { owner, repo, branch } = this._repoPath(path);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: isBase64 ? content : (typeof content === 'string' ? b64(content) : content),
        branch,
        sha: sha || undefined,
      })
    });
    if (!res.ok) throw new Error('GitHub upsert failed');
    return await res.json();
  }

  async deleteFile(path, sha, message){
    const { owner, repo, branch } = this._repoPath(path);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha, branch })
    });
    if (!res.ok) throw new Error('GitHub delete failed');
    return await res.json();
  }
}
