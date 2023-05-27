import * as EXIF from 'exif-js/exif';

export class DecryptedImage {
  readonly decryptedData: ArrayBuffer;
  url: string;
  readonly originalImageUrl: string;
  readonly tags: any;
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