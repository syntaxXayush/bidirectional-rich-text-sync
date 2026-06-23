/**
 * Maps a character offset within plain text to a DOM Range inside contenteditable.
 * Used for cursor preservation after remote HTML replacement.
 */
export function setSelectionByCharacterOffset(
  root: HTMLElement,
  start: number,
  end: number,
): void {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOffset = 0;
  let endOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const textLength = node.textContent?.length ?? 0;
    const nextCount = charCount + textLength;

    if (!startNode && start <= nextCount) {
      startNode = node;
      startOffset = Math.max(0, start - charCount);
    }

    if (!endNode && end <= nextCount) {
      endNode = node;
      endOffset = Math.max(0, end - charCount);
      break;
    }

    charCount = nextCount;
  }

  if (!startNode || !endNode) {
    return;
  }

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Returns plain-text character offsets for the current selection. */
export function getSelectionCharacterOffsets(root: HTMLElement): {
  start: number;
  end: number;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const start = getOffsetBefore(root, range.startContainer, range.startOffset);
  const end = getOffsetBefore(root, range.endContainer, range.endOffset);
  return { start, end };
}

function getOffsetBefore(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length ?? 0;
  }

  return offset;
}

/** Normalizes HTML for stable comparison (reduces spurious sync loops). */
export function normalizeEditorHtml(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}
