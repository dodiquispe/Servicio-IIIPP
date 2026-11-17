import { InputType, Int, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

@InputType()
export class CreateRolInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  descripcion: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  icono: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id_sec: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  id_estado?: number;
}
