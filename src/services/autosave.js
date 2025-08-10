export class Autosave{
  constructor(getState, onSave){
    this.getState = getState;
    this.onSave = onSave;
    this.timer = null;
    this.bind();
  }
  bind(){
    const schedule = () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.onSave().catch(()=>{}), 2500);
    };
    window.addEventListener('input', schedule, true);
    window.addEventListener('focusout', schedule, true);
  }
}
