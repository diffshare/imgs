import { concat, stringToBuffer } from './common';

// 特定の二つのバッファを関数に入力した場合の期待される結合バッファの出力を確認
describe('concat function', () => {
  it('should correctly concatenate two ArrayBuffers', () => {
    const buffer1 = new Uint8Array([1, 2, 3]).buffer;
    const buffer2 = new Uint8Array([4, 5, 6]).buffer;

    const expected = new Uint8Array([1, 2, 3, 4, 5, 6]).buffer;

    const result = concat(buffer1, buffer2);
    expect(result).toEqual(expected);
  });
});

// 特定の文字列を関数に入力した場合の期待されるバッファの出力を確認
describe('stringToBuffer function', () => {
  it('should convert a string into ArrayBufferLike correctly', () => {
    const str = 'Test String';

    const expected = new Uint16Array([
      'T'.charCodeAt(0),
      'e'.charCodeAt(0),
      's'.charCodeAt(0),
      't'.charCodeAt(0),
      ' '.charCodeAt(0),
      'S'.charCodeAt(0),
      't'.charCodeAt(0),
      'r'.charCodeAt(0),
      'i'.charCodeAt(0),
      'n'.charCodeAt(0),
      'g'.charCodeAt(0),
    ]);

    const result = stringToBuffer(str);
    expect(result).toEqual(expected);
  });
});