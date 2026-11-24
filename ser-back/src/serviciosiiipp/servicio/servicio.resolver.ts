import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { ServicioArgs, ServicioOrderArgs } from './args/servicio.args.js';
import { CreateServicioInput } from './dto/create-servicio.input.js';
import { UpdateServicioInput } from './dto/update-servicio.input.js';
import { Servicio } from './entities/servicio.entity.js';
import { ServicioService } from './servicio.service.js';
import { Public, Roles } from '../../seguridad/auth/graphql-auth.decorator.js';

@ObjectType()
class ServiciosPage {
  @Field(() => [Servicio])
  rows: Servicio[];

  @Field(() => Int)
  count: number;
}

@ObjectType()
class ServicioDisponibleReserva {
  @Field(() => String)
  id: string;

  @Field(() => String)
  nombre: string;
}

@Resolver(() => Servicio)
@Roles('responsable', 'administrador', 'coordinador')
export class ServicioResolver {
  constructor(private readonly servicioService: ServicioService) {}

  @Query(() => [ServicioDisponibleReserva])
  @Public()
  serviciosDisponiblesReserva(): Promise<ServicioDisponibleReserva[]> {
    return this.servicioService.listarDisponiblesParaReserva();
  }

  @Mutation(() => Servicio)
  createServicio(
    @Args('createServicioInput') input: CreateServicioInput,
  ): Promise<Servicio> {
    return this.servicioService.create(input);
  }

  @Query(() => ServiciosPage, { name: 'servicios' })
  @Public()
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => ServicioArgs, nullable: true })
    search?: ServicioArgs,
    @Args('order', { type: () => ServicioOrderArgs, nullable: true })
    order?: ServicioOrderArgs,
  ): Promise<{ rows: Servicio[]; count: number }> {
    return this.servicioService.findAll(limit, pagina, search, order);
  }

  @Query(() => Servicio, { name: 'servicio' })
  findOne(
    @Args('id', { type: () => String }) id: string,
  ): Promise<Servicio> {
    return this.servicioService.findOne(id);
  }

  @Mutation(() => Servicio)
  updateServicio(
    @Args('updateServicioInput') input: UpdateServicioInput,
  ): Promise<Servicio> {
    return this.servicioService.update(input.id, input);
  }

  @Mutation(() => Servicio)
  removeServicio(
    @Args('id', { type: () => String }) id: string,
  ): Promise<Servicio> {
    return this.servicioService.remove(id);
  }
}
