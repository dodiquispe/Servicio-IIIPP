<template>
  <div class="v-toaster">
    <transition-group name="v-toast">
      <v-card
        v-for="(t, index) in mes.items.value"
        :key="index"
        class="v-toast"
        :color="t.theme"
      >
        <v-row>
          <v-col sm12 class="message-header">
            <div class="icon-header">
              <v-icon>{{ t.icon }}</v-icon>
            </div>
            <div class="title-header">
              <strong>{{ t.title }}</strong>
            </div>
            <v-btn icon variant="text" size="small" @click="mes.remove(t)">
              <v-icon icon="mdi-close" />
            </v-btn>
          </v-col>
          <v-col sm="12" class="message-body" v-html="t.message"></v-col>
          <v-progress-linear
            :color="t.theme"
            height="8"
            :model-value="t.progress"
            striped
          ></v-progress-linear>
        </v-row>
      </v-card>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from "../../composables/message";

const mes = useMessage();
</script>

<style lang="scss">
.v-toaster {
  position: fixed;
  top: 75px;
  right: 0;
  z-index: 10000;
  width: 320px;
  padding-left: 10px;
  padding-right: 10px;
  .v-toast {
    margin-bottom: 10px;
    transition: all 0.3s ease;
    border-radius: 10px;
    color: #fff;
    display: block;
    padding: 1rem;
    .message-header {
      position: relative;
      display: flex;
      padding: 0.5rem 0.5rem 0rem 0.5rem;
      .icon-header {
        margin-right: 1rem;
      }
      .title-header {
        padding-top: 0.1rem;
      }
      strong {
        font-weight: 600;
      }
      .v-btn {
        position: absolute;
        top: -10px;
        right: -7px;
        margin: 0;
      }
    }
    .message-body {
      padding: 0.5rem;
      font-size: 0.85rem;
      line-height: 0.8rem;
      text-align: justify;
    }
  }

  .v-toast.v-toast-enter,
  .v-toast.v-toast-leave-to {
    -webkit-transform: translate(100%);
    transform: translate(100%);
  }
}

@media (max-width: 300px) {
  .v-toaster {
    width: 100%;
  }
}
</style>
