import { ArrayBuffers } from './arraybuffers';

const bytes = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer));

describe('ArrayBuffers', () => {
  describe('toString', () => {
    it('should encode an array buffer as base64', () => {
      expect(ArrayBuffers.toString(new Uint8Array([0, 1, 2, 255]).buffer)).toBe('AAEC/w==');
    });

    it('should encode an array buffer without padding', () => {
      expect(ArrayBuffers.toString(new TextEncoder().encode('Hello World!').buffer)).toBe(
        'SGVsbG8gV29ybGQh',
      );
    });

    it('should encode an empty array buffer', () => {
      expect(ArrayBuffers.toString(new ArrayBuffer(0))).toBe('');
    });
  });

  describe('toArrayBuffer', () => {
    it('should decode a base64 string into an array buffer', () => {
      expect(bytes(ArrayBuffers.toArrayBuffer('AAEC/w=='))).toEqual([0, 1, 2, 255]);
    });

    it('should decode a base64 string without padding', () => {
      expect(new TextDecoder().decode(ArrayBuffers.toArrayBuffer('SGVsbG8gV29ybGQh'))).toBe(
        'Hello World!',
      );
    });

    it('should decode an empty base64 string', () => {
      expect(bytes(ArrayBuffers.toArrayBuffer(''))).toEqual([]);
    });

    it('should handle a single trailing padding character', () => {
      expect(bytes(ArrayBuffers.toArrayBuffer('AAE='))).toEqual([0, 1]);
    });
  });

  describe('round trip', () => {
    it('should round trip a string', () => {
      const value = 'The quick brown fox jumps over the lazy dog';
      const encoded = ArrayBuffers.toString(new TextEncoder().encode(value).buffer);
      expect(new TextDecoder().decode(ArrayBuffers.toArrayBuffer(encoded))).toBe(value);
    });

    it('should round trip arbitrary bytes', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) original[i] = i;
      const encoded = ArrayBuffers.toString(original.buffer);
      expect(bytes(ArrayBuffers.toArrayBuffer(encoded))).toEqual(Array.from(original));
    });

    it('should produce a buffer length that matches the decoded length', () => {
      const value = 'Hello World!';
      const buffer = ArrayBuffers.toArrayBuffer(
        ArrayBuffers.toString(new TextEncoder().encode(value).buffer),
      );
      expect(buffer.byteLength).toBe(value.length);
    });
  });
});
