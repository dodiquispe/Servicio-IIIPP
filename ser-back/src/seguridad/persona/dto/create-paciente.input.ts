import { Field, InputType, Int, OmitType } from '@nestjs/graphql';
import { IsEmail, IsInt, Max, MaxLength, Min } from 'class-validator';
import { CreatePersonaInput } from './create-persona.input.js';

@InputType()
export class CreatePacienteInput extends OmitType(CreatePersonaInput, ['edad', 'correo_personal'] as const) {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(120)
  edad: number;

  @Field()
  @IsEmail()
  @MaxLength(100)
  correo_personal: string;
}
