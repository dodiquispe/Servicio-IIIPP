<template>
  <v-list-item
    v-if="!item_menu.sub_menu?.length"
    :prepend-icon="item_menu.icon"
    :title="item_menu.title"
    :value="item_menu.title"
    @click="item_menu.path ? navigateTo(item_menu.path) : undefined"
    rounded="shaped"
    density="compact"
    color="primary"
  >
  </v-list-item>
  <v-list-group
    v-else
    :value="item_menu.title"
    expand-icon="mdi-menu-down"
    collapse-icon="mdi-menu-up"
    fluid
  >
    <template v-slot:activator="{ props }">
      <v-list-item
        v-bind="props"
        :prepend-icon="item_menu.icon"
        :title="item_menu.title"
      ></v-list-item>
    </template>
    <AppItemMenu
      v-for="(item, index) in item_menu.sub_menu"
      :key="index"
      :item_menu="item"
    />
  </v-list-group>
</template>
<script setup>
// Definmos atributos del componente
const props = defineProps({
  item_menu: {
    type: Object,
    required: true,
  },
});
</script>
