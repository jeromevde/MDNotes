export class Tags{
  constructor(state){
    this.state = state;
    this.activeTag = null;
  }
  getAllTags(){
    const ix = this.state.searchIndex;
    if (!ix || !ix.tags) return new Set();
    return new Set(Object.keys(ix.tags));
  }
  getTagsForFile(path){
    const ix = this.state.searchIndex;
    if (!ix || !ix.fileTags) return [];
    return ix.fileTags[path] || [];
  }
  fileHasTag(path){
    if (!this.activeTag) return true;
    return this.getTagsForFile(path).includes(this.activeTag);
  }
  toggleActiveTag(tag){
    this.activeTag = this.activeTag === tag ? null : tag;
  }
}
