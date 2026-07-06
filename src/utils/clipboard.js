/** Copies `text` to the clipboard. Returns true on success. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text ?? "");
      return true;
    }
  } catch {
    // Fall through to the legacy fallback below.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text ?? "";
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
