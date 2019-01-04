import {Component} from '@angular/core';
import {FileSystemFileEntry, UploadEvent, UploadFile} from 'ngx-file-drop';
import {AngularFireStorage} from '@angular/fire/storage';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent {
  title = 'angular';

  files: UploadFile[] = [];
  encryptedFiles: ArrayBuffer[] = [];
  starting: boolean;

  constructor(private storage: AngularFireStorage) {

  }

  onFileDrop($event: UploadEvent) {
    console.log($event);

    this.files = this.files.concat($event.files);
    this.start();
  }

  start() {
    if (this.starting) {
      return;
    }
    this.next();
  }

  next() {
    if (this.files.length === 0) {
      this.starting = false;
      return;
    }

    const reader = new FileReader();
    const firstFile = this.files[0].fileEntry as FileSystemFileEntry;
    firstFile.file(file => {
      reader.onloadend = ev => {
        this.encrypt(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  encrypt(data: ArrayBuffer) {
    window.crypto.subtle.generateKey({
      name: 'AES-GCM',
      length: 256
    }, true, ['encrypt', 'decrypt']).then(key => {
      return window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: window.crypto.getRandomValues(new Uint8Array(12))
      }, key, data);
    }).then(value => {
      this.upload(value);
    });
  }

  upload(data: ArrayBuffer) {
    const uploadFile = this.files[0];
    const ref = this.storage.ref(uploadFile.relativePath);
    console.log(ref);
    ref.put(data).then(a => {
      // console.log(value);
      // this.encryptedFiles.push(value);
      this.files.shift();
      this.next();
    });
  }
}
