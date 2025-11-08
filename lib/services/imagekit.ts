import ImageKit from "imagekit";
import { env } from "@/lib/env";

export const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

export interface UploadOptions {
  file: string | Buffer;
  fileName: string;
  folder?: string;
}

export async function uploadImage(options: UploadOptions): Promise<string> {
  const folder = options.folder || env.IMAGEKIT_UPLOAD_FOLDER;

  const result = await imagekit.upload({
    file: options.file,
    fileName: options.fileName,
    folder: folder,
  });

  return result.url;
}

