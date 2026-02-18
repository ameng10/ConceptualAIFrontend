<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { socialApi } from '@/services/social-api'

const route = useRoute()
const router = useRouter()
const postId = route.params.postId as string

const text = ref('')
const loading = ref(false)
const error = ref('')
const notFound = ref(false)

const loadPost = async () => {
  try {
    const post = await socialApi.getPost(postId)
    text.value = post.content?.text || ''
  } catch (e: any) {
    if (e.response?.status === 404) {
      notFound.value = true
    } else {
      error.value = e.response?.data?.error || e.message || 'Failed to load post'
    }
  }
}

const handleSubmit = async () => {
  const trimmed = text.value.trim()
  if (!trimmed) return
  loading.value = true
  error.value = ''
  try {
    await socialApi.updatePost(postId, trimmed)
    router.push(`/posts/${postId}`)
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to update post'
  } finally {
    loading.value = false
  }
}

const handleCancel = () => router.push(`/posts/${postId}`)

onMounted(loadPost)
</script>

<template>
  <div class="edit-post-view">
    <div class="container fade-in">
      <button class="back-btn" @click="handleCancel">
        <ArrowLeft :size="18" /> Cancel
      </button>

      <div v-if="notFound" class="error-banner">
        Post not found.
      </div>

      <div v-else class="form-card glass">
        <h1>Edit Bug Report</h1>

        <form @submit.prevent="handleSubmit" class="post-form">
          <textarea
            v-model="text"
            placeholder="Describe the issue..."
            rows="6"
            class="post-input"
            required
          />
          <div v-if="error" class="error-msg">{{ error }}</div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="handleCancel">
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!text.trim() || loading"
            >
              {{ loading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-post-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem;
}

.container {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--primary);
}

.error-banner {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: var(--error);
}

.form-card {
  padding: 2rem;
  border-radius: var(--radius);
}

.form-card h1 {
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-input {
  width: 100%;
  padding: 1rem 1.25rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
}

.post-input:focus {
  outline: none;
  border-color: var(--primary);
}

.error-msg {
  color: var(--error);
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-ghost {
  padding: 0.625rem 1.25rem;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.9375rem;
  border-radius: 8px;
  cursor: pointer;
}

.btn-ghost:hover {
  border-color: var(--text-dim);
  color: var(--text);
}
</style>
