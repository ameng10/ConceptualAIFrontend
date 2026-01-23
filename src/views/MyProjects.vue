<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { History, Search, Trash2 } from 'lucide-vue-next'
import { authState, projectApi, type Project } from '@/services/api'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const query = ref('')
const projects = ref<Project[]>([])

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const projectToDelete = ref<Project | null>(null)

const handleViewDetails = async (project: Project) => {
  // Send the user to the *latest* stage that should have data.
  // Priority: implementation > design > plan > workspace/clarification.

  const projectNameQ = encodeURIComponent(project.name)
  const statusQ = project.status === 'design_complete' ? 'designing' : project.status

  const isImplementationStage =
    project.status === 'implementing' ||
  project.status === 'implemented' ||
    project.status === 'syncing' ||
    project.status === 'assembling' ||
    project.status === 'complete'

  const isDesignStage = project.status === 'designing' || project.status === 'design_complete'

  const isPlanStage =
    project.status === 'planning_complete' ||
    project.status === 'designing' ||
    project.status === 'design_complete' ||
    project.status === 'implementing' ||
  project.status === 'implemented' ||
    project.status === 'syncing' ||
    project.status === 'assembling' ||
    project.status === 'complete'

  if (isImplementationStage) {
    await router.push({
      path: `/project/${project._id}/implementing`,
      query: { projectName: projectNameQ },
    })
    return
  }

  if (isDesignStage) {
    await router.push({
      path: `/project/${project._id}`,
      query: { projectName: projectNameQ, planningStatus: statusQ },
    })
    return
  }

  // For plan stage, we can optionally prefetch and hydrate (fast display).
  if (isPlanStage) {
    try {
      const plan = await projectApi.getPlan(project._id)
      await router.push({
        path: `/project/${project._id}`,
        query: {
          projectName: projectNameQ,
          planningStatus: statusQ,
          ...(plan?.plan ? { plan: encodeURIComponent(String(plan.plan)) } : {}),
        },
      })
      return
    } catch {
      // Fall back to normal navigation; details page will attempt to fetch.
    }
  }

  await router.push({
    path: `/project/${project._id}`,
    query: {
      projectName: projectNameQ,
      planningStatus: statusQ,
    },
  })
}

const openDeleteConfirm = (project: Project) => {
  projectToDelete.value = project
  deleteError.value = ''
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  if (deleting.value) return
  showDeleteConfirm.value = false
  projectToDelete.value = null
}

const confirmDelete = async () => {
  if (!projectToDelete.value) return
  const deletingProject = projectToDelete.value
  // Close the modal immediately on confirm for snappy UX.
  showDeleteConfirm.value = false
  deleteError.value = ''
  deleting.value = true
  try {
    await projectApi.deleteProject(deletingProject._id)
    // Optimistic UI update
    projects.value = projects.value.filter((p) => p._id !== deletingProject._id)
    projectToDelete.value = null
  } catch (e) {
    // If deleting fails, surface the error in the page-level error banner.
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleting.value = false
  }
}

const filteredProjects = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return projects.value
  return projects.value.filter((p) => {
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
    )
  })
})

const loadProjects = async () => {
  error.value = ''
  loading.value = true
  try {
    const owner = authState.getUserId()
    if (!owner) {
      projects.value = []
      error.value = 'Please sign in to view your projects.'
      return
    }
    // Backend should return only projects the current user owns.
    projects.value = await projectApi.getProjects(owner)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <div class="projects-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">My Projects</h1>
        <p class="subtitle">Management and history of your conceptual architectures.</p>
      </div>

      <div class="controls glass">
        <div class="search-box">
          <Search :size="18" />
          <input v-model="query" type="text" placeholder="Search projects..." />
        </div>
      </div>

      <div v-if="error" class="glass error-card">
        {{ error }}
      </div>

      <div v-else-if="loading" class="glass loading-card">
        Loading projects...
      </div>

      <div v-else-if="filteredProjects.length === 0" class="glass loading-card">
        No projects yet.
      </div>

      <div class="projects-grid">
        <div v-for="project in filteredProjects" :key="project._id" class="project-card glass">
          <div class="card-header">
            <History :size="20" class="neon-icon" />
            <span class="date">{{ project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '' }}</span>
          </div>
          <h3>{{ project.name }}</h3>
          <p class="desc">{{ project.description }}</p>

          <div class="card-footer">
            <span class="status-badge" :class="project.status">
              {{ project.status }}
            </span>

            <div class="card-actions">
              <button
                class="icon-btn danger"
                type="button"
                title="Delete project"
                @click.stop="openDeleteConfirm(project)"
              >
                <Trash2 :size="16" />
              </button>
              <button class="view-link" type="button" @click="handleViewDetails(project)">View Details →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete confirm modal -->
      <div v-if="showDeleteConfirm" class="modal-backdrop" @click="closeDeleteConfirm">
        <div class="modal glass" @click.stop>
          <h3 class="modal-title">Delete project</h3>
          <p class="modal-text">Are you sure you want to delete this project?</p>
          <p v-if="projectToDelete" class="modal-project">{{ projectToDelete.name }}</p>

          <div v-if="deleteError" class="modal-error">{{ deleteError }}</div>

          <div class="modal-actions">
            <button class="btn-secondary" type="button" :disabled="deleting" @click="closeDeleteConfirm">Cancel</button>
            <button class="btn-danger" type="button" :disabled="deleting" @click="confirmDelete">
              <span v-if="!deleting">Yes, delete</span>
              <span v-else>Deleting…</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4rem 1rem;
}

.container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.header {
  text-align: left;
}

h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.125rem;
  color: var(--text-dim);
}

.controls {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 4px);
  color: var(--text-dim);
}

.search-box input {
  background: transparent;
  border: none;
  color: var(--text);
  padding: 0.75rem 0;
  width: 100%;
  outline: none;
}


.error-card,
.loading-card {
  padding: 1rem;
  border-radius: var(--radius);
  color: var(--text);
}

.error-card {
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.desc {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.neon-icon {
  color: var(--neon-teal);
}

.date {
  font-size: 0.8125rem;
  color: var(--text-dim);
}

h3 {
  font-size: 1.25rem;
  color: var(--text);
}

.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;
}

.status-badge {
  flex: 0 0 auto;
}

.card-actions {
  flex: 0 0 auto;
}

.view-link {
  max-width: 100%;
}

@media (max-width: 520px) {
  .card-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .card-actions {
    justify-content: flex-end;
  }
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--text);
}

.icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
  color: rgba(239, 68, 68, 0.95);
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 100px;
  background: rgba(45, 212, 191, 0.1);
  color: var(--neon-teal);
  border: 1px solid rgba(45, 212, 191, 0.18);
  backdrop-filter: blur(8px);
}

.status-badge.complete {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.view-link {
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.view-link:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.12), 0 0 18px rgba(45, 212, 191, 0.08);
}

.view-link:active {
  transform: translateY(1px);
}

.view-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.25);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 420px;
  padding: 1.25rem;
  border-radius: 16px;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
}

.modal-text {
  margin: 0.5rem 0 0;
  color: var(--text-dim);
}

.modal-project {
  margin: 0.75rem 0 0;
  font-weight: 700;
}

.modal-error {
  margin-top: 0.75rem;
  color: rgba(239, 68, 68, 0.95);
  font-size: 0.875rem;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary,
.btn-danger {
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-weight: 700;
  border: 1px solid var(--glass-border);
  cursor: pointer;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.25);
  color: rgba(239, 68, 68, 0.98);
}

.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
