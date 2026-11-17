import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class AssignStaffInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_usuario: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_rol: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_servicio?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_asignacion?: string;

  @Field()
  @IsDateString()
  fecha_inicio: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string | null;
}
