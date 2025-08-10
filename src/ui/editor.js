export function initEditor(ui, state, onChange, imagePaste){
  const ta = ui.editor.textarea;
  ta.addEventListener('input', () => onChange(ta.value));

  // handle tabs
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab'){
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.setRangeText('  ', start, end, 'end');
      onChange(ta.value);
    }
  });

  // image paste
  ta.addEventListener('paste', (e) => imagePaste.handlePaste(e, (placeholder) => {
    insertAtCursor(ta, placeholder);
    onChange(ta.value);
  }));
}

function insertAtCursor(ta, text){
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.setRangeText(text, start, end, 'end');
}
