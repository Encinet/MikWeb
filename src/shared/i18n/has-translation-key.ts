export function hasTranslationKey<Key extends string>(
  translator: { has: (key: Key) => boolean },
  key: unknown,
): key is Key {
  // next-intl types has() for known keys; probing an external key needs this boundary cast.
  return typeof key === 'string' && translator.has(key as Key);
}
