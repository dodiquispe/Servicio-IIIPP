import { Args, Field, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException } from '@nestjs/common';
import { InstitucionReferenciaArgs, InstitucionReferenciaOrderArgs } from './args/institucionReferencia.args.js';
import { Public, Roles } from '../../seguridad/auth/graphql-auth.decorator.js';
import { CreateInstitucionReferenciaInput, UpdateInstitucionReferenciaInput } from './dto/institucion-referencia.input.js';
import { InstitucionReferencia } from './entities/institucion-referencia.entity.js';
import { InstitucionReferenciaService } from './institucion-referencia.service.js';

@ObjectType()
class InstitucionReferenciasPage {
  @Field(() => [InstitucionReferencia])
  rows: InstitucionReferencia[];
  @Field(() => Int)
  count: number;
}

@Resolver(() => InstitucionReferencia)
export class InstitucionReferenciaResolver {
  constructor(private readonly service: InstitucionReferenciaService) {}

  @Query(() => [InstitucionReferencia], { name: 'institucionesReferenciaActivas' })
  @Public()
  findActive() {
    return this.service.findActive();
  }

  @Query(() => [InstitucionReferencia], { name: 'institucionesReferencia' })
  @Roles('administrador')
  findAll() {
    return this.service.findAll();
  }

  @Query(() => InstitucionReferenciasPage, { name: 'institucionReferencias' })
  @Roles('administrador')
  findPage(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => InstitucionReferenciaArgs, nullable: true }) search?: InstitucionReferenciaArgs,
    @Args('order', { type: () => InstitucionReferenciaOrderArgs, nullable: true }) order?: InstitucionReferenciaOrderArgs,
  ) { return this.service.findPage(limit, pagina, search, order); }

  @Mutation(() => InstitucionReferencia)
  @Roles('administrador')
  createInstitucionReferencia(
    @Args('input', { type: () => CreateInstitucionReferenciaInput, nullable: true }) input?: CreateInstitucionReferenciaInput,
    @Args('createInstitucionReferenciaInput', { type: () => CreateInstitucionReferenciaInput, nullable: true }) crudInput?: CreateInstitucionReferenciaInput,
  ) {
    const datos = input ?? crudInput;
    if (!datos) throw new BadRequestException('Ingrese los datos de la institución');
    return this.service.create(datos);
  }

  @Mutation(() => InstitucionReferencia)
  @Roles('administrador')
  updateInstitucionReferencia(
    @Args('input', { type: () => UpdateInstitucionReferenciaInput, nullable: true }) input?: UpdateInstitucionReferenciaInput,
    @Args('updateInstitucionReferenciaInput', { type: () => UpdateInstitucionReferenciaInput, nullable: true }) crudInput?: UpdateInstitucionReferenciaInput,
  ) {
    const datos = input ?? crudInput;
    if (!datos) throw new BadRequestException('Ingrese los datos de la institución');
    return this.service.update(datos);
  }

  @Mutation(() => InstitucionReferencia)
  @Roles('administrador')
  removeInstitucionReferencia(@Args('id') id: string) {
    return this.service.remove(id);
  }
}
