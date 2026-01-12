<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { projectApi, authState, type Project } from '@/services/api'
import ProjectStatusDisplay from '@/components/ProjectStatusDisplay.vue'
import { ArrowLeft, Share2 } from 'lucide-vue-next'

const route = useRoute()
const projectId = route.params.id as string
const project = ref<Project | null>(null)
let pollInterval: number | null = null

const fetchProject = async () => {
  try {
    const userId = authState.getUserId()
    if (!userId) {
      console.warn('No user ID found for polling')
      return
    }

    // The API only supports getting all projects for a user currently
    const projects = await projectApi.getProjects(userId)
    const foundProject = projects.find(p => p._id === projectId || (p as any).id === projectId) // Handle both _id and potential id for safety

    if (foundProject) {
      project.value = foundProject

      // Stop polling if complete or error
      if (foundProject.status === 'complete' || foundProject.status === 'error') {
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }
    } else {
      console.warn('Project not found in user list', projectId)
    }
  } catch (error) {
    console.error('Failed to fetch project status:', error)
  }
}

onMounted(() => {
  fetchProject()
  // Poll every 5 seconds
  pollInterval = window.setInterval(fetchProject, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="status-view">
    <div class="header-nav fade-in">
      <router-link to="/" class="back-link">
        <ArrowLeft :size="18" /> Back to Generator
      </router-link>
      <div class="actions">
        <button class="btn-icon">
          <Share2 :size="18" />
        </button>
      </div>
    </div>

    <div v-if="project" class="content container">
      <div class="status-header fade-in">
        <h1>Building {{ project.name }}</h1>
        <p class="subtitle">Stay on this page while our agents work through the pipeline.</p>
      </div>

      <ProjectStatusDisplay
        :status="project.status"
        :projectName="project.name"
      />

      <div v-if="project.status !== 'complete' && project.status !== 'error'" class="waiting-card glass fade-in">
        <div class="loader-beam"></div>
        <p>Analyzing requirements and selecting architectural concepts...</p>
      </div>
    </div>

    <div v-else class="loading">
      <p>Initializing project tracker...</p>
    </div>
  </div>
</template>

<style scoped>
.status-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-dim);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--text);
}

.btn-icon {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.status-header {
  text-align: center;
  margin-bottom: 3rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.subtitle {
  color: var(--text-dim);
}

.waiting-card {
  margin-top: 3rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9375rem;
  overflow: hidden;
  position: relative;
}

.loader-beam {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(to right, transparent, var(--primary), transparent);
  animation: beam 2s infinite linear;
}

@keyframes beam {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

.loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
}
</style>
