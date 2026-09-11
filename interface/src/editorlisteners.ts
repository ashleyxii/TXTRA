export function setupEditorListener() {
  document.addEventListener('editor:change', (event) => {
    const detail = (event as CustomEvent).detail;
    const outputElement = document.getElementById('output');
    if (outputElement) {
      outputElement.textContent = detail;
    }
    console.log(detail);
    });
}

setupEditorListener();

export default setupEditorListener;