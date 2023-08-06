export function concat(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer as ArrayBuffer;
}

export function stringToBuffer(src: string): ArrayBufferLike {
  const newArr = [];
  for (let i = 0, len = src.length; i < len; ++i) {
    newArr[i] = src.charCodeAt(i); // 0 ~ 65535;
  }
  return Uint16Array.from(newArr);
}
