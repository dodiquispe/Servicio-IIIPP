import { CreatePersonaInput } from './create-persona.input.js';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

@InputType()
export class UpdatePersonaInput extends PartialType(CreatePersonaInput) {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  id: string;
}
