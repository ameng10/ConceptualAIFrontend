<script setup lang="ts">
import DemoCarousel from './DemoCarousel.vue'
</script>

<template>
  <section id="demos" class="mx-auto w-full max-w-6xl px-4 py-14">
    <div class="mb-8">
      <div class="text-xs font-extrabold uppercase tracking-[0.2em] text-neon-teal">The gallery</div>
      <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Five real apps. One prompt each.</h2>
      <p class="mt-3 max-w-3xl text-lg text-text-dim">
        Every app below was generated from the single prompt shown on its card — expand the prompt, then click
        through and use the app live. Commons ships twice: v1, then v2 after one iteration, with the diff to prove
        nothing else moved.
      </p>
    </div>

    <DemoCarousel />
  </section>
</template>
