export class Utils {

  static async importKey(keyString: string) {
    return await window.crypto.subtle.importKey(
      'jwk',
      {
        kty: 'oct',
        k: keyString,
        alg: 'A256GCM',
        ext: true,
      },
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] // can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
  }

  static async decrypt(response: ArrayBuffer, key: CryptoKey) {
    const iv = response.slice(0, 12);
    const data = response.slice(12);
    return await window.crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: iv
    }, key, data);
  }

  static bufferToString(buffer: ArrayBuffer) {
    return String.fromCharCode.apply('', new Uint16Array(buffer));
  }
}
