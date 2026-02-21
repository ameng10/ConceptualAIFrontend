<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import GradientToastHost from '@/components/GradientToastHost.vue'

const route = useRoute()
const hideSidebar = computed(() => route.meta?.hideSidebar === true)
const showSidebar = computed(() => !hideSidebar.value)

const isSidebarOpen = ref(true)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

onMounted(() => {
  // On smaller screens default to closed (drawer-style), otherwise open.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  isSidebarOpen.value = !window.matchMedia('(max-width: 768px)').matches
})
</script>

<template>
  <div class="app-container" :class="{ 'sidebar-open': isSidebarOpen }">
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div v-if="showSidebar" class="sidebar-container" :class="{ collapsed: !isSidebarOpen }">
      <Sidebar :collapsed="!isSidebarOpen" @toggle="toggleSidebar" />
    </div>

    <main class="main-content" :class="{ marketing: hideSidebar }">
      <GradientToastHost />
      <router-view />
    </main>
  </div>
</template>

<style>
/* Global layout styles already in index.css */
</style>
