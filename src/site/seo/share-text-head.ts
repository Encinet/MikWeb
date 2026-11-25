interface ShareText {
  title: string;
  description: string;
}

interface HeadState {
  owners: { text: ShareText }[];
  tags: { name: HTMLMetaElement; description: HTMLMetaElement };
}

const heads = new WeakMap<Document, HeadState>();

function adoptTag(document: Document, property: 'name' | 'description') {
  const existing = document.head.querySelectorAll<HTMLMetaElement>(`meta[itemprop="${property}"]`);
  for (let i = 1; i < existing.length; i++) existing[i].remove();
  if (existing[0]) return existing[0];
  const tag = document.createElement('meta');
  tag.setAttribute('itemprop', property);
  document.head.appendChild(tag);
  return tag;
}

function writeShareText(tags: HeadState['tags'], text: ShareText) {
  tags.name.content = text.title;
  tags.description.content = text.description;
}

/** The latest mounted owner supplies the text; removing it restores the previous owner. */
export function registerShareText(document: Document, text: ShareText): () => void {
  let head = heads.get(document);
  if (!head) {
    head = {
      owners: [],
      tags: { name: adoptTag(document, 'name'), description: adoptTag(document, 'description') },
    };
    heads.set(document, head);
  }
  const state = head;
  const owner = { text };
  state.owners.push(owner);
  writeShareText(state.tags, text);

  return () => {
    const index = state.owners.indexOf(owner);
    if (index === -1) return;
    state.owners.splice(index, 1);
    if (index !== state.owners.length) return;
    const current = state.owners.at(-1);
    if (current) {
      writeShareText(state.tags, current.text);
    } else {
      state.tags.name.remove();
      state.tags.description.remove();
      heads.delete(document);
    }
  };
}
