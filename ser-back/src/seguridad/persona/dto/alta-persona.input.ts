import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Field, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, registerDecorator, type ValidationError } from 'class-validator';
import { errorDatoPersona, normalizarDatoPersona, type CampoPersona } from '../validacion-alta.js';

/** Declara un campo GraphQL con validación de alta y normalización. */
function datoPersona(campo: CampoPersona): PropertyDecorator {
  return (target, key) => {
    Field(() => String, { nullable: true })(target, key);
    Transform(({ value }) => typeof value === 'string' ? normalizarDatoPersona(value) : value)(target, key);
    registerDecorator({
      name: 'datoPersona',
      target: target.constructor,
      propertyName: String(key),
      validator: {
        validate: value => !errorDatoPersona(campo, value),
        defaultMessage: args => errorDatoPersona(campo, args?.value) ?? 'no es válido',
      },
    });
  };
}

@InputType()
export class AltaPersonaInput {
  @datoPersona('nombres') nombres: string;
  @datoPersona('primer_apellido') primer_apellido: string;
  @datoPersona('segundo_apellido') segundo_apellido: string;
  @datoPersona('nro_documento') nro_documento: string;
  @datoPersona('complemento') complemento?: string;
  @datoPersona('procedencia') procedencia: string;
  @datoPersona('movil') movil: string;
  @datoPersona('fecha_nacimiento') fecha_nacimiento: string;
  @datoPersona('correo_personal') correo_personal: string;

  @Field(() => Int, { nullable: true })
  @IsInt({ message: 'selecciona un elemento válido' })
  @Min(1, { message: 'selecciona un elemento válido' })
  id_genero: number;

  @Field(() => Int, { nullable: true })
  @IsInt({ message: 'selecciona un elemento válido' })
  @Min(1, { message: 'selecciona un elemento válido' })
  id_expedito: number;
}

@InputType()
export class AdmisionInicialInput extends AltaPersonaInput {
  @Field(() => String, { nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? normalizarDatoPersona(value) : value)
  @IsString({ message: 'selecciona un elemento válido' })
  @IsNotEmpty({ message: 'es obligatorio' })
  id_institucion_referencia: string;
}

/** Reúne los errores de todos los campos sin incluir valores de entrada. */
function erroresDeCampos(errors: ValidationError[]): string[] {
  return errors.flatMap(error => {
    const message = error.constraints?.whitelistValidation
      ? 'no se admite en este formulario'
      : Object.values(error.constraints ?? {})[0];
    const value = typeof error.value === 'string' ? error.value.trim() : error.value;
    return [
      ...(message ? [`${error.property}: ${value == null || value === '' ? 'es obligatorio' : message}`] : []),
      ...erroresDeCampos(error.children ?? []),
    ];
  });
}

export const validarInputAlta = new ValidationPipe({
  transform: true,
  validateCustomDecorators: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: errors => new BadRequestException(`Validación de datos: ${erroresDeCampos(errors).join(' | ')}`),
});
