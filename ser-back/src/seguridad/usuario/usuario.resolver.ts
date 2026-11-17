import { Servicio } from '../../serviciosiiipp/servicio/entities/servicio.entity.js';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Field,
  ObjectType,
  ArgsType,
  Context,
} from '@nestjs/graphql';
import { UsuarioService } from './usuario.service.js';
import { Usuario } from './entities/usuario.entity.js';
import { CreateUsuarioInput } from './dto/create-usuario.input.js';
import { UpdateUsuarioInput } from './dto/update-usuario.input.js';
import { GrantUsuarioAccessInput } from './dto/grant-usuario-access.input.js';
import { CreateUsuarioCompletoInput } from './dto/create-usuario-completo.input.js';
import { ReactivateInactiveAccountInput } from './dto/reactivate-inactive-account.input.js';
import { UsuarioArgs } from './args/usuario.args.js';
import type {
  MenuResource,
  UsuarioAccessLookup,
} from './usuario.service.js';
import { Rol } from '../rol/entities/rol.entity.js';
import { Public, Roles } from '../auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/graphql-auth.guard.js';
import { Persona } from '../persona/entities/persona.entity.js';

@ObjectType()
class UsuarioAccessLookupOutput implements UsuarioAccessLookup {
  @Field(() => Persona)
  persona: Persona;

  @Field(() => Usuario, { nullable: true })
  usuario:
    | Pick<Usuario, 'id' | 'nombre_usuario' | 'id_estado' | 'correo'>
    | null;
}

@ArgsType()
class LoginUsuarioArgs {
  @Field()
  nombre_usuario: string;

  @Field()
  contrasena: string;
}

@ObjectType()
class MenuResourceOutput implements MenuResource {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  id_recurso_padre: string | null;

  @Field()
  title: string;

  @Field()
  icon: string;

  @Field(() => String, { nullable: true })
  path: string | null;

}

@ObjectType()
class LoginUsuarioOutput {
  @Field()
  accessToken: string;

  @Field(() => Usuario)
  usuario: Usuario;

  @Field(() => [Rol])
  roles: Rol[];

  @Field(() => [MenuResourceOutput])
  recursos: MenuResourceOutput[];
}

@ObjectType()
class UsuariosPage {
  @Field(() => [Usuario])
  rows: Usuario[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Usuario)
@Roles('administrador', 'coordinador', 'responsable')
export class UsuarioResolver {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Mutation(() => LoginUsuarioOutput)
  @Public()
  loginUsuario(
    @Args() input: LoginUsuarioArgs,
    @Context() context: { req: AuthenticatedRequest & { ip?: string } },
  ) {
    return this.usuarioService.login(
      input.nombre_usuario,
      input.contrasena,
      context.req.ip,
      context.req.headers['user-agent'],
    );
  }

  @Mutation(() => Usuario)
  createUsuario(
    @Args('createUsuarioInput') createUsuarioInput: CreateUsuarioInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.createBasicAccount(
      createUsuarioInput,
      context.req.user!.sub,
    );
  }

  @Mutation(() => Usuario)
  createUsuarioCompleto(
    @Args('input') input: CreateUsuarioCompletoInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.createWithPersonAndRole(
      input,
      context.req.user!.sub,
    );
  }

  @Mutation(() => Usuario, { name: 'crearIntegranteEquipo' })
  @Roles('administrador', 'coordinador', 'responsable', 'secretaria')
  createTeamMember(
    @Args('input') input: CreateUsuarioCompletoInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.createWithPersonAndRole(input, context.req.user!.sub);
  }

  @Query(() => [Servicio])
  @Roles('administrador', 'coordinador', 'responsable', 'secretaria')
  serviciosGestionPersonal(@Context() ctx: { req: AuthenticatedRequest }) { return this.usuarioService.serviciosGestionPersonal(ctx.req.user!.sub); }

  @Query(() => UsuariosPage)
  @Roles('administrador', 'coordinador', 'responsable', 'secretaria')
  personalServicio(
    @Args('tipo') tipo: string, @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Context() ctx: { req: AuthenticatedRequest },
    @Args('search', { type: () => UsuarioArgs, nullable: true }) search?: UsuarioArgs,
  ) { return this.usuarioService.personalServicio(ctx.req.user!.sub, tipo, limit, pagina, search); }

  @Query(() => UsuariosPage, { name: 'usuarios' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true })
    search?: UsuarioArgs,
  ) {
    return this.usuarioService.findAll(limit, pagina, search);
  }

