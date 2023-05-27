"use client"

import { useEffect, useState } from "react";
import { importKey, loadFileList, loadImage, storage } from "../../lib/firebase";
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
