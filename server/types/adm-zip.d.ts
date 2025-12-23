declare module 'adm-zip' {
  import { Buffer } from 'buffer';

  export interface IZipEntry {
    entryName: string;
    name: string;
    header?: any;
    crc32?: number;
    compressedSize?: number;
    uncompressedSize?: number;
    comment?: string;
    extra?: any;
    isDirectory: boolean;
    getData(): Buffer;
    getDataAsync?(callback: (err: Error | null, data: Buffer) => void): void;
  }

  export default class AdmZip {
    constructor(input?: string | Buffer);
    getEntries(): IZipEntry[];
    getEntry(entryName: string): IZipEntry | null;
    readAsText(entry: IZipEntry | string, encoding?: string): string;
  }
  
}
