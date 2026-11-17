interface ExtendedDocument {
  mozFullScreenElement?: Element;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
  fullscreenElement?: Element;
}
let tmplPrint = `<!DOCTYPE html>
                  <html lang="es">
                  <head>
                    <meta charset="UTF-8"/>
                    <title>Document</title>
                    <style>{css}</style>
                  </head>
                  <body>
                    {body}
                  </body>
                  </html>`;

const Util = {
  nano(template: string, data: any) {
    return template.replace(/\{([\w\.]*)\}/g, function (str, key) {
      // eslint-disable-line
      let keys = key.split(".");
      let v = data[keys.shift()];
      for (let i = 0, l = keys.length; i < l; i++) {
        v = v[keys[i]];
      }
      return typeof v !== "undefined" && v !== null ? v : "";
    });
  },

  print(body: any, css: any) {
    let popup = window.open("", "print");
    let html = this.nano(tmplPrint, { body, css });
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
      popup.close();
    }
  },

  toType(obj: any) {
    if (obj !== null && obj !== undefined) {
      const objType = {}.toString.call(obj).match(/\s([a-zA-Z]+)/);
      if (objType) {
        return objType[1].toLowerCase();
      }
    }
    // En caso de que obj sea null, undefined o no se pueda determinar su tipo, puedes devolver un valor por defecto o manejarlo de otra manera según tus necesidades.
    return "undefined";
  },

  isJson(text: string) {
    // return /^[\],:{}\s]*$/.test(text.replace(/\\["\\\/bfnrtu]/g, '@')
    return /^[\],:{}\s]*$/.test(
      text
        .replace(/\\["\\/bfnrtu]/g, "@")
        // .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
        .replace(
          /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
          "]",
        )
        .replace(/(?:^|:|,)(?:\s*\[)+/g, ""),
    );
  },

  stripHTML(texto: string) {
    return texto.replace(/(<([^>]+)>)/gi, "");
  },

  /**
   * Función para crear una pausa para ejecutar una instrucción:
   *  Ejemplo:
   *
   *  let funcionConDelay = this.Util.debounce(function() {
   *      // ... lo que se quiere ejecutar con el retraso
   *  }, 1000);
   *
   *  funcionConDelay(); // Ejecutando el retraso
   */
  debounce(func: any, wait: any, immediate: any) {
    let timeout: any;
    return function (this: any) {
      let context = this;
      let args = arguments;
      let later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },

  // fullscreen() {
  //   interface Document {
  //     mozFullScreenElement?: Element;
  //     webkitFullscreenElement?: Element;
  //     msFullscreenElement?: Element;
  //     fullscreenElement?: Element;
  //   }
  //   const document = window.document as Document;
  //   if (
  //     !document.fullscreenElement && // alternative standard method
  //     !document.mozFullScreenElement &&
  //     !document.webkitFullscreenElement &&
  //     !document.msFullscreenElement
  //   ) {
  //     // current working methods
  //     if (document.documentElement.requestFullscreen) {
  //       document.documentElement.requestFullscreen();
  //     } else if (document.documentElement.msRequestFullscreen) {
  //       document.documentElement.msRequestFullscreen();
  //     } else if (document.documentElement.mozRequestFullScreen) {
  //       document.documentElement.mozRequestFullScreen();
  //     } else if (document.documentElement.webkitRequestFullscreen) {
  //       document.documentElement.webkitRequestFullscreen(
  //         window.Element.ALLOW_KEYBOARD_INPUT
  //       );
  //     }
  //   } else {
  //     if (document.exitFullscreen) {
  //       document.exitFullscreen();
  //     } else if (document.msExitFullscreen) {
  //       document.msExitFullscreen();
  //     } else if (document.mozCancelFullScreen) {
  //       document.mozCancelFullScreen();
  //     } else if (document.webkitExitFullscreen) {
  //       document.webkitExitFullscreen();
  //     }
  //   }
  // },
  size(obj: any) {
    return Object.keys(obj).length;
  },

  capitalizeString(str: string) {
    return str.charAt(0).toUpperCase() + str.substring(1);
  },

  eliminarPropiedadesUndefined(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      // Si no es un objeto o es null, retornamos el valor tal cual
      return obj;
    }

    if (Array.isArray(obj)) {
      // Si es un array, aplicamos la función a cada elemento
      return obj
        .map((el) => this.eliminarPropiedadesUndefined(el))
        .filter((el) => el !== undefined); // Filtramos elementos `undefined` del array
    }

    // Si es un objeto, procesamos cada propiedad
    const resultado: { [key: string]: any } = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const valor = this.eliminarPropiedadesUndefined(obj[key]);
        if (![null, undefined, ""].includes(valor)) {
          resultado[key] = valor;
        }
      }
    }
    return resultado;
  },

  transformObject(
    array: Array<{ field: string; type: string }>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    array.forEach((input) => {
      const path = input.field;
      const keys = path.split(".");
      let current = result;

      keys.forEach((key, index) => {
        if (!current[key]) {
          if (index === keys.length - 1) {
            if (input.type === "number") {
              current[key] = undefined as any;
            } else if (["entidad", "estado"].includes(input.type)) {
              current[key] = null;
            } else {
              current[key] = "";
            }
          } else {
            current[key] = {};
          }
        }

        current = current[key];
      });
    });

    return result;
  },

  transformArrayObject(array: string[]): object {
    const result: Record<string, any> = {};

    array.forEach((path) => {
      const keys = path.split(".");
      let current = result;

      keys.forEach((key, index) => {
        if (!current[key]) {
          current[key] = index === keys.length - 1 ? "" : {};
        }

        current = current[key];
      });
    });

    return result;
  },

  serialize(json: any) {
    var string = [];
    for (var i in json) {
      string.push(i + "=" + json[i]);
    }
    return string.join("&");
  },

  trimUrl(url: string) {
    if (url) {
      if (url[0] === "/") {
        url = url.substring(1);
      }
    }
    return url;
  },

  /**
   * Public: funcion que retrasa la ejecucion de una funcion, y que al volverse a activar reinicia el timeout
   * @param {Object} obj  objeto que guardara la referencia del intervalo
   * @param {Integer} ms  tiempo en miliesgundos
   * @param {Function} func funcion callback
   * *
   * Ejemplo
    this.timer = {};
    this.Util.funcDelay(this.timer, 1000, ()=> {
      this.personalSave(form, per);
    })
   */
  funcDelay(obj: any, ms: any, func: any) {
    if (obj.timer_delay) {
      clearTimeout(obj.timer_delay);
    }

    obj.timer_delay = setTimeout(() => {
      obj.timer_delay = null;
      func();
    }, ms);
  },

  id(length = 5) {
    let zero = "";
    for (let i = 0, l = length; i < l; i++) {
      zero += "0";
    }
    return (
      zero + ((Math.random() * Math.pow(36, length)) << 0).toString(36)
    ).slice(-1 * length);
  },

  replace(text: string, find: string, replace: string) {
    for (var i = 0, l = find.length, regex; i < l; i++) {
      regex = new RegExp(find[i], "g");
      text = text.replace(regex, replace[i]);
    }
    return text;
  },

  insert(arr: Array<any>, index: number, item: any) {
    return arr.splice(index, 0, item);
  },

  removeItem(arr: Array<any>, item: any) {
    var i = arr.indexOf(item);
    i !== -1 && arr.splice(i, 1);
  },

  //   isRol(...roles) {
  //     if (store.state.user.rol) {
  //       for (let i in roles) {
  //         if (store.state.user.rol === roles[i]) {
  //           return true;
  //         }
  //       }
  //     }
  //     return false;
  //   },

  //Metodo para verificar si un usuario cuenta con cierto rol
  /* permisoRol(rolesPermitidos: [string]): Boolean {
    let result = false;
    let rolesUsuario = !!$cookies.getCookie("roles") ? $cookies.getCookie("roles") : [];
    if (!!rolesUsuario) {
      let roles = rolesUsuario as [];
      roles.forEach((dato) => {
        let rol = dato as any;
        rolesPermitidos.forEach((elem) => {
          if (rol.id === elem) {
            result = true;
          }
        });
      });
    }
    return result;
  }, */

  encodeString(cadena: string) {
    return window.btoa(cadena);
  },
  decodeString(cadena: string) {
    return window.atob(cadena);
  },

  //Formulacion de palabras en plural

  formacionPlural(palabra: string) {
    let vocales = ["a", "e", "i", "o", "u", "m"];
    if (vocales.includes(palabra.slice(-1))) {
      palabra = `${palabra}s`;
    } else {
      palabra = `${palabra}es`;
    }

    return palabra;
  },

  //Cambiar de nombre una clave de un objeto
  cambiarClave(
    obj: { [key: string]: any },
    claveAntigua: string,
    claveNueva: string,
  ) {
    let objRespaldo = obj;
    if (objRespaldo.hasOwnProperty(claveAntigua)) {
      objRespaldo[claveNueva] = objRespaldo[claveAntigua];
      delete objRespaldo[claveAntigua];
    }

    return objRespaldo;
  },
};

export const $util = Util;
