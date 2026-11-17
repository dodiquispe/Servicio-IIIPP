import { ObjectType } from '@nestjs/graphql';
import { Persona } from '../../entities/persona.entity.js';

@ObjectType()
export class PersonaOutput {}
