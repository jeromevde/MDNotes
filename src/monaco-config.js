import * as monaco from 'monaco-editor';

// Configure Monaco Editor
window.MonacoEnvironment = {
  getWorker: function () {
    return {
      postMessage: function () {},
      terminate: function () {}
    };
  }
};

// Set up markdown language support
const markdownTokenProvider = {
  defaultToken: '',
  tokenizer: {
    root: [
      [/^#.*$/, 'heading'],
      [/^\s*[-*]\s.*$/, 'list'],
      [/^\s*\d+\.\s.*$/, 'list'],
      [/`{3}.*$/, 'code'],
      [/`[^`]*`/, 'code'],
      [/\[.*?\]\(.*?\)/, 'link'],
      [/[*_]{1,2}.*?[*_]{1,2}/, 'emphasis'],
      [/~~.*?~~/, 'strikethrough'],
    ]
  }
};

monaco.languages.register({ id: 'markdown' });
monaco.languages.setMonarchTokensProvider('markdown', markdownTokenProvider);

export default monaco; 