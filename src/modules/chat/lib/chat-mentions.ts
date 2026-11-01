export interface MentionQuery {
  start: number;
  end: number;
  text: string;
}

/** Completion is an editing aid; the plugin remains responsible for parsing mentions. */
export function mentionQuery(
  value: string,
  start: number | null,
  end: number | null,
): MentionQuery | null {
  if (start === null || start !== end || start > value.length) return null;
  const trigger = value.lastIndexOf('@', start - 1);
  if (trigger < 0 || trigger >= start) return null;
  const before = value.slice(0, trigger);
  const previous = [...before].at(-1);
  if (
    previous &&
    (/[@/\\.:]/u.test(previous) ||
      (/[\p{L}\p{N}\p{M}_]/u.test(previous) &&
        !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(previous)))
  )
    return null;
  const token = before.split(/\s/u).at(-1) ?? '';
  if (token.includes('://') || /^www\./iu.test(token)) return null;
  const text = value.slice(trigger + 1, start);
  if (text.length > 64 || /[@\r\n\t]/u.test(text)) return null;
  return { start: trigger, end: start, text };
}

export function completeMention(value: string, query: MentionQuery, name: string) {
  const nameStart = query.start + 1 + (query.text.length - query.text.trimStart().length);
  const fullName =
    value.slice(nameStart, nameStart + name.length).toLowerCase() === name.toLowerCase();
  const end = fullName
    ? nameStart + name.length
    : query.end + (value.slice(query.end).match(/^[\p{L}\p{N}\p{M}_-]*/u)?.[0].length ?? 0);
  const after = value.slice(end);
  const inserted = `@${name}${/^[\s.,!?;:，。！？；：、)]/u.test(after) ? '' : ' '}`;
  return {
    value: value.slice(0, query.start) + inserted + after,
    caret: query.start + inserted.length,
  };
}
