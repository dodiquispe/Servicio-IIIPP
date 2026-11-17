import { Module } from '@nestjs/common';
import { RolService } from './rol.service.js';
import { RolResolver } from './rol.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Rol], 'services')],
  providers: [RolResolver, RolService],
  exports: [RolService, TypeOrmModule],
})
export class RolModule {}
