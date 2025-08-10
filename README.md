# MDNotes

The aim of this project is to provide a web based note taking app compatible with both browsers and mobile devices. It should be frontend only, javascript and html based, and connect to a github repo with an api key to store the files.

It is composed to the left of a file-explorer of the repo it is connected to.

On the right of that there is a text editor similar to vscode markdown editor where you an switch between markdown and preview mode.

it should support copy-paste of images, and the image should only be uploaded to the repo when the note is saved. So there needs to be a save button, and the user should be notified if he quits without saving. Or it would be even better if the app could save after some time of inactivity or when the page comes out of focus automatically.

There should be a search function to find notes by title or content, and a way to create new notes or delete existing ones.

It might be a good idea to contruct a reverse index in the github action on every push to the repo, so that the search function can be fast and efficient. The reverse index should be stored in a separate file in the repo.

Another thing, it would be nice to have a way to tag notes, so that they can be grouped together. The tags should be stored in the reverse index file, and the user should be able to filter notes by tags.

Simplicity should be key, the app should rely on the browser's local storage to store the current state of the app, so that it can be restored when the user comes back to the app

Simplicity is key, so use as few packages as possible, and try to use only vanilla javascript and html. If you need to use a package, make sure it is lightweight and does not add too much bloat to the app.

## Usage

1. Open index.html in a browser.
2. Click Settings and provide GitHub owner, repo, branch (default main) and a Personal Access Token with contents read/write.
3. Use New to create a note, type in the editor. Paste images directly; they will be referenced and uploaded on Save into an assets/ folder next to the note.
4. Toggle Split/Preview/Source to change the layout; notes are auto-saved on inactivity and when the tab loses focus.
5. Search filters by filename locally and by contents if the reverse index exists.
6. Tags: add YAML front matter to your notes, for example:

---
tags: [work, ideas]
---

The GitHub Action builds a reverse index at .search/index.json on every push to main. Tag filtering and fast search use this file when present.