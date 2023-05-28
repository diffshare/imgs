import { getApps, initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, getMetadata, uploadBytes, deleteObject } from 'firebase/storage';
import { DecryptedImage } from './decrypted-image';
import { concat, stringToBuffer } from './common';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  ,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (!getApps()?.length) {
  initializeApp(firebaseConfig);
}

export const storage = getStorage();

export async function loadFileList(album_id: string, key: CryptoKey): Promise<string[]> {
  if (!key || !album_id) {
    throw new Error("key or album_id not found");
  } // idと鍵の双方が存在しないと
  // try {
  const filelistRef = ref(storage, album_id + '/filelist');
  // this.hasFileList = false;
  const url = await getDownloadURL(filelistRef);
  // this.hasFileList = true;
  const response = await (await fetch(url)).arrayBuffer();
  const iv = response.slice(0, 12);
  const data = response.slice(12);
  // this.validFileList = false;
  const decrypted = await window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv
  }, key, data);
  // this.validFileList = true;
  const textDecoder = new TextDecoder("utf-16");
  const json = textDecoder.decode(decrypted);
  console.log({ json });
  const fileList = JSON.parse(json);
  return fileList;
}

export async function loadImage(album_id: string, name: string, key: CryptoKey) {
  if (name == null) {
    throw new Error("name is null");
  }
  const imageRef = ref(storage, album_id + '/' + name);
  const url = await getDownloadURL(imageRef);
  const buffer = await (await fetch(url)).arrayBuffer();
  const iv = buffer.slice(0, 12);
  const data = buffer.slice(12);
  const dec = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv,
  }, key, data);

  // rotateの判断はDecryptedImageのコンストラクタで行う
  return new DecryptedImage(name, dec);
}

export function importKey(key: string) {
  return window.crypto.subtle.importKey(
    'jwk',
    {
      kty: 'oct',
      k: key,
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

export async function checkAlbumName(albumName: string) {
  try {
    const albumRef = ref(storage, `${albumName}/filelist`);
    const meta = await getMetadata(albumRef);
    return false;
  }
  catch {    
    return true;
  }
}

export async function createKey() {
  const key = await window.crypto.subtle.generateKey({
    name: 'AES-GCM',
    length: 256
  }, true, ['encrypt', 'decrypt']);
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  return jwk.k;
}

export async function putImage(album_id: string, name: string, encryptedBuffer: ArrayBuffer, contentType: string) {
  const imageRef = ref(storage, album_id + '/' + name);
  await uploadBytes(imageRef, encryptedBuffer, { contentType });
}

export async function putFileList(album_id: string, fileList: string[], cryptoKey: CryptoKey) {
  const json = JSON.stringify(fileList);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const decrypted = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv,
  }, cryptoKey, stringToBuffer(json) as ArrayBuffer);

  const albumRef = ref(storage, `${album_id}/filelist`);
  await uploadBytes(albumRef, concat(iv.buffer as ArrayBuffer, decrypted));
}

export async function deletePhoto(album_id: string, name: string) {
  const imageRef = ref(storage, album_id + '/' + name);
  await deleteObject(imageRef);
}