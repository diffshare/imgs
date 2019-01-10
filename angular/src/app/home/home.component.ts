import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {TitleService} from '../service/title.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit {

  albumName: string;

  constructor(private router: Router, private title: TitleService) {
  }

  ngOnInit() {
    this.title.setTitle('Home');
  }

  createAlbum() {

    if (this.albumName == null || this.albumName.length === 0) {
      alert('アルバム名を入力してください。');
      return;
    }

    window.crypto.subtle.generateKey({
      name: 'AES-GCM',
      length: 256
    }, true, ['encrypt', 'decrypt']).then(value => {
      window.crypto.subtle.exportKey('jwk', value).then(key => {
        this.router.navigate([this.albumName], {fragment: 'k=' + key.k});
      });
    });
  }
}
