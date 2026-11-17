import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class ServicioArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  servicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad_simultanea?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracion_sesion_min?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_estado?: number;
}

@InputType()
export class ServicioOrderArgs {
  @Field(() => String)
  @IsString()
  columna: string;

  @Field(() => String)
  @IsString()
  order: string;
}
