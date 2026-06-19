import * as monaco from 'monaco-editor';

const editors: monaco.editor.IStandaloneCodeEditor[] = [];
let active: monaco.editor.IStandaloneCodeEditor | null = null;

export function registerEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  editors.push(editor);
}

export function unregisterEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  const idx = editors.indexOf(editor);
  if (idx !== -1) editors.splice(idx, 1);
  if (active === editor) active = null;
}

export function setActiveEditor(editor: monaco.editor.IStandaloneCodeEditor | null) {
  active = editor;
}

export function getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null {
  if (active && active.getContainerDomNode().isConnected) {
    return active;
  }
  // fall back to the last registered editor that's still connected
  for (let i = editors.length - 1; i >= 0; i--) {
    if (editors[i].getContainerDomNode().isConnected) {
      active = editors[i];
      return active;
    }
  }
  return null;
}
