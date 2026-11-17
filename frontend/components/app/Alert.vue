<template>
  <v-dialog
    v-model="alert_state.props.value.show"
    persistent
    content-class="dialog--confirm"
    max-width="360"
  >
    <div class="alert-dialog">
      <div class="title-icon shake">
        <v-icon icon="mdi-alert" class="icon" />
      </div>
      <div class="contenido">
        <div class="tittle">{{ alert_state.props.value.title }}</div>
        <div class="body" v-html="alert_state.props.value.text"></div>
        <div class="actions">
          <v-btn variant="elevated" rounded color="info" @click="aceptar()"
            >Aceptar</v-btn
          >
        </div>
      </div>
    </div>
  </v-dialog>
</template>
<script setup lang="ts">
// Recuperamos el estado
const alert_state = useAlert();
const aceptar = () => {
  alert_state.setShow(false);
  if (typeof alert_state.props.value.callback === "function") {
    alert_state.props.value.callback();
  }
};
</script>
<style lang="scss">
.alert-dialog {
  text-align: center;
  border-radius: 50%;
  .title-icon {
    font-size: 1.5rem;
    .icon {
      padding: 1.5rem;
      border: solid 3px rgba(var(--v-theme-primary), 1);
      border-radius: 50%;
      background: rgba(var(--v-theme-info), 1);
      color: white;
      box-shadow: 0px 0px 5px 1px rgba(var(--v-theme-info));
    }
  }
  .contenido {
    border-radius: 8px;
    border-top: solid 8px rgba(var(--v-theme-info), 1);
    border-bottom: solid 3px rgba(var(--v-theme-info), 1);
    background-color: rgba(var(--v-theme-background), 1);
    margin-top: -2rem;
    padding: 1.5rem 0rem 0rem 0rem;
    .tittle {
      color: rgba(var(--v-theme-info), 1);
      font-size: 1.5rem;
      font-weight: 500;
      // border-bottom: solid 1px rgba(var(--v-theme-primary), 1);
    }
    .body {
      font-weight: lighter !important;
    }
    .actions {
      margin: 1rem 1rem;
    }
  }
}
@keyframes shake {
  0% {
    transform: translate(1px, 1px) rotate(0deg);
  }
  5% {
    transform: translate(-1px, -2px) rotate(-1deg);
  }
  10% {
    transform: translate(-3px, 0px) rotate(1deg);
  }
  15% {
    transform: translate(3px, 2px) rotate(0deg);
  }
  20% {
    transform: translate(1px, -1px) rotate(1deg);
  }
  25% {
    transform: translate(-1px, 2px) rotate(-1deg);
  }
  30% {
    transform: translate(-3px, 1px) rotate(0deg);
  }
  35% {
    transform: translate(3px, 1px) rotate(-1deg);
  }
  40% {
    transform: translate(-1px, -1px) rotate(1deg);
  }
  50% {
    transform: translate(1px, 2px) rotate(0deg);
  }
  55% {
    transform: translate(1px, -2px) rotate(-1deg);
  }
  60% {
    transform: translate(0, 0) rotate(0deg);
  }
  65% {
    transform: translate(0, 0) rotate(0deg);
  }
  70% {
    transform: translate(0, 0) rotate(0deg);
  }
  75% {
    transform: translate(0, 0) rotate(0deg);
  }
  80% {
    transform: translate(0, 0) rotate(0deg);
  }
  85% {
    transform: translate(0, 0) rotate(0deg);
  }
  90% {
    transform: translate(0, 0) rotate(0deg);
  }
  95% {
    transform: translate(0, 0) rotate(0deg);
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

.shake {
  display: inline-block; /* Asegúrate de que el elemento tenga un tamaño definido */
  animation: shake 0.1s ease-in-out infinite;
  animation-delay: 5s; /* Espera 5 segundos antes de iniciar */
  animation-duration: 3s; /* Duración total del ciclo de animación */
}
</style>
