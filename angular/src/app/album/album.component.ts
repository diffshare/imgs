import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFireStorage} from '@angular/fire/storage';
import {HttpClient} from '@angular/common/http';


@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.sass']
})
export class AlbumComponent implements OnInit {

  uploadFiles: File[] = [];
  readFiles: UploadingFile[] = [];
  encryptedFiles: UploadingFile[] = [];
  completedCount = 0;
  key: string;
  fileList: string[] = [];

  loading = false;
  hasFileList: boolean;
  validFileList: boolean;

  get uploadable(): boolean {
    // 読み込み中か || ファイルリストを持っていないか || 持っているがファイルリストを復号できる正当な鍵を持っている場合に投稿可能
    return !this.loading || !this.hasFileList || (this.hasFileList && this.validFileList);
  }

  encrypting: boolean;
  uploading: boolean;
  private id: string;
  imageList: string[] = [];

  constructor(private route: ActivatedRoute, private storage: AngularFireStorage, private http: HttpClient) {
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
      this.fileList.forEach(async name => {
        const image = await this.loadImage(name);
        const index = this.fileList.indexOf(name);
        this.imageList[index] = image;
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

  encrypt() {
    if (this.readFiles.length === 0) {
      this.encrypting = false;
      return;
    }

    const file = this.readFiles[0];
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    this.importKey().then(key => {
      return window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: iv,
      }, key, file.buffer);
    }).then(value => {
      file.buffer = this.concat(iv.buffer as ArrayBuffer, value);
      this.encryptedFiles.push(file);
      this.readFiles.shift();
      this.startUpload();
      this.encrypt();
    });
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

  upload() {
    if (this.encryptedFiles.length === 0) {
      this.uploading = false;
      return;
    }

    const file = this.encryptedFiles[0];

    const ref = this.storage.ref(this.id + '/' + file.name);
    console.log(ref);
    ref.put(file.buffer).then(a => {
      this.fileList.push(file.name);
      this.updateFileList();

      this.encryptedFiles.shift();
      this.completedCount += 1;
      this.upload();
    });
  }

  updateFileList() {

    const json = JSON.stringify(this.fileList);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    this.importKey().then(key => {
      return window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: iv,
      }, key, this.string_to_buffer(json) as ArrayBuffer);
    }).then(value => {
      const ref = this.storage.ref(this.id + '/filelist');
      return ref.put(this.concat(iv.buffer as ArrayBuffer, value));
    }).then(value => {
      console.log('update');
    });
  }

  string_to_buffer(src): ArrayBufferLike {
    return (new Uint16Array([].map.call(src, function (c) {
      return c.charCodeAt(0);
    }))).buffer;
  }

  async loadImage(name: string) {
    if (name == null) {
      return;
    }
    console.log('loadImage');
    const ref = this.storage.ref(this.id + '/' + name);
    const url = await ref.getDownloadURL().toPromise();
    console.log(url);
    const buffer = await this.http.get(url, {responseType: 'arraybuffer'}).toPromise();
    const key = await this.importKey();
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);
    const dec = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: iv,
    }, key, data);
    const blob = new Blob([dec], {type: 'image/jpeg'});
    const promise = new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
    const dataURL = await promise;
    return dataURL;
  }
}

class UploadingFile {

  constructor(public name: string, public buffer: ArrayBuffer) {

  }
}
