const chunkName = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

/** Read the dimensions of one still WebP containing only pixels and optional alpha. */
export function pixelOnlyWebpDimensions(bytes: Uint8Array) {
  if (bytes.length < 20 || chunkName(bytes, 0) !== 'RIFF' || chunkName(bytes, 8) !== 'WEBP')
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== bytes.length - 8) return null;

  let offset = 12;
  function takeChunk(name: string) {
    if (offset + 8 > bytes.length || chunkName(bytes, offset) !== name) return false;
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size;
    if (!size || end > bytes.length || (size % 2 && bytes[end] !== 0)) return false;
    offset = end + (size % 2);
    return true;
  }

  let canvas: { width: number; height: number } | undefined;
  if (chunkName(bytes, offset) === 'VP8X') {
    // Extended browser output only needs the alpha flag and a separate alpha chunk.
    if (bytes.length < 30 || view.getUint32(16, true) !== 10 ||
        view.getUint32(20) !== 0x10000000 || !takeChunk('VP8X') || !takeChunk('ALPH'))
      return null;
    const dimension = (at: number) => 1 + bytes[at] + (bytes[at + 1] << 8) + (bytes[at + 2] << 16);
    canvas = { width: dimension(24), height: dimension(27) };
  }

  const data = offset + 8;
  if (takeChunk('VP8 ')) {
    const length = view.getUint32(data - 4, true);
    if (offset !== bytes.length || length <= 10 || (bytes[data] & 1) ||
        bytes[data + 3] !== 0x9d || bytes[data + 4] !== 1 || bytes[data + 5] !== 0x2a)
      return null;
    const firstPartitionSize = (bytes[data] + (bytes[data + 1] << 8) + (bytes[data + 2] << 16)) >>> 5;
    if (!firstPartitionSize || firstPartitionSize > length - 10) return null;
    const width = view.getUint16(data + 6, true) & 0x3fff;
    const height = view.getUint16(data + 8, true) & 0x3fff;
    if (!width || !height || (canvas && (canvas.width !== width || canvas.height !== height)))
      return null;
    return { width, height };
  }
  if (canvas || !takeChunk('VP8L') || offset !== bytes.length || view.getUint32(data - 4, true) <= 5 ||
      bytes[data] !== 0x2f || bytes[data + 4] >> 5)
    return null;
  const dimensions = view.getUint32(data + 1, true);
  return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
}
