<template>
  <v-dialog
    v-model="confirm_state.props.value.show"
    persistent
    content-class="dialog--confirm"
    max-width="400"
  >
    <div class="alert-dialog">
      <div class="title-icon shake">
        <v-icon icon="mdi-help-circle-outline" class="icon" />
      </div>
      <div class="contenido">
        <div class="tittle">{{ confirm_state.props.value.title }}</div>
        <div
          class="image"
          id="confirm-image"
          :style="img_style"
          @mouseenter="onHoverImg(true)"
          @mouseleave="onHoverImg(false)"
        >
          {{ isHoveredDone ? "😯" : isHoveredCancel ? "🙄" : `😑` }}
        </div>
        <div class="body" v-html="confirm_state.props.value.text"></div>
        <div class="actions">
          <v-btn
            class="cancel"
            variant="outlined"
            rounded="lg"
            block
            color="info"
            @click="cancelar()"
            @mouseenter="onHover(true, 'cancel')"
            @mouseleave="onHover(false, 'cancel')"
          >
            Cancelar
          </v-btn>
          <v-btn
            class="mt-2 done"
            variant="elevated"
            rounded="lg"
            block
            color="info"
            @click="aceptar()"
            @mouseenter="onHover(true, 'done')"
            @mouseleave="onHover(false, 'done')"
          >
            Aceptar
          </v-btn>
        </div>
      </div>
    </div>
  </v-dialog>
</template>
<script setup lang="ts">
// Recuperamos el estado
var isHoveredCancel = ref(false);
var isHoveredDone = ref(false);
var img_style = reactive({});

const onHoverImg = (value: boolean) => {
  console.log("entraaaa");
  let image = document.getElementById("confirm-image");
  if (value && image) {
    image.classList.add("shake-fast");
  } else if (image) {
    image.classList.remove("shake-fast");
  }
};
const onHover = (value: boolean, tipo: string) => {
  if (tipo === "done") {
    isHoveredDone.value = value;
  } else {
    isHoveredCancel.value = value;
  }
  if (value) {
    img_style = { transform: "scale(1.5)" };
  } else {
    img_style = {};
  }
};
const confirm_state = useConfirm();

const aceptar = () => {
  confirm_state.setShow(false);
  if (typeof confirm_state.props.value.done === "function") {
    confirm_state.props.value.done();
  }
};
const cancelar = () => {
  confirm_state.setShow(false);
  if (typeof confirm_state.props.value.done === "function") {
    confirm_state.props.value.cancel();
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
    margin: -2rem 0rem 0rem 0rem;
    padding: 2rem 1rem 2rem 1rem;
    .image {
      display: inline-block;
      font-size: 5rem;
      padding: 2rem 0rem;
      transition: all 1s ease;
    }
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
.shake-fast {
  display: inline-block; /* Asegúrate de que el elemento tenga un tamaño definido */
  animation: shake 0.1s ease-in-out infinite;
}
</style>
