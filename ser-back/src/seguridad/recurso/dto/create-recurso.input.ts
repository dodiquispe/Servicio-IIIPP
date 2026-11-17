import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateRecursoInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  nivel?: number;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  icon: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  path?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_recurso_padre?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_estado?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  is_menu?: boolean;
}
