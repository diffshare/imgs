import {Component} from '@angular/core';
import {FileSystemFileEntry, UploadEvent, UploadFile} from 'ngx-file-drop';
import {isContentQueryHost} from '@angular/core/src/render3/util';

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
    }, false, ['encrypt', 'decrypt']).then(key => {
      return window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: window.crypto.getRandomValues(new Uint8Array(12))
      }, key, data);
    }).then(value => {
      console.log(value);
      this.encryptedFiles.push(value);
      this.files.shift();
      this.next();
    });
  }
}
