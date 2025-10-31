/** Trigger download of a given URL.
 *
 * Actual behavior may vary based on the browser's configuration for the mimetype. */
export const downloadURL = (url: string, fileName: string = "") => {
  // Create a temporary anchor element
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.target = "_blank";
  anchorElement.download = fileName;

  // Trigger a click event on the anchor element
  document.body.appendChild(anchorElement);
  anchorElement.click();

  // Cleanup
  document.body.removeChild(anchorElement);
};

/** Trigger download of a Blob / File object.
 *
 * Actual behavior may vary based on the browser's configuration for the mimetype. */
export const downloadBlob = (file: Blob, fileName: string = "") => {
  const url = URL.createObjectURL(file);

  downloadURL(url, fileName);

  URL.revokeObjectURL(url);
};

/** Trigger a URL to open in a new tab.
 *
 * Actual behavior may vary based on the browser's configuration for the mimetype. */
export const openInNewTab = (url: string) => {
  // Create a temporary anchor element
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.target = "_blank";

  // Trigger a click event on the anchor element
  document.body.appendChild(anchorElement);
  anchorElement.click();

  // Cleanup
  document.body.removeChild(anchorElement);
};
