import { Injectable } from '@nestjs/common';
import { Client, BucketItem } from 'minio';

@Injectable()
export class StorageService {
  private minioClient: Client;

  // TODO: Should i put the minio connection in a extra singleton class?
  constructor() {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  // TODO: Proper error handling
  // Create new bucket
  async createBucket(bucketName: string): Promise<string> {
    try {
      const bucketExists = await this.minioClient.bucketExists(bucketName);

      if (bucketExists) {
        return `Bucket: ${bucketName} already exists`;
      }

      await this.minioClient.makeBucket(bucketName);
      return `Bucket with name: ${bucketName} created successfully`;
    } catch (error) {
      throw new Error(`Error creating bucket: ${error}`);
    }
  }

  // List all buckets
  async listBuckets(): Promise<string[]> {
    try {
      const buckets = await this.minioClient.listBuckets();
      return buckets.map((bucket) => bucket.name);
    } catch (error) {
      throw new Error(`List buckets failed: ${error}`);
    }
  }

  // List all bucket files
  async listFiles(bucketName: string): Promise<string[]> {
    try {
      const objects: string[] = [];
      const stream = this.minioClient.listObjectsV2(bucketName, '', true, '');
      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItem) => {
          if (obj.name) {
            objects.push(obj.name);
          }
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Minio list failed: ${error}`);
    }
  }

  // Upload a new file
  async uploadFile(
    bucketName: string,
    objectName: string,
    file: Buffer,
  ): Promise<string> {
    try {
      const bucketExists = await this.minioClient.bucketExists(bucketName);

      if (!bucketExists) {
        await this.createBucket(bucketName);
      }

      await this.minioClient.putObject(bucketName, objectName, file);
      return `File uploaded successfully: ${objectName}`;
    } catch (error) {
      throw new Error(`Upload failed: ${error}`);
    }
  }

  // Download a file
  async getFile(bucketName: string, objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      throw new Error(`Download failed: ${error}`);
    }
  }

  // Delete single file
  async deleteFile(bucketName: string, objectName: string): Promise<string> {
    try {
      await this.minioClient.removeObject(bucketName, objectName);
      return `File deleted successfully: ${objectName}`;
    } catch (error) {
      throw new Error(`Delete failed: ${error}`);
    }
  }
}
