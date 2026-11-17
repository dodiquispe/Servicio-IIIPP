import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { jwtVerify } from 'jose';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { PUBLIC_ROUTE_KEY } from './graphql-auth.decorator.js';

export interface AuthenticatedRequest {
  headers: { authorization?: string; 'user-agent'?: string | string[] };
  user?: { sub: string; roles: string[] };
}

@Injectable()
export class GraphqlAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource('services') private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<string>() !== 'graphql') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const gqlContext = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    const authorization = gqlContext.req.headers.authorization;
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Se requiere iniciar sesión');

    try {
      const { payload } = await jwtVerify(token, signingKey());
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string' ||
        !Array.isArray(payload.roles) ||
        !payload.roles.every((role) => typeof role === 'string')
      ) {
        throw new UnauthorizedException('La sesión no es válida');
      }
      const activeUser = await this.dataSource
        .getRepository(Usuario)
        .findOneBy({ id: payload.sub, id_estado: 1 });
      if (!activeUser) {
        throw new UnauthorizedException('La cuenta está inactiva');
      }
      const activeToken = await this.dataSource.query(
        'SELECT 1 FROM seguridad.sys_token WHERE id = $1 AND id_usuario = $2 AND revocado_en IS NULL AND vence_en > NOW()',
        [payload.jti, payload.sub],
      );
      if (!activeToken.length) {
        throw new UnauthorizedException('La sesión fue revocada o expiró');
      }
      gqlContext.req.user = {
        sub: payload.sub,
        roles: payload.roles,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('La sesión expiró o no es válida');
    }
  }
}

export function signingKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes');
  }
  return new TextEncoder().encode(secret);
}
