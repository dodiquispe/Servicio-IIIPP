const appName = "app";
const Storage = {
  // Metodo para crear una cookie
  set(key: string, value: any) {
    // Obtenemos el tiempo de sesion
    window.localStorage.setItem(appName + "_" + key, JSON.stringify(value));
  },
  get(key: string) {
    let data = window.localStorage.getItem(appName + "_" + key);
    try {
      return !!data ? JSON.parse(data) : "";
    } catch (Exception) {
      return data;
    }
  },
  remove(key: string) {
    window.localStorage.removeItem(appName + "_" + key);
  },
  removeAll() {
    window.localStorage.clear();
  },
  exist(key: string) {
    let value = window.localStorage.getItem(appName + "_" + key);
    return (
      typeof value !== "undefined" &&
      value !== "undefined" &&
      value !== undefined &&
      value !== null &&
      value !== "null" &&
      value !== "[]"
    );
  },
  setSession(key: string, value: any) {
    window.sessionStorage.setItem(appName + "_" + key, JSON.stringify(value));
  },
  getSession(key: string) {
    let data = window.sessionStorage.getItem(appName + "_" + key);
    return !!data ? JSON.parse(data) : "";
  },
  removeSession(key: string) {
    window.sessionStorage.removeItem(appName + "_" + key);
  },
  existSession(key: string) {
    let value = window.sessionStorage.getItem(appName + "_" + key);
    return (
      typeof value !== "undefined" &&
      value !== "undefined" &&
      value !== undefined &&
      value !== null &&
      value !== "null" &&
      value !== "[]"
    );
  },
};
export const $storage = Storage;
