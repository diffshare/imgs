"use client"

import { useEffect, useState } from "react";
import { storage } from "../../lib/firebase";
import { ref, getDownloadURL } from "firebase/storage"
import { DecryptedImage } from "@/lib/decrypted-image";
import styles from './page.module.css'

export default function Album({ params }: { params: { album_id: string } }) {
  const album_id = params.album_id;

  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<string[]>([]);
  const [imageList, setImageList] = useState<DecryptedImage[]>([]);

  useEffect(() => {
    const hash = window.location.hash.substring(3);
    async function load() {
      setLoading(true);
      const key = await importKey(hash);
      const fileList = await loadFileList(album_id, key);
      const imageList = await Promise.all(fileList.map(async name => {
        return await loadImage(album_id, name, key);
      }));
      setFileList(fileList);
      setImageList(imageList);
      setLoading(false);
    }
    load();
  }, [album_id]);

  return (
    <div>
      {/* {currentImageName}
      <AppPhoto image={currentImage} album_id={album_id} /> */}
      {/* <label>
        <input type="checkbox" checked={showEdit} onChange={() => setShowEdit(!showEdit)} />
        編集
      </label>
      <label>
        <input type="checkbox" checked={showPhotoDateTime} onChange={() => setShowPhotoDateTime(!showPhotoDateTime)} />
        撮影日時
      </label>
      <label>
        <input type="checkbox" checked={showPhotoDetail} onChange={() => setShowPhotoDetail(!showPhotoDetail)} />
        写真詳細
      </label> */}
      <ul>
        <li>読み込み処理中: {loading ? "Loading" : ""}</li>
        <li>全画像数: {fileList.length}</li>
        <li>読み込み完了画像数: {imageList.length}</li>
      </ul>

      <div className={styles["photo-list"]}>
        {imageList.map(image => (
          <div key={image.url}>
            <img src={image.url} />
            {/* // <img src="image?.url" *ngIf="image?.url" (click)="gotoPhoto(image)" /> */}
            <div>
              <a href={image.originalImageUrl}>{image.name}</a>
              {/* <button>削除</button> */}
            {/* <a [href]="image?.originalImageUrl" download="{{image?.name}}">{{image?.name}}</a>
            <button (click)="delete(image)" *ngIf="editable">削除</button> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function importKey(key: string) {
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

async function loadFileList(album_id: string, key: CryptoKey): Promise<string[]> {
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
    // const json = bufferToString(decrypted);
    const json = textDecoder.decode(decrypted);
    console.log({json});
    const fileList = JSON.parse(json);
    return fileList;
    // this.imageList = [];
    // this.loadCompletedCount = 0;
    // this.fileList.forEach(async name => {
    //   const image = await this.loadImage(name);
    //   const index = this.fileList.indexOf(name);
    //   this.imageList[index] = image;
    //   this.loadCompletedCount += 1;
    // });
  // } catch (e) {
  //   console.error(e);
  // }
}

async function loadImage(album_id:string, name: string, key: CryptoKey) {
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

  const decryptedImage = new DecryptedImage(name, dec);

  if (CSS.supports('image-orientation: from-image')) {
    // image-orientation: from-image に対応しているならば、CSS に任せると早くなる
    // しかし廃止の見込み、UA が EXIF を読むのが正しくなる
    // https://drafts.csswg.org/css-images-3/#the-image-orientation
    // https://drafts.csswg.org/css-images-4/#image-notation
  } else {
    const tags = decryptedImage.tags;
    if (tags && tags['Orientation'] && tags['Orientation'] !== 1) {
      const rotated = await rotate(decryptedImage.originalImageUrl, tags);
      decryptedImage.url = rotated;
    } else {
      // canvas.toBlob() (this.rotate())は重い処理なので不要な場合（Orientation=1）は行わない
    }
  }

  return decryptedImage;
}

  // see: https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images/31273162#31273162
  async function rotate(url: string, tags: any) {
    const canvas = document.createElement('canvas');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ctx is null');
    const width = tags['PixelXDimension'];
    const height = tags['PixelYDimension'];
    const orientation = tags['Orientation'];

    const img = await new Promise<any>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });

    img.width = width;
    img.height = height;

    if ([5, 6, 7, 8].indexOf(orientation) > -1) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, img.width, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, img.width, img.height);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, img.height);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, img.height, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, img.height, img.width);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, img.width);
        break;
    }
    ctx.drawImage(img, 0, 0);
    const type = 'image/jpeg';
    const blob = await new Promise<Blob>(resolve => {
      if (canvas.toBlob) {
        canvas.toBlob(result => resolve(result), type);
      } else {
        const dataURL = canvas.toDataURL(type);
        const bin = atob(dataURL.split(',')[1]);
        const buffer = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          buffer[i] = bin.charCodeAt(i);
        }
        resolve(new Blob([buffer.buffer as ArrayBuffer], {type: type}));
      }
    });
    return URL.createObjectURL(blob);
  }