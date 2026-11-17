import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as moment from 'moment';

@Injectable()
export class utils {
  public getuuid(): string {
    return uuid();
  }

  public anidarobjeto(partes: string[], valor: string) {
    let objetoFinal: Record<string, unknown> = {};
    let objetoTemporal: Record<string, unknown> = {};
    for (let index = partes.length; index > 0; index--) {
      if (index === partes.length) {
        objetoFinal[partes[index - 1]] = valor;
      } else {
        objetoTemporal = objetoFinal;
        objetoFinal = {};
        objetoFinal[partes[index - 1]] = objetoTemporal;
      }
    }
    return objetoFinal;
  }

  public filtros(
    objetoBusqueda: Record<string, unknown>,
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const key in objetoBusqueda) {
      const valor = objetoBusqueda[key];
      if (typeof valor === 'string') {
        obj[key] = ILike(`%${valor}%`);
      } else if (typeof valor === 'number') {
        obj[key] = valor;
      } else if (
        valor !== null &&
        typeof valor === 'object' &&
        !Array.isArray(valor)
      ) {
        obj[key] = this.filtros(valor as Record<string, unknown>);
      } else {
        obj[key] = valor;
      }
    }
    return obj;
  }

  public elimiarDeArrayAtributosDeObjetos(array: any[], atributo: string) {
    const nuevoArray = new Set();
    const arraySinDuplicados = array.filter((objeto) => {
      if (!nuevoArray.has(objeto[atributo])) {
        nuevoArray.add(objeto[atributo]);
        return true;
      } else {
        return false;
      }
    });

    return arraySinDuplicados;
  }

  /* public calcularTiempoPasado(fecha: Date): string {
    moment.locale('es');
    const date = moment(new Date(fecha));
    return date.fromNow();
  }*/

  /*public restarDias(fecha: Date, totalDias: number): Date {
    const date = moment(new Date(fecha));
    return date.subtract(totalDias, 'days').toDate();
  }*/
}
