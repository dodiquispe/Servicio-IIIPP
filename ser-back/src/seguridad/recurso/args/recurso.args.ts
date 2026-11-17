import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class RecursoArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  path?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  nivel?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  is_menu?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_recurso_padre?: string;
}

@InputType()
export class RecursoOrderArgs {
  @Field()
  @IsString()
  columna: string;

  @Field()
  @IsString()
  order: string;
}
