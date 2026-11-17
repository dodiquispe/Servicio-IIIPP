import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

@InputType()
export class CreateDisponibilidadInput {
  @Field()
  @IsDateString({ strict: true })
  fecha: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  hora_inicio: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  hora_fin: string;
}
