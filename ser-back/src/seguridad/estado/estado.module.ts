import { Module } from '@nestjs/common';
import { EstadoService } from './estado.service.js';
import { EstadoResolver } from './estado.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado } from './entities/estado.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Estado], 'services')],
  exports: [EstadoService],
  providers: [EstadoResolver, EstadoService],
})
export class EstadoModule {}
