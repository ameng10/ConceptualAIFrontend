<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppDescriptionInput from '@/components/AppDescriptionInput.vue'
import ClarificationDialog from '@/components/ClarificationDialog.vue'
import { projectApi } from '@/services/api'
import { Sparkles, Zap } from 'lucide-vue-next'

const router = useRouter()
const showClarification = ref(false)
const questions = ref<string[]>([])
const currentProjectId = ref('')

const handleProjectSubmit = async (description: string, name: string) => {
  try {
    const result = await projectApi.create(name, description)
    currentProjectId.value = result.projectId

    if (result.status === 'awaiting_input' && result.questions) {
      questions.value = result.questions
      showClarification.value = true
    } else {
      router.push(`/project/${result.projectId}`)
    }
  } catch (error) {
    console.error('Failed to create project:', error)
    // alert('Failed to start project. Is the backend running?')
    // For demo purposes, we can navigate anyway or show a more subtle error
    // router.push(`/project/demo-id`)
  }
}

const handleClarificationSubmit = async (answers: Record<string, string>) => {
  try {
    await projectApi.provideClarification(currentProjectId.value, answers)
    showClarification.value = false
    router.push(`/project/${currentProjectId.value}`)
  } catch (error) {
    console.error('Failed to submit clarifications:', error)
  }
}
</script>

<template>
  <div class="create-view">
    <div class="header-banner fade-in">
      <div class="badge">
        <Zap :size="12" /> Powered by Concepts
      </div>
    </div>

    <div class="container fade-in">
      <div class="hero">
        <h1 class="animated-gradient-text">What are you building?</h1>
        <p class="subtitle">Architect your conceptual backend in seconds.</p>
      </div>

      <div class="input-wrapper">
        <AppDescriptionInput @submit="handleProjectSubmit" />
      </div>

      <div class="quick-tips">
        <p>Try: "A marketplace with items and reviews" or "A social app with following and posting"</p>
      </div>
    </div>

    <ClarificationDialog
      :show="showClarification"
      :questions="questions"
      @submit="handleClarificationSubmit"
    />
  </div>
</template>

<style scoped>
.create-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4rem 1rem;
}

.header-banner {
  position: fixed;
  top: 1.5rem;
  right: 2rem;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.hero {
  text-align: center;
}

h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--text-dim);
  max-width: 600px;
  margin: 0 auto;
}

.quick-tips {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-dim);
  opacity: 0.7;
}
</style>
