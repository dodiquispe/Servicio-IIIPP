import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class PersonaArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nombres?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  primer_apellido?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  segundo_apellido?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nro_documento?: string;
}

@InputType()
export class PersonaOrderArgs {
  @Field()
  @IsString()
  columna: string;

  @Field()
  @IsString()
  order: string;
}
