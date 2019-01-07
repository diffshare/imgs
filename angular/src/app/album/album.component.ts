import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFireStorage} from '@angular/fire/storage';
import {HttpClient} from '@angular/common/http';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import * as EXIF from 'exif-js';

@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.sass']
})
export class AlbumComponent implements OnInit {

  get uploadable(): boolean {
    // 読み込み中か || ファイルリストを持っていないか || 持っているがファイルリストを復号できる正当な鍵を持っている場合に投稿可能
    return !this.loading || !this.hasFileList || (this.hasFileList && this.validFileList);
  }

  constructor(
    private route: ActivatedRoute,
    private storage: AngularFireStorage,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
  }

  uploadFiles: File[] = [];
  readFiles: UploadingFile[] = [];
  encryptedFiles: UploadingFile[] = [];
  completedCount = 0;
  loadCompletedCount = 0;
  key: string;
  fileList: string[] = [];

  loading = false;
  hasFileList: boolean;
  validFileList: boolean;

  encrypting: boolean;
  uploading: boolean;
  private id: string;
  imageList: DecryptedImage[] = [];

  static stringToBuffer(src): ArrayBufferLike {
    return (new Uint16Array([].map.call(src, function (c) {
      return c.charCodeAt(0);
    }))).buffer;
  }

  ngOnInit() {
    this.route.fragment.subscribe(value => {
      this.key = value.substring(2);
      this.loadFileList();
    });
    this.route.params.subscribe(value => {
      this.id = value.id;
      this.loadFileList();
    });
  }

  async loadFileList() {
    if (this.loading) {
      return;
    }
    if (!this.key || !this.id) {
      return;
    } // idと鍵の双方が存在しないと
    try {
      this.loading = true;
      const ref = this.storage.ref(this.id + '/filelist');
      this.hasFileList = false;
      const url = await ref.getDownloadURL().toPromise();
      this.hasFileList = true;
      const response = await this.http.get(url, {responseType: 'arraybuffer'}).toPromise();
      const iv = response.slice(0, 12);
      const data = response.slice(12);
      const key = await this.importKey();
      this.validFileList = false;
      const decrypted = await window.crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv: iv
      }, key, data);
      this.validFileList = true;
      const json = this.buffer_to_string(decrypted);
      this.fileList = JSON.parse(json);
      this.imageList = [];
      this.loadCompletedCount = 0;
      this.fileList.forEach(async name => {
        const image = await this.loadImage(name);
        const index = this.fileList.indexOf(name);
        this.imageList[index] = image;
        this.loadCompletedCount += 1;
      });
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }

  buffer_to_string(buf) {
    return String.fromCharCode.apply('', new Uint16Array(buf));
  }

  append(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      this.uploadFiles.push(files.item(i));
    }
    this.read();
  }

  // 先頭を読み込み
  read() {
    if (this.uploadFiles.length === 0) {
      return;
    }
    const file = this.uploadFiles[0];

    const reader = new FileReader();
    reader.onloadend = ev => {
      this.readFiles.push(new UploadingFile(file.name, reader.result as ArrayBuffer));
      this.uploadFiles.shift(); // 先頭を削除
      this.startEncrypt();
      this.read();
    };
    reader.readAsArrayBuffer(file);
  }

  importKey(): PromiseLike<CryptoKey> {
    return window.crypto.subtle.importKey(
      'jwk',
      {
        kty: 'oct',
        k: this.key,
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

  startEncrypt() {
    if (this.encrypting) {
      return;
    }

    this.encrypting = true;
    this.encrypt();
  }

  async encrypt() {
    if (this.readFiles.length === 0) {
      this.encrypting = false;
      return;
    }

    const file = this.readFiles[0];
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.importKey();
    const encrypted = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: iv,
    }, key, file.buffer);

    file.buffer = this.concat(iv.buffer as ArrayBuffer, encrypted);
    this.encryptedFiles.push(file);
    this.readFiles.shift();
    this.startUpload();
    this.encrypt();
  }

  concat(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer as ArrayBuffer;
  }

  startUpload() {
    if (this.uploading) {
      return;
    }

    this.uploading = true;
    this.upload();
  }

  async upload() {
    if (this.encryptedFiles.length === 0) {
      this.uploading = false;
      return;
    }

    const file = this.encryptedFiles[0];

    const ref = this.storage.ref(this.id + '/' + file.name);
    await ref.put(file.buffer);
    this.fileList.push(file.name);
    await this.updateFileList();

    this.encryptedFiles.shift();
    this.completedCount += 1;
    this.upload();
  }

  // ファイルリストの更新
  async updateFileList() {

    const json = JSON.stringify(this.fileList);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.importKey();
    const decrypted = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: iv,
    }, key, AlbumComponent.stringToBuffer(json) as ArrayBuffer);

    const ref = this.storage.ref(this.id + '/filelist');
    ref.put(this.concat(iv.buffer as ArrayBuffer, decrypted));
  }

  async loadImage(name: string) {
    if (name == null) {
      return;
    }
    console.log('loadImage');
    const ref = this.storage.ref(this.id + '/' + name);
    const url = await ref.getDownloadURL().toPromise();
    const buffer = await this.http.get(url, {responseType: 'arraybuffer'}).toPromise();
    const key = await this.importKey();
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);
    const dec = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: iv,
    }, key, data);
    const blob = new Blob([dec], {type: 'image/jpeg'});
    const dataURL = URL.createObjectURL(blob);

    const decryptedImage = new DecryptedImage();
    const tags = EXIF.readFromBinaryFile(dec);
    decryptedImage.tags = tags;

    const rotated = await this.rotate(dataURL, tags);
    const safeUrl = this.sanitizer.bypassSecurityTrustUrl(rotated);

    decryptedImage.url = safeUrl;


    return decryptedImage;
  }

  // see: https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images/31273162#31273162
  rotate(url: string, tags: any) {
    const canvas = document.createElement('canvas');

    const ctx = canvas.getContext('2d');
    const width = tags['PixelXDimension'];
    const height = tags['PixelYDimension'];
    const orientation = tags['Orientation'];

    const img = new Image();
    img.src = url;
    img.width = width;
    img.height = height;

    if ([5, 6, 7, 8].indexOf(orientation) > -1) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    return new Promise<string>(resolve => {
      img.onload = ev => {
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
        const dataURL = canvas.toDataURL(type);
        const bin = atob(dataURL.split(',')[1]);
        // 空の Uint8Array ビューを作る
        const buffer = new Uint8Array(bin.length);
        // Uint8Array ビューに 1 バイトずつ値を埋める
        for (let i = 0; i < bin.length; i++) {
          buffer[i] = bin.charCodeAt(i);
        }
        // Uint8Array ビューのバッファーを抜き出し、それを元に Blob を作る
        const blob = new Blob([buffer.buffer as ArrayBuffer], {type: type});
        resolve(URL.createObjectURL(blob));
      };
    });
  }
}

class UploadingFile {

  constructor(public name: string, public buffer: ArrayBuffer) {

  }
}

class DecryptedImage {
  url: SafeUrl;
  tags: any;

  get orientation(): number {
    if (this.tags == null) {
      return null;
    }

    return this.tags['Orientation'];
  }
}
