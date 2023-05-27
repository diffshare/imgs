"use client"

import styles from './page.module.css'
import { useState } from 'react';
import { checkAlbumName, createKey } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [albumName, setAlbumName] = useState('');
  const router = useRouter();

  async function createAlbum() {
    if (!albumName) {
      alert('アルバム名を入力してください。');
      return;
    }

    // アルバム名の重複チェック
    // 重複していたら、アラートを出してアルバム名の変更を促す
    // 重複していなかったら、アルバム投稿画面に遷移する
    const notDuplicated = await checkAlbumName(albumName);
    if (!notDuplicated) {
      alert('同名のアルバムが既に存在します。アルバム名を変更してください。');
      return;
    }

    const k = await createKey();
    router.push(`/${albumName}#k=${k}`);
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {    
    setAlbumName(event.target.value);
  }

  return (
    <main className={styles.main}>
      <p>imgs is Image Viewer on Secure Cloud Storage used end-to-end encryption.</p>
      <ol>
        <li>以下の「アルバム作成」ボタンをクリックすると、アルバム投稿画面に遷移します。</li>
        <li>そのアルバム投稿画面のURLをローカルに保存してください。</li>
        <li>保存したURLが閲覧画面のURLにもなります。このURLを知っている人のみが画像を閲覧できます。</li>
        <li>URLを紛失した場合、画像を元に戻すことができなくなります。</li>
      </ol>
      <p>
        <label>
          アルバム名
          <input type="text" onChange={onChange} />
        </label>
        <br />
        <button onClick={createAlbum}>アルバム作成</button>
      </p>
      <p>アルバム作成ボタンをクリックした時点でストレージにアクセスして同名のアルバムの存在を確認する。すでに存在している場合は、alertを出してアルバム名の変更を促す。</p>
    </main>
  );
}
