import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class ReporteAtencionesArgs {
  @Field(() => String, { nullable: true }) @IsOptional() @IsIn(['SEMANA', 'MES', 'ANIO']) periodo?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsDateString() fecha_referencia?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsDateString() fecha_inicial?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsDateString() fecha_final?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() id_servicio?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() @MaxLength(200) municipio?: string;
}

@InputType()
export class AgendaResponsableArgs {
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() id_responsable?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() id_servicio?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsDateString() fecha_inicial?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsDateString() fecha_final?: string;
}

@InputType()
export class AgendaResponsableOrderArgs {
  @Field(() => String) @IsString() columna: string;
  @Field(() => String) @IsString() order: string;
}
