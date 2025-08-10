export function initPreview(ui, state, mdToHtml){
  const render = () => ui.preview.innerHTML = mdToHtml(state.content || '');
  ui.editor.textarea.addEventListener('input', render);
  render();
}
