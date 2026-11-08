export interface ShareText {
  title: string;
  description: string;
}

interface HeadState {
  owners: Map<symbol, ShareText>;
  tags: { name: HTMLMetaElement; description: HTMLMetaElement };
}

const heads = new WeakMap<Document, HeadState>();

function adoptTag(document: Document, property: 'name' | 'description') {
  const existing = [
    ...document.head.querySelectorAll<HTMLMetaElement>(`meta[itemprop="${property}"]`),
  ];
  const tag = existing[0] ?? document.createElement('meta');
  tag.setAttribute('itemprop', property);
  if (!existing.length) document.head.appendChild(tag);
  for (const duplicate of existing.slice(1)) duplicate.remove();
  return tag;
}

/** The latest mounted owner supplies the text; removing it restores the previous owner. */
export function registerShareText(document: Document, text: ShareText): () => void {
  let head = heads.get(document);
  if (!head) {
    head = {
      owners: new Map(),
      tags: { name: adoptTag(document, 'name'), description: adoptTag(document, 'description') },
    };
    heads.set(document, head);
  }
  const state = head;
  const owner = Symbol();
  state.owners.set(owner, text);

  function update() {
    const current = [...state.owners.values()].at(-1);
    if (current) {
      state.tags.name.content = current.title;
      state.tags.description.content = current.description;
    } else {
      state.tags.name.remove();
      state.tags.description.remove();
      heads.delete(document);
    }
  }

  update();
  return () => {
    state.owners.delete(owner);
    update();
  };
}