  @Query(() => UsuariosPage, { name: 'usuariosAdministracion' })
  @Roles('administrador')
  findAllForAdministration(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true })
    search?: UsuarioArgs,
  ) {
    return this.usuarioService.findAllForAdministration(limit, pagina, search);
  }

  @Query(() => UsuariosPage, { name: 'cuentasAdministracion' })
  @Roles('administrador')
  findAccountsForAdministration(
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true }) search?: UsuarioArgs,
  ) {
    return this.usuarioService.findAllForAdministration(limit, pagina, search);
  }

  @Query(() => UsuariosPage, { name: 'cuentasDadasDeBajaAdministracion' })
  @Roles('administrador')
  findDeletedAccountsForAdministration(
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true }) search?: UsuarioArgs,
  ) {
    return this.usuarioService.findDeletedForAdministration(limit, pagina, search);
  }

  @Query(() => UsuariosPage, { name: 'equipoTrabajoAdministracion' })
  @Roles('administrador')
  findTeamForAdministration(
    @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true }) search?: UsuarioArgs,
  ) {
    return this.usuarioService.findTeamForAdministration(limit, pagina, search);
  }

  @Query(() => UsuariosPage, { name: 'cuentasInactivasAdministracion' })
  @Roles('administrador')
  findInactiveForAdministration(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioArgs, nullable: true })
    search?: UsuarioArgs,
  ) {
    return this.usuarioService.findInactiveForAdministration(
      limit,
      pagina,
      search,
    );
  }

  @Query(() => UsuarioAccessLookupOutput, {
    name: 'personaParaAcceso',
    nullable: true,
  })
  @Roles('administrador')
  findPersonForAccess(
    @Args('nro_documento', { type: () => String }) nroDocumento: string,
  ) {
    return this.usuarioService.findPersonForAccess(nroDocumento);
  }

  @Query(() => Usuario, { name: 'usuario' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.usuarioService.findOne(id);
  }

  @Mutation(() => Usuario)
  updateUsuario(
    @Args('updateUsuarioInput') updateUsuarioInput: UpdateUsuarioInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.update(
      updateUsuarioInput.id,
      updateUsuarioInput,
      context.req.user!.sub,
    );
  }

  @Mutation(() => Usuario, { name: 'actualizarMiPerfil' })
  @Roles('administrador', 'coordinador', 'responsable', 'practicante', 'secretaria')
  actualizarMiPerfil(
    @Args('correo', { type: () => String, nullable: true }) correo: string | null,
    @Args('movil', { type: () => String, nullable: true }) movil: string | null,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.updateOwnProfile(context.req.user!.sub, correo, movil);
  }

  @Mutation(() => Boolean, { name: 'cambiarMiContrasena' })
  @Roles('administrador', 'coordinador', 'responsable', 'practicante', 'secretaria')
  cambiarMiContrasena(
    @Args('actual', { type: () => String }) actual: string,
    @Args('nueva', { type: () => String }) nueva: string,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.changeOwnPassword(context.req.user!.sub, actual, nueva);
  }

  @Mutation(() => Usuario, { name: 'actualizarIntegranteEquipo' })
  @Roles('administrador', 'coordinador', 'responsable', 'secretaria')
  updateTeamMember(
    @Args('input') input: UpdateUsuarioInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.update(input.id, input, context.req.user!.sub);
  }

  @Mutation(() => Usuario)
  @Roles('administrador')
  removeUsuario(
    @Args('id', { type: () => String }) id: string,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.remove(id, context.req.user!.sub);
  }

  @Mutation(() => Usuario, { name: 'darDeBajaIntegranteEquipo' })
  @Roles('administrador')
  removeTeamMember(
    @Args('id', { type: () => String }) id: string,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.remove(id, context.req.user!.sub);
  }

  @Mutation(() => Usuario, { name: 'cambiarEstadoCuenta' })
  @Roles('administrador')
  cambiarEstadoCuenta(
    @Args('id', { type: () => String }) id: string,
    @Args('active', { type: () => Boolean }) active: boolean,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.setAccountActive(id, active, context.req.user!.sub);
  }

  @Mutation(() => Usuario)
  @Roles('administrador')
  otorgarAccesoUsuario(
    @Args('input') input: GrantUsuarioAccessInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.grantAccess(input, context.req.user!.sub);
  }

  @Mutation(() => Usuario)
  @Roles('administrador')
  reactivarCuentaInactiva(
    @Args('input') input: ReactivateInactiveAccountInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.reactivateInactiveAccount(
      input,
      context.req.user!.sub,
    );
  }

  @Mutation(() => Usuario, { name: 'reactivarCuentaDadaDeBaja' })
  @Roles('administrador')
  reactivateDeletedAccount(
    @Args('input') input: ReactivateInactiveAccountInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.usuarioService.reactivateInactiveAccount(input, context.req.user!.sub);
  }

  @Mutation(() => Boolean)
  @Roles('administrador')
  resetUsuarioContrasena(
    @Args('id', { type: () => String }) id: string,
    @Context() context: { req: AuthenticatedRequest },
    @Args('nro_documento', { type: () => String, nullable: true }) _nroDocumento?: string,
  ) {
    return this.usuarioService.resetPassword(id, context.req.user!.sub);
  }
}
