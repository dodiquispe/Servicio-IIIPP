import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaService } from './persona.service.js';
import { PersonaResolver } from './persona.resolver.js';
import { Persona } from './entities/persona.entity.js';
import { InstitucionReferencia } from '../../serviciosiiipp/institucion-referencia/entities/institucion-referencia.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Persona, InstitucionReferencia], 'services')],
  providers: [PersonaResolver, PersonaService],
  exports: [PersonaService, TypeOrmModule],
})
export class PersonaModule {}
