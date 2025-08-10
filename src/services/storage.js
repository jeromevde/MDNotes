// Very small localStorage wrapper
const SESSION_KEY = 'mdnotes/session/v1';

export const Storage = {
  loadSession(){
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  saveSession(state, opts = {}){
    const minimal = {
      repo: state.repo,
      token: opts.includeToken ? state.token || null : null, // persist only when requested (local only)
      // If you want to persist token locally, change this logic or use browser session storage securely.
      activePath: state.activePath,
      content: state.content,
      tags: Array.from(state.tags || []),
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(minimal)); } catch {}
  }
};
