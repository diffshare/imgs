"use client"

import { useEffect, useState } from "react";
import { importKey, loadFileList, loadImage, storage } from "../../lib/firebase";
import { DecryptedImage } from "@/lib/decrypted-image";
import styles from './page.module.css'
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Album({ params }: { params: { slug: string[] } }) {
  const album_id = params.slug[0];
  const photo_id = params.slug[1];
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<string[]>([]);
  const [imageList, setImageList] = useState<DecryptedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<DecryptedImage>();
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [showFullExif, setShowFullExif] = useState(false);

  // カーソルキーによるナビゲーション
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (!currentImage) return;
      const index = fileList.indexOf(currentImage.name);
      if (event.key === 'ArrowRight') {
        router.push(`/${album_id}/${fileList[Math.min(fileList.length - 1, index + 1)]}${window.location.hash}`);
      }
      if (event.key === 'ArrowLeft') {
        router.push(`/${album_id}/${fileList[Math.max(0, index - 1)]}${window.location.hash}`);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentImage, album_id, fileList, router]);

  // アルバムの読込
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

  // 単一フォトの読込
  useEffect(() => {
    setCurrentImage(imageList.filter(i => i.name === photo_id)[0]);
  }, [imageList, photo_id]);

  return (
    <div>
      {currentImage && (
        <div className={styles.photo}>
          <Link href={`/${album_id}${window.location.hash}`}>
            <img src={currentImage.url} />
          </Link>
        </div>
      )}
      {/* <label>
        <input type="checkbox" checked={showEdit} onChange={() => setShowEdit(!showEdit)} />
        編集
      </label>
      <label>
        <input type="checkbox" checked={showPhotoDateTime} onChange={() => setShowPhotoDateTime(!showPhotoDateTime)} />
        撮影日時
      </label> */}
      <label>
        <input type="checkbox" checked={showPhotoDetail} onChange={() => setShowPhotoDetail(prev => !prev)} />
        写真詳細
      </label>
      {showPhotoDetail && (
        <label>
          <input type="checkbox" checked={showFullExif} onChange={() => setShowFullExif(prev => !prev)} />
          EXIF詳細
        </label>
      )}
      <ul>
        <li>読み込み処理中: {loading ? "Loading" : ""}</li>
        <li>全画像数: {fileList.length}</li>
        <li>読み込み完了画像数: {imageList.length}</li>
      </ul>

      <div className={styles["photo-list"]}>
        {imageList.map(image => (
          <div key={image.url}>
            <Link href={`/${album_id}/${image.name}${window.location.hash}`}>
              <img src={image.url} />
            </Link>
            {/* // <img src="image?.url" *ngIf="image?.url" (click)="gotoPhoto(image)" /> */}
            <div>
              <a href={image.originalImageUrl}>{image.name}</a>
              {/* <button>削除</button> */}
            {/* <a [href]="image?.originalImageUrl" download="{{image?.name}}">{{image?.name}}</a>
            <button (click)="delete(image)" *ngIf="editable">削除</button> */}
            </div>
            {showPhotoDetail && (
            <div>
              Model: {image.tags['Model']},
              SS: {image.exposureTime},
              F: {image.tags['FNumber']},
              ISO: {image.tags['ISOSpeedRatings']},
              焦点距離: {image.tags['FocalLength']}mm,
              {image.tags['ExposureBiasValue'] && (
                <span>
                焦点距離（35mm換算）: {image.tags['FocalLengthIn35mmFilm']}mm
                </span>
              )}
              {showFullExif && (
                <div>
                  {/* {JSON.stringify(image?.tags)} */}
                  {JSON.stringify(image.exifr)}
                </div>
              )}
            </div>
          )}
          </div>
        ))}
      </div>
    </div>
  );
}
