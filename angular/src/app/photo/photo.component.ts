import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DecryptedImage} from '../model/decrypted-image';

@Component({
  selector: 'app-photo',
  templateUrl: './photo.component.html',
  styleUrls: ['./photo.component.sass']
})
export class PhotoComponent implements OnInit {

  @Input()
  public image: DecryptedImage;
  @Input()
  album_id: string;

  constructor(private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit() {
  }

}
