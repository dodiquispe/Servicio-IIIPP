<template>
  <v-btn icon @click="toggleTheme()">
    <v-tooltip activator="parent" location="bottom">Cambiar de tema</v-tooltip>
    <v-icon :icon="tema.icon" />
  </v-btn>
</template>

<script setup>
// Metodos
// Definir métodos y funciones
import { useTheme } from "vuetify";
// Declarar variables y datos
const theme = useTheme();
var tema = reactive({
  theme: "light",
  icon: "mdi-weather-sunny",
});

const toggleTheme = () => {
  let theme_obj = reactive({});
  if (theme.global.name.value == "lightTheme") {
    theme_obj = {
      name: "darkTheme",
      icon: "mdi-weather-night",
    };
  } else {
    theme_obj = {
      name: "lightTheme",
      icon: "mdi-weather-sunny",
    };
  }
  theme.global.name.value = theme_obj.name;
  tema.icon = theme_obj.icon;
  $storage.set("theme", theme_obj);
  //   $cookies.addCookie("theme", theme_obj);
};
// if ($cookies.verifyCookie("theme")) {
//   let cookie_theme = $cookies.getCookie("theme");
//   theme.global.name.value = cookie_theme.name;
//   tema.icon = cookie_theme.icon;
// }
onMounted(() => {
  // Verficamos si hay un tema por defecto
  if ($storage.exist("theme")) {
    let storage_theme = $storage.get("theme");
    theme.global.name.value = storage_theme.name;
    tema.icon = storage_theme.icon;
  }
});
</script>
<style lang="scss"></style>
