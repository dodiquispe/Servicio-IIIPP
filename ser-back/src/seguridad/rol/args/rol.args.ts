import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@InputType()
export class RolArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  icono?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_sec?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}

@InputType()
export class RolOrderArgs {
  @Field()
  @IsString()
  columna: string;

  @Field()
  @IsString()
  order: string;
}
