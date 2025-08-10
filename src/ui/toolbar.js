export function initToolbar(ui, state, onModeChange, onSave){
  ui.toolbar.mode.addEventListener('change', onModeChange);
  ui.toolbar.save.addEventListener('click', onSave);
}
