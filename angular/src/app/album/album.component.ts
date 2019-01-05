import {Component, OnInit} from '@angular/core';
import {FileSystemFileEntry} from 'ngx-file-drop';
import {ActivatedRoute} from '@angular/router';
import {AngularFireStorage} from '@angular/fire/storage';

@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.sass']
})
export class AlbumComponent implements OnInit {

  uploadFiles: File[] = [];
  readFiles: UploadingFile[] = [];
  encryptedFiles: UploadingFile[] = [];
  key: string;

  encrypting: boolean;
  uploading: boolean;
  private id: string;

  constructor(private route: ActivatedRoute, private storage: AngularFireStorage) {
  }

  ngOnInit() {
    this.route.fragment.subscribe(value => {
      this.key = value.substring(2);
    });
    this.route.params.subscribe(value => {
      this.id = value.id;
      this.storage.ref(this.id).
    });
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

    this.importKey().then(key => {
      return window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: window.crypto.getRandomValues(new Uint8Array(12))
      }, key, file.buffer);
    }).then(value => {
      file.buffer = value;
      this.encryptedFiles.push(file);
      this.readFiles.shift();
      this.startUpload();
      this.encrypt();
    });
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
      this.encryptedFiles.shift();
      this.upload();
    });
  }
}

class UploadingFile {

  constructor(public name: string, public buffer: ArrayBuffer) {

  }
}
