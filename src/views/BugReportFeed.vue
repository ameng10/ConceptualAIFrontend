<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { PlusCircle, Heart, MessageCircle, ChevronLeft, ChevronRight, User } from 'lucide-vue-next'
import { socialApi, type Post } from '@/services/social-api'
import { authState } from '@/services/api'

const router = useRouter()
const posts = ref<Post[]>([])
const pagination = ref({ page: 1, totalPages: 1, totalItems: 0, pageSize: 10 })
const loading = ref(false)
const error = ref('')
const sortBy = ref<'createdAt' | 'score'>('createdAt')

const loadPosts = async () => {
  loading.value = true
  error.value = ''
  try {
    if (authState.isSignedIn()) {
      try {
        await socialApi.getMyProfile()
      } catch (e: any) {
        if (e.response?.status === 404) {
          loading.value = false
          router.push('/onboarding')
          return
        }
      }
    }
    const data = await socialApi.listPosts({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      sort: sortBy.value,
    })
    posts.value = data.posts
    pagination.value = data.pagination
  } catch (e: any) {
    if (e.response?.status === 401) return
    error.value = e.response?.data?.error || e.message || 'Failed to load posts'
  } finally {
    loading.value = false
  }
}

const handleCreatePost = () => router.push('/posts/new')

const handleViewPost = (post: Post) => router.push(`/posts/${post._id}`)

const handleViewAuthor = (post: Post) => {
  const username = post.author?.username
  if (username) router.push(`/profiles/${username}`)
}

const toggleLike = async (post: Post, e: Event) => {
  e.stopPropagation()
  if (!authState.isSignedIn()) {
    router.push('/login')
    return
  }
  try {
    if (post.isLiked) {
      const res = await socialApi.unlikePost(post._id)
      post.likeCount = res.likeCount
      post.isLiked = res.isLiked
    } else {
      const res = await socialApi.likePost(post._id)
      post.likeCount = res.likeCount
      post.isLiked = res.isLiked
    }
  } catch (e: any) {
    const status = e.response?.status
    if (status === 401) {
      router.push('/login')
      return
    }
    if (status === 400) {
      const msg = String(e.response?.data?.error ?? e.response?.data?.message ?? '').toLowerCase()
      if (msg.includes('already liked')) {
        post.isLiked = true
        post.likeCount = (post.likeCount ?? 0) + 1
      } else if (msg.includes('unlike') || msg.includes('not liked')) {
        post.isLiked = false
        post.likeCount = Math.max(0, (post.likeCount ?? 1) - 1)
      }
    }
  }
}

const prevPage = () => {
  if (pagination.value.page > 1) {
    pagination.value = { ...pagination.value, page: pagination.value.page - 1 }
    loadPosts()
  }
}

const nextPage = () => {
  if (pagination.value.page < pagination.value.totalPages) {
    pagination.value = { ...pagination.value, page: pagination.value.page + 1 }
    loadPosts()
  }
}

const canCreatePost = computed(() => authState.isSignedIn())

onMounted(() => {
  loadPosts()
})
</script>

<template>
  <div class="feed-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Community Posts</h1>
        <p class="subtitle">Report bugs, request features, and discuss apps with the community.</p>
      </div>

      <div class="toolbar glass">
        <div class="sort-group">
          <label>Sort by</label>
          <select v-model="sortBy" @change="loadPosts" class="sort-select">
            <option value="createdAt">Newest</option>
            <option value="score">Most liked</option>
          </select>
        </div>
        <button
          v-if="canCreatePost"
          class="btn btn-primary create-btn"
          @click="handleCreatePost"
        >
          <PlusCircle :size="16" />
          New Post
        </button>
        <router-link v-else to="/login" class="btn btn-primary create-btn">
          Sign in to post
        </router-link>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading posts...</p>
      </div>

      <div v-else-if="posts.length === 0" class="empty-state glass">
        <MessageCircle :size="48" class="empty-icon" />
        <h3>No posts yet</h3>
        <p>Be the first to report a bug, suggest a feature, or share an app update.</p>
        <button v-if="canCreatePost" class="btn btn-primary create-btn" @click="handleCreatePost">
          Create Post
        </button>
      </div>

      <div v-else class="post-list">
        <article
          v-for="post in posts"
          :key="post._id"
          class="post-card glass"
          @click="handleViewPost(post)"
        >
          <div class="post-content">
            <p class="post-text">{{ post.content?.text || '' }}</p>
          </div>
          <div class="post-meta">
            <button
              class="author-btn"
              @click.stop="handleViewAuthor(post)"
              :title="post.author?.displayName || post.author?.username"
            >
              <User :size="14" />
              {{ post.author?.displayName || post.author?.username || 'Unknown' }}
            </button>
            <div class="post-stats">
              <button
                class="stat-btn"
                :class="{ liked: post.isLiked }"
                @click="toggleLike(post, $event)"
                title="Like"
              >
                <Heart :size="16" :fill="post.isLiked ? 'currentColor' : 'none'" />
                {{ post.likeCount }}
              </button>
              <span class="stat-item">
                <MessageCircle :size="16" />
                View
              </span>
            </div>
          </div>
          <div class="post-date">
            {{ new Date(post.createdAt).toLocaleDateString() }}
          </div>
        </article>
      </div>

      <div v-if="pagination.totalPages > 1" class="pagination">
        <button
          class="btn-ghost"
          :disabled="pagination.page <= 1"
          @click="prevPage"
        >
          <ChevronLeft :size="18" /> Previous
        </button>
        <span class="page-info">
          Page {{ pagination.page }} of {{ pagination.totalPages }}
        </span>
        <button
          class="btn-ghost"
          :disabled="pagination.page >= pagination.totalPages"
          @click="nextPage"
        >
          Next <ChevronRight :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem 1rem;
}

.container {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  text-align: center;
}

.header h1 {
  font-size: 2.25rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-dim);
  font-size: 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-radius: var(--radius);
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sort-group label {
  font-size: 0.875rem;
  color: var(--text-dim);
}

.sort-select {
  padding: 0.5rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.feed-view :deep(.btn.btn-primary.create-btn) {
  border-radius: 10px;
  padding: 0.42rem 0.90rem;
  font-size: 0.875rem;
}

.feed-view :deep(.btn.btn-primary.create-btn svg) {
  width: 16px !important;
  height: 16px !important;
}

.error-banner {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: var(--error);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-dim);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  border-radius: var(--radius);
}

.empty-icon {
  color: var(--text-dim);
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-dim);
  margin-bottom: 1.5rem;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-card {
  padding: 1.25rem 1.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.post-card:hover {
  border-color: rgba(45, 212, 191, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.post-content {
  margin-bottom: 1rem;
}

.post-text {
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.author-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.author-btn:hover {
  color: var(--primary);
}

.post-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.stat-btn:hover {
  color: var(--primary);
  background: rgba(45, 212, 191, 0.1);
}

.stat-btn.liked {
  color: #f43f5e;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-dim);
  font-size: 0.875rem;
}

.post-date {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-dim);
  opacity: 0.8;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.875rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: var(--text-dim);
}
</style>
