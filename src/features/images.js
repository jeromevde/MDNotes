// Handles pasted images by inserting a placeholder like ![alt](.images/paste-<timestamp>.png)
// The actual upload is deferred to save: the content is already in the editor; you can resolve files to be uploaded here if needed.

export class ImagePaste{
  constructor(state){
    this.state = state;
    this.pending = []; // { name, blob }
  }

  handlePaste(e, insert){
    if (!e.clipboardData) return;
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const blob = item.getAsFile();
    const ext = blob.type.includes('png') ? 'png' : (blob.type.includes('jpeg') ? 'jpg' : 'png');
    const name = `.images/paste-${Date.now()}.${ext}`;
    this.pending.push({ name, blob });
    insert(`![pasted image](${name})`);
  }
}
