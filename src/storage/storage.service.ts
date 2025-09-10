import { Injectable } from '@nestjs/common';
import { BucketItem, Client } from 'minio';
import { StorageUrl } from 'src/projects/entities/project.entity';

@Injectable()
export class StorageService {
  private readonly minioClient: Client;
  private readonly minioPresignedUrlClient: Client;
  private readonly DEFAULT_BUCKET_NAME = 'app-assets';
  private readonly expireTime = parseInt(
    process.env.MINIO_PRESIGNED_URL_EXPIRE_TIME ?? '3600',
  );

  // TODO: Proper error handling
  // TODO: Should i put the minio connection in a extra singleton class?
  constructor() {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    this.minioPresignedUrlClient = new Client({
      endPoint: 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  /**
   * Helper to generate object path: userId/projectId/filename
   */
  public static generateObjectPath(
    userId: string,
    projectId: string,
    filename: string,
  ): string {
    return `${userId}/${projectId}/${filename}`;
  }

  /**
   * Initialze default bucket if it doesnt exist
   */
  async initializeDefaultBucket(): Promise<void> {
    try {
      const bucketExists = await this.minioClient.bucketExists(
        this.DEFAULT_BUCKET_NAME,
      );
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.DEFAULT_BUCKET_NAME);
        console.log(`Default bucket initialized: ${this.DEFAULT_BUCKET_NAME}`);
      }
    } catch (error) {
      throw new Error(`Error initializing default bucket: ${error}`);
    }
  }

  /**
   * Create a new bucket if bucket with name doesent exist
   */
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

  /**
   * Lists all available buckets
   */
  async listBuckets(): Promise<string[]> {
    try {
      const buckets = await this.minioClient.listBuckets();
      return buckets.map((bucket) => bucket.name);
    } catch (error) {
      throw new Error(`List buckets failed: ${error}`);
    }
  }

  /**
   * Lists all files for a given project
   */
  async listProjectFiles(userId: string, projectId: string): Promise<string[]> {
    try {
      await this.initializeDefaultBucket();
      const prefix = `${userId}/${projectId}`;
      const objects: string[] = [];
      const stream = this.minioClient.listObjectsV2(
        this.DEFAULT_BUCKET_NAME,
        prefix,
        true,
        '',
      );

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItem) => {
          if (obj.name) {
            const filename = obj.name.replace(prefix, '');
            objects.push(filename);
          }
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Failed to list project: ${projectId} files: ${error}`);
    }
  }

  /**
   * List all files of a given user
   */
  async listUserFiles(
    userId: string,
  ): Promise<{ projectId: string; filename: string; fullPath: string }[]> {
    try {
      await this.initializeDefaultBucket();
      const prefix = `${userId}/`;
      const objects: {
        projectId: string;
        filename: string;
        fullPath: string;
      }[] = [];
      const stream = this.minioClient.listObjectsV2(
        this.DEFAULT_BUCKET_NAME,
        prefix,
        true,
        '',
      );

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItem) => {
          if (obj.name) {
            const pathParts = obj.name.replace(prefix, '').split('/');
            if (pathParts.length >= 2) {
              objects.push({
                projectId: pathParts[0],
                filename: pathParts.slice(1).join('/'), // Handle nested files
                fullPath: obj.name,
              });
            }
          }
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Failed to list user files: ${error}`);
    }
  }

  /**
   * Lists all project generations
   */
  async listProjectGenerations(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    try {
      await this.initializeDefaultBucket();
      const prefix = `${userId}/${projectId}/generations/`;
      const objects: string[] = [];
      const stream = this.minioClient.listObjectsV2(
        this.DEFAULT_BUCKET_NAME,
        prefix,
        true,
        '',
      );

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItem) => {
          if (obj.name) {
            const filename = obj.name.replace(prefix, '');
            objects.push(filename);
          }
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Failed to list project: ${projectId} files: ${error}`);
    }
  }

  /**
   * Upload a file to a given project
   */
  async uploadFile(
    userId: string,
    projectId: string,
    filename: string,
    file: Buffer,
  ): Promise<string> {
    try {
      await this.initializeDefaultBucket();
      const objectPath = StorageService.generateObjectPath(
        userId,
        projectId,
        filename,
      );

      await this.minioClient.putObject(
        this.DEFAULT_BUCKET_NAME,
        objectPath,
        file,
      );
      return `File uploaded successfully: ${objectPath}`;
    } catch (error) {
      throw new Error(`Upload failed: ${error}`);
    }
  }

  /**
   * Delete a file from a project
   */
  async deleteFile(
    userId: string,
    projectId: string,
    filename: string,
  ): Promise<string> {
    try {
      const objectPath = StorageService.generateObjectPath(
        userId,
        projectId,
        filename,
      );
      await this.minioClient.removeObject(this.DEFAULT_BUCKET_NAME, objectPath);
      return `File deleted successfully: ${objectPath}`;
    } catch (error) {
      throw new Error(`Delete failed: ${error}`);
    }
  }

  /**
   * Generate a presigned upload url
   * used by worker for generated video upload
   */
  async getUploadPresignedUrl(
    userId: string,
    projectId: string,
    filename: string,
    expirySeconds: number = this.expireTime,
  ): Promise<string> {
    try {
      await this.initializeDefaultBucket();
      const objectPath = StorageService.generateObjectPath(
        userId,
        projectId,
        filename,
      );

      return await this.minioClient.presignedPutObject(
        this.DEFAULT_BUCKET_NAME,
        objectPath,
        expirySeconds,
      );
    } catch (error) {
      throw new Error(`Failed to generate upload URL: ${error}`);
    }
  }

  /**
   * Delete all files in a project
   */
  async deleteAllProjectFiles(
    userId: string,
    projectId: string,
  ): Promise<string> {
    try {
      const files = await this.listProjectFiles(userId, projectId);
      const deletePromises = files.map((filename) =>
        this.deleteFile(userId, projectId, filename),
      );

      await Promise.all(deletePromises);
      return `All files deleted for project: ${projectId} of user: ${userId}`;
    } catch (error) {
      throw new Error(`Bulk delete failed: ${error}`);
    }
  }

  /**
   * Get presigned url from a object
   */
  async getDownloadPresignedUrl(
    userId: string,
    projectId: string,
    filename: string,
    expirySeconds: number = this.expireTime,
  ): Promise<string> {
    try {
      const objectPath = StorageService.generateObjectPath(
        userId,
        projectId,
        filename,
      );

      return this.minioPresignedUrlClient.presignedGetObject(
        this.DEFAULT_BUCKET_NAME,
        objectPath,
        expirySeconds,
      );
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error}`);
    }
  }

  /*
   * Get all objects urls from a given project
   */
  async getProjectFilesWithUrls(
    userId: string,
    projectId: string,
    expirySeconds: number = this.expireTime,
  ): Promise<StorageUrl[]> {
    try {
      const filenames = await this.listProjectFiles(userId, projectId);

      const filesWithUrls = await Promise.all(
        filenames.map(async (filename) => ({
          filename,
          downloadUrl: await this.getDownloadPresignedUrl(
            userId,
            projectId,
            filename,
            expirySeconds,
          ),
        })),
      );

      return filesWithUrls;
    } catch (error) {
      throw new Error(`Failed to get project files with URLs: ${error}`);
    }
  }
}
