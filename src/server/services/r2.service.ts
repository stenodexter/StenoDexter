// src/server/services/r2.service.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "~/env";

export default class R2Service {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.bucket = env.R2_BUCKET;
    this.publicUrl = env.R2_PUBLIC_URL;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  static getPublicUrl(key: string) {
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  static extractKeyFromUrl(url: string) {
    const base = process.env.R2_PUBLIC_URL!;
    return url.replace(`${base}/`, "");
  }

  static generateKey(folder: string, ext: string) {
    return `${folder}/${randomUUID()}.${ext}`;
  }

  async generatePresignedUploadUrl(params: {
    folder: string;
    contentType: string;
    ext: string;
  }) {
    const key = R2Service.generateKey(params.folder, params.ext);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 60 * 5, // 5 min
    });

    const fileUrl = `${this.publicUrl}/${key}`;

    return {
      uploadUrl,
      key,
      fileUrl,
    };
  }

  async generatePresignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: 60 * 5,
    });
  }
}

export const r2Service = new R2Service();