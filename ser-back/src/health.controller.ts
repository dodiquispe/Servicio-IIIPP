import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource('services') private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { app: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ app: 'ok', database: 'unavailable' });
    }
  }
}
