/** Where finished export files go. The export service depends on this, not on the DOM. */
export interface FileSaver {
  save(blob: Blob, filename: string): void;
}

/** Saves through the browser's download mechanism (a temporary `<a download>` link). */
export const browserFileSaver: FileSaver = {
  save(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on the next tick so the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};
