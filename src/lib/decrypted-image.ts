import * as EXIF from 'exif-js/exif';
import * as exifr from 'exifr';

export class DecryptedImage {
  readonly decryptedData: ArrayBuffer;
  url: string;
  readonly originalImageUrl: string;
  readonly tags: any;
  exifr: any;
  showFullExif = false;

  constructor(
    public readonly name: string,
    public readonly dec: ArrayBuffer,
  ) {
    const blob = new Blob([dec], {type: 'image/jpeg'});
    const dataURL = URL.createObjectURL(blob);

    this.name = name;
    this.decryptedData = dec;
    this.originalImageUrl = dataURL;
    this.url = this.originalImageUrl;
    this.tags = EXIF.readFromBinaryFile(dec);
    exifr.parse(dec).then(data => this.exifr = data);

    this.updateOrientation();
  }

  async updateOrientation() {
    if (CSS.supports('image-orientation: from-image')) {
      // image-orientation: from-image に対応しているならば、CSS に任せると早くなる
      // しかし廃止の見込み、UA が EXIF を読むのが正しくなる
      // https://drafts.csswg.org/css-images-3/#the-image-orientation
      // https://drafts.csswg.org/css-images-4/#image-notation
    } else {
      const tags = this.tags;
      if (tags && tags['Orientation'] && tags['Orientation'] !== 1) {
        const rotated = await rotate(this.originalImageUrl, tags);
        this.url = rotated;
      } else {
        // canvas.toBlob() (this.rotate())は重い処理なので不要な場合（Orientation=1）は行わない
      }
    }  
  }

  get orientation(): number | null {
    if (this.tags == null) {
      return null;
    }

    return this.tags['Orientation'];
  }

  get exposureTime(): string | null {
    if (this.tags == null) {
      return null;
    }

    // 1秒以上のときはそのまま
    if (this.tags['ExposureTime'] >= 1) {
      return this.tags['ExposureTime'];
    }

    return '1/' + (1 / this.tags['ExposureTime']);
  }
}

// see: https://stackoverflow.com/questions/20600800/js-client-side-exif-orientation-rotate-and-mirror-jpeg-images/31273162#31273162
export async function rotate(url: string, tags: any) {
  const canvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ctx is null');
  const width = tags['PixelXDimension'];
  const height = tags['PixelYDimension'];
  const orientation = tags['Orientation'];

  const img = await new Promise<any>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });

  img.width = width;
  img.height = height;

  if ([5, 6, 7, 8].indexOf(orientation) > -1) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, img.width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, img.width, img.height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, img.height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, img.height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, img.height, img.width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, img.width);
      break;
  }
  ctx.drawImage(img, 0, 0);
  const type = 'image/jpeg';
  const blob = await new Promise<Blob>(resolve => {
    if (canvas.toBlob) {
      canvas.toBlob(result => resolve(result!), type);
    } else {
      const dataURL = canvas.toDataURL(type);
      const bin = atob(dataURL.split(',')[1]);
      const buffer = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        buffer[i] = bin.charCodeAt(i);
      }
      resolve(new Blob([buffer.buffer as ArrayBuffer], { type: type }));
    }
  });
  return URL.createObjectURL(blob);
}
