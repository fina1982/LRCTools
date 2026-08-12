<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideAppHeader)
</script>

<template>
  <div class="main-layout">
    <AppHeader v-if="showHeader" />
    <main class="main-content" :class="{ 'is-header-hidden': !showHeader }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 5px 16px;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.main-content.is-header-hidden {
  max-width: 100%;
  padding-top: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .main-content {
    padding: 8px 12px 18px;
  }

  .main-content.is-header-hidden {
    padding: 0;
  }
}
</style>
