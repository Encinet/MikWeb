const chunkName = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

/** Recognize exactly one still image with no profiles, metadata or trailing chunks. */
export function isPixelOnlyWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || chunkName(bytes, 0) !== 'RIFF' || chunkName(bytes, 8) !== 'WEBP') {
    return false;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== bytes.length - 8) return false;

  let offset = 12;
  function takeChunk(name: string) {
    if (offset + 8 > bytes.length || chunkName(bytes, offset) !== name) return false;
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size;
    if (!size || end > bytes.length || (size % 2 && bytes[end] !== 0)) return false;
    offset = end + (size % 2);
    return true;
  }

  if (takeChunk('VP8 ') || takeChunk('VP8L')) return offset === bytes.length;
  // Separate alpha uses a 10-byte VP8X header with just the alpha flag set.
  return (
    bytes.length >= 30 &&
    view.getUint32(16, true) === 10 &&
    view.getUint32(20) === 0x10000000 &&
    takeChunk('VP8X') &&
    takeChunk('ALPH') &&
    takeChunk('VP8 ') &&
    offset === bytes.length
  );
}
