interface Usuario {
  id: String;
  nombre_usuario: String;
  correo: String;
  persona: Persona;
  roles: [Rol];
}
interface Persona {
  id: String;
  foto: String;
  nombres: String;
  correo_persona: String;
  primer_apellido: String;
  segundo_apellido: String;
}
interface Rol {
  id: String;
  descripcion: String;
}
interface Recurso {
  id: String;
  title: String;
  nivel: String;
  icon: String;
  path: String;
  sub_menu: [Recurso];
}

export interface UserLogin {
  username: string;
  password: string;
}
export interface DataLogin {
  token: String;
  usuario: Usuario;
  roles: [Rol];
  recursos: [Recurso];
}
