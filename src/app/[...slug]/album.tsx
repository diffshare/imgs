"use client"

import { useEffect, useRef, useState } from "react";
import { deletePhoto, importKey, loadFileList, loadImage, putFileList, putImage, storage } from "../../lib/firebase";
import { DecryptedImage } from "@/lib/decrypted-image";
import styles from './page.module.css'
import { JobQueue } from "@/lib/job-queue";
import { concat } from "@/lib/common";
import { filetypeinfo } from "magic-bytes.js";
import JSZip from "jszip";
import FileSaver from "file-saver"

export default function Album({ params }: { params: { slug: string[] } }) {
  const album_id = params.slug[0];
  const photo_id = params.slug[1];

  const readQueue = useRef(new JobQueue('read'));
  const cryptoQueue = useRef(new JobQueue('crypto'));
  const uploadQueue = useRef(new JobQueue('upload'));

  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<string[]>([]);
  const [imageList, setImageList] = useState<DecryptedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<DecryptedImage | null>();
  const [showEdit, setShowEdit] = useState(false);
  const [showPhotoDateTime, setShowPhotoDateTime] = useState(false);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);

  // カーソルキーによるナビゲーション
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (!currentImage) return;
      const index = fileList.indexOf(currentImage.name);
      if (event.key === 'ArrowRight') {
        const nextImage = imageList[Math.min(fileList.length - 1, index + 1)];
        gotoPhoto(nextImage);
      }
      if (event.key === 'ArrowLeft') {
        const nextImage = imageList[Math.max(0, index - 1)];
        gotoPhoto(nextImage);
      }
    }
    function dragover(event: DragEvent) {
      event.preventDefault();
      // ドロップ可能にする
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
    function drop(event: DragEvent) {
      event.preventDefault();

      const files = event.dataTransfer?.files;
      if (!files || !files.length) return; // ファイルがない場合は何もしない

      // ファイルがある場合は、ファイルを追加する
      append(Array.from(files));
    }
    window.addEventListener('keydown', handler);
    window.addEventListener('dragover', dragover);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('dragover', dragover);
      window.removeEventListener('drop', drop);
    }
  }, [currentImage, fileList, imageList]);

  // アルバムの読込
  useEffect(() => {
    const hash = window.location.hash.substring(3);
    async function load() {
      try {
        setLoading(true);
        const key = await importKey(hash);
        const fileList = await loadFileList(album_id, key);
        setFileList(fileList);
        // ファイルリストから順次画像を読み込む
        // NOTE: Promise.allすると全てを読み込むまで反映しないので良くない
        fileList.forEach(async name => {
          const image = await loadImage(album_id, name, key);
          setImageList(prev => {
            const images = [...prev, image];
            // fileListによって定義された順番になるようにソートする
            return fileList.map(name => images.filter(i => i.name === name)[0]).filter(i => i);
          });
        });
      } catch (e) {

      }
      setLoading(false);
    }
    load();
  }, [album_id]);

  // 単一フォトの読込
  useEffect(() => {
    setCurrentImage(imageList.filter(i => i.name === photo_id)[0]);
  }, [imageList, photo_id]);

  // shallowナビゲーションを実装
  // NOTE: 一枚画像の表示・非表示・カーソル移動でURLを変更するが、
  //       コンポーネントの再読み込みは行わない。
  function gotoPhoto(image: DecryptedImage | null) {
    if (!image) {
      window.history.pushState({}, "", `/${album_id}${window.location.hash}`);
      setCurrentImage(null);
        return;
    }
    window.history.pushState({}, "", `/${album_id}/${image.name}${window.location.hash}`);
    setCurrentImage(image);
  }

  // ファイル選択された場合の処理
  function onChangeFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    append(Array.from(files));
  }

  // CloudStorageへのファイル追加処理
  function append(files: File[]) {

    for (const file of files) {
      if (fileList.includes(file.name)) {
        alert(`${file.name}はすでに追加されています`);
        return
      }
    }

    Array.from(files).forEach(file => {
      read(file);
    });
  }

  // ファイル読込
  function read(file: File) {
    readQueue.current.enqueue(async () => {
      const buffer = await new Promise<ArrayBuffer>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
      crypto({name: file.name, buffer});
    });
  }

  // 暗号化
  function crypto(file: {name: string, buffer: ArrayBuffer}) {
    cryptoQueue.current.enqueue(async () => {
      const hash = window.location.hash.substring(3);
      const key = await importKey(hash);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: iv,
      }, key, file.buffer);

      upload({...file, encryptedBuffer: concat(iv.buffer as ArrayBuffer, encrypted)});
    });
  }

  // アップロード
  function upload(file: {name: string, buffer: ArrayBuffer, encryptedBuffer: ArrayBuffer}) {
    uploadQueue.current.enqueue(async () => {
      const mime = filetypeinfo(Buffer.from(file.buffer))[0].mime;
      if (!mime) throw new Error(`fileType unknown: ${file.name}`);
      await putImage(album_id, file.name, file.encryptedBuffer, mime);
      await appendFileList(file.name);
      setImageList(prev => [...prev, new DecryptedImage(file.name, file.buffer)]);
    });
  }

  // ファイルリストの更新
  async function appendFileList(name: string) {
    const newFileList = [...fileList, name].filter((x, i, self) => self.indexOf(x) === i); // 重複排除
    setFileList(newFileList);
    await updateFileList(newFileList);
  }

  // メタデータの更新
  async function updateFileList(newFileList: string[]) {
    const hash = window.location.hash.substring(3);
    const key = await importKey(hash);
    await putFileList(album_id, newFileList, key);
  }

  // ファイルの削除
  async function deleteImage(image: DecryptedImage) {
    const b = confirm(`${image.name}を削除しますか？`);
    if (!b) return;

    await deletePhoto(album_id, image.name);
    setImageList(prev => prev.filter(i => i.name !== image.name));

    const newFileList = fileList.filter(name => name !== image.name);
    setFileList(newFileList);
    await updateFileList(newFileList);
  }

  // すべての画像をzipしてダウンロード
  async function downloadAsZip() {
    const zip = new JSZip();
    imageList.forEach(image => {
      zip.file(image.name, image.decryptedData, {binary: true});
    });
    const zipFile = await zip.generateAsync({type:"blob"})
    FileSaver.saveAs(zipFile, `Photos-${album_id}.zip`);
  }

  return (
    <div>
      {currentImage && (
        <div className={styles.photo}>
          <img src={currentImage.url} onClick={() => gotoPhoto(null)} />
        </div>
      )}
      <label>
        <input type="checkbox" checked={showEdit} onChange={() => setShowEdit(prev => !prev)} />
        編集
      </label>
      <label>
        <input type="checkbox" checked={showPhotoDateTime} onChange={() => setShowPhotoDateTime(prev => !prev)} />
        撮影日時
      </label>
      <label>
        <input type="checkbox" checked={showPhotoDetail} onChange={() => setShowPhotoDetail(prev => !prev)} />
        写真詳細
      </label>
      <ul>
        <li>読み込み処理中: {loading ? "Loading" : ""}</li>
        <li>全画像数: {fileList.length}</li>
        <li>読み込み完了画像数: {imageList.length}</li>
      </ul>

      {(showEdit || !fileList.length) && (
        <div>
          <p>
            画像を選択
            <input type="file" multiple onChange={onChangeFile} />
          </p>
          <p>
            画像のファイル名は公開情報になるので、秘匿すべき情報はファイル名に含まないこと。
          </p>
        </div>
      )}

      {fileList.length && (
        <div>
          <button onClick={downloadAsZip}>すべての画像をzipでダウンロード</button>
        </div>
      )}

      <div className={styles["photo-list"]}>
        {imageList.map(image => (
          <div key={image.url}>
            <img src={image.url} onClick={() => gotoPhoto(image)} />
            {/* // <img src="image?.url" *ngIf="image?.url" (click)="gotoPhoto(image)" /> */}
            <div>
              <a href={image.originalImageUrl}>{image.name}</a>
              {showEdit && (
                <button onClick={() => deleteImage(image)}>削除</button>
              )}
            </div>
            {showPhotoDateTime && (image.tags['DateTimeOriginal'] || image.tags['DateTime']) && (
              <div>
                撮影日時: {image.tags['DateTimeOriginal'] || image.tags['DateTime']}
              </div>
            )}
            {showPhotoDetail && (
            <div>
              Model: {image.tags['Model'] ?? '-'},
              SS: {image.exposureTime ?? '-'},
              F: {image.tags['FNumber']?.toString() ?? '-'},
              ISO: {image.tags['ISOSpeedRatings']?.toString() ?? '-'},
              {image.tags['FocalLength'] && (
                <span>
                焦点距離: {image.tags['FocalLength'].toString()}mm
                </span>
              )}
              {image.tags['FocalLengthIn35mmFilm'] && (
                <span>
                焦点距離（35mm換算）: {image.tags['FocalLengthIn35mmFilm'].toString()}mm
                </span>
              )}
              <label>
                <input type="checkbox" checked={image.showFullExif} onChange={() => {image.showFullExif = !image.showFullExif; setImageList([...imageList])}} />
                EXIF
              </label>
              {image.showFullExif && (
                <div>
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
