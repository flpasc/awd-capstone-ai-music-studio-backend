import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

// Zod schemas for FFprobe output validation
export const FFprobeStreamSchema = z.object({
  codec_type: z.enum(['video', 'audio', 'subtitle', 'data']),
  codec_name: z.string().optional(),
  codec_long_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  channels: z.number().optional(),
  channel_layout: z.string().optional(),
  bit_rate: z.string().optional(),
  display_aspect_ratio: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

export const FFprobeFormatSchema = z.object({
  duration: z.string().optional(),
  size: z.string().optional(),
  bit_rate: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

export const FFprobeOutputSchema = z.object({
  streams: z.array(FFprobeStreamSchema).optional(),
  format: FFprobeFormatSchema.optional(),
});

// Zod schemas for service output
export const VideoInfoSchema = z.object({
  codec: z.string().optional(),
  codecLong: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  resolution: z.string().nullable(),
  aspectRatio: z.string().nullable(),
  quality: z.enum(['4K', '1440p', '1080p', '720p', '480p', 'SD']).optional(),
});

export const AudioInfoSchema = z.object({
  codec: z.string().optional(),
  codecLong: z.string().optional(),
  channels: z.number().optional(),
  channelLayout: z.string().optional(),
  bitRate: z.number().nullable(),
  language: z.string().optional(),
  channelDescription: z.string().optional(),
});

export const BasicMediaInfoSchema = z.object({
  fileName: z.string(),
  fileExtension: z.string(),
  fileType: z.enum(['video', 'audio', 'unknown']),
  duration: z.number(),
  fileSize: z.number(),
  bitRate: z.number(),
  hasVideo: z.boolean(),
  videoInfo: VideoInfoSchema.nullable(),
  hasAudio: z.boolean(),
  audioInfo: AudioInfoSchema.nullable(),
  metadata: z.record(z.string(), z.string()),
});

// TypeScript types derived from Zod schemas
export type FFprobeStream = z.infer<typeof FFprobeStreamSchema>;
export type FFprobeFormat = z.infer<typeof FFprobeFormatSchema>;
export type FFprobeOutput = z.infer<typeof FFprobeOutputSchema>;
export type VideoInfo = z.infer<typeof VideoInfoSchema>;
export type AudioInfo = z.infer<typeof AudioInfoSchema>;
export type BasicMediaInfo = z.infer<typeof BasicMediaInfoSchema>;

@Injectable()
export class MediaService {
  /**
   * Gets full media file information in JSON format
   * @param {string} filePath - Path to the media file
   * @returns {Promise<FFprobeOutput>} - Full file information
   */
  getFullMediaInfo(filePath: string): Promise<FFprobeOutput> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      let stdout: string = '';
      let stderr: string = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += String(data);
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += String(data);
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const data: unknown = JSON.parse(stdout);
            const validatedData = FFprobeOutputSchema.parse(data);
            resolve(validatedData);
          } catch (parseError) {
            if (parseError instanceof Error) {
              reject(new Error(`Error parsing JSON: ${parseError.message}`));
            } else {
              console.error('Unknown error parsing JSON:', parseError);
              reject(new Error('Unknown error parsing JSON'));
            }
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}: ${stderr}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`Error starting ffprobe: ${error.message}`));
      });
    });
  }

  /**
   * Extracts basic media file information
   * @param {string} filePath - Path to the media file
   * @returns {Promise<BasicMediaInfo>} - Basic file information
   */
  async getBasicMediaInfo(filePath: string): Promise<BasicMediaInfo> {
    try {
      const fullInfo = await this.getFullMediaInfo(filePath);

      // Find video and audio streams
      const videoStream = fullInfo.streams?.find(
        (s) => s.codec_type === 'video',
      );
      const audioStream = fullInfo.streams?.find(
        (s) => s.codec_type === 'audio',
      );

      // Extract general format info
      const format = fullInfo.format || {};
      const duration = parseFloat(format.duration || '0') || 0;
      const fileSize = parseInt(format.size || '0') || 0;
      const bitRate = parseInt(format.bit_rate || '0') || 0;

      // Determine file type
      const fileExtension = path.extname(filePath).toLowerCase();
      const isVideo = !!videoStream;
      const isAudio = !!audioStream && !videoStream;

      // Basic information
      const basicInfo: BasicMediaInfo = {
        // General
        fileName: path.basename(filePath),
        fileExtension,
        fileType: isVideo ? 'video' : isAudio ? 'audio' : 'unknown',
        duration: duration,
        fileSize: fileSize,
        bitRate: bitRate,

        // Video information
        hasVideo: isVideo,
        videoInfo: null,

        // Audio information
        hasAudio: !!audioStream,
        audioInfo: null,

        // Metadata
        metadata: {},
      };

      // Video information
      if (videoStream) {
        basicInfo.videoInfo = {
          codec: videoStream.codec_name,
          codecLong: videoStream.codec_long_name,
          width: videoStream.width,
          height: videoStream.height,
          resolution:
            videoStream.width && videoStream.height
              ? `${videoStream.width}x${videoStream.height}`
              : null,
          aspectRatio:
            videoStream.display_aspect_ratio ||
            (videoStream.width && videoStream.height
              ? `${videoStream.width}:${videoStream.height}`
              : null),
        };

        // Determine video quality
        if (videoStream.height && videoStream.height >= 2160) {
          basicInfo.videoInfo.quality = '4K';
        } else if (videoStream.height && videoStream.height >= 1440) {
          basicInfo.videoInfo.quality = '1440p';
        } else if (videoStream.height && videoStream.height >= 1080) {
          basicInfo.videoInfo.quality = '1080p';
        } else if (videoStream.height && videoStream.height >= 720) {
          basicInfo.videoInfo.quality = '720p';
        } else if (videoStream.height && videoStream.height >= 480) {
          basicInfo.videoInfo.quality = '480p';
        } else {
          basicInfo.videoInfo.quality = 'SD';
        }
      }

      // Audio information
      if (audioStream) {
        basicInfo.audioInfo = {
          codec: audioStream.codec_name,
          codecLong: audioStream.codec_long_name,
          channels: audioStream.channels,
          channelLayout: audioStream.channel_layout,
          bitRate: parseInt(audioStream.bit_rate || '0') || null,
          language:
            typeof audioStream.tags?.language === 'string'
              ? audioStream.tags.language
              : undefined,
        };

        // Channel description
        const channelNames: Record<number, string> = {
          1: 'Mono',
          2: 'Stereo',
          6: '5.1 Surround',
          8: '7.1 Surround',
        };

        if (basicInfo.audioInfo) {
          basicInfo.audioInfo.channelDescription =
            (audioStream.channels && channelNames[audioStream.channels]) ||
            `${audioStream.channels || 0} channels`;
        }
      }

      // Extract common metadata tags
      const tags = format.tags || {};
      const commonTags = [
        'title',
        'artist',
        'album',
        'album_artist',
        'composer',
        'performer',
        'date',
        'year',
        'genre',
        'track',
        'disc',
        'comment',
        'description',
        'copyright',
        'language',
        'encoder',
        'creation_time',
      ];

      commonTags.forEach((tag) => {
        if (tags[tag]) {
          basicInfo.metadata[tag] = tags[tag];
        }
      });

      // Validate the result with Zod schema
      return BasicMediaInfoSchema.parse(basicInfo);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error parsing file: ${error.message}`);
      }
      throw new Error('Unknown error parsing file');
    }
  }

  async getBasicMediaInfoFromBuffer(
    fileBuffer: Buffer<ArrayBufferLike>,
  ): Promise<BasicMediaInfo> {
    // Create temporary file for analysis
    const filename = `temp_${Date.now()}.tmp`;
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, filename);

    // Write buffer to temporary file
    await fs.writeFile(tempFilePath, fileBuffer);

    // Analyze media file
    const mediaInfo = await this.getBasicMediaInfo(tempFilePath);

    // Clean up temporary file
    await fs.unlink(tempFilePath);

    return mediaInfo;
  }
}
