import { Injectable } from '@nestjs/common';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { z } from 'zod';

export const DependenciesStatusSchema = z.enum(['ok', 'unreachable']);
export type DependenciesStatus = z.infer<typeof DependenciesStatusSchema>;

export const HealtCheckSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string(),
  uptime: z.number(),
  dependencies: z.object({
    // worker: DependenciesStatusSchema,
    frontend: DependenciesStatusSchema,
    database: DependenciesStatusSchema,
  }),
});

export type HealthCheck = z.infer<typeof HealtCheckSchema>;

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  async getHealth(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Helper to check HTTP service
    const checkHttp = async (url: string): Promise<DependenciesStatus> => {
      return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 1000 }, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve('ok');
          } else {
            resolve('unreachable');
          }
          res.resume(); // Consume response data to free up memory
        });
        req.on('error', () => resolve('unreachable'));
        req.on('timeout', () => {
          req.destroy();
          resolve('unreachable');
        });
      });
    };
    const checkTcp = (
      host: string,
      port: number,
    ): Promise<DependenciesStatus> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve('ok');
        });
        socket.on('error', () => {
          resolve('unreachable');
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve('unreachable');
        });
        socket.connect(port, host);
      });
    };

    const [frontend, database] = await Promise.all([
      // TODO: Worker needs a healthz endpoint
      // checkHttp('http://localhost:3002'),
      checkHttp('http://localhost:3000'),
      checkTcp('localhost', 5432),
    ]);
    return {
      status: frontend === 'ok' && database === 'ok' ? 'ok' : 'degraded',
      timestamp,
      uptime,
      dependencies: {
        // worker,
        frontend,
        database,
      },
    };
  }
}
