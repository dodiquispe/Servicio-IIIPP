import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class HorarioArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_servicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_profesional?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_dia?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  servicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  dia?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}

@InputType()
export class HorarioOrderArgs {
  @Field(() => String)
  @IsString()
  columna: string;

  @Field(() => String)
  @IsString()
  order: string;
}
