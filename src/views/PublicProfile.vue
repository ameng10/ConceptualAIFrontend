<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, User } from 'lucide-vue-next'
import { socialApi, type Post, type Profile } from '@/services/social-api'

const route = useRoute()
const router = useRouter()
const username = route.params.username as string

const profile = ref<Profile | null>(null)
const posts = ref<Post[]>([])
const loading = ref(true)
const error = ref('')

const loadProfile = async () => {
  try {
    profile.value = await socialApi.getPublicProfile(username)
  } catch (e: any) {
    if (e.response?.status === 404) {
      error.value = 'Profile not found'
    } else {
      error.value = e.response?.data?.error || e.message || 'Failed to load profile'
    }
  }
}

const loadPosts = async () => {
  if (!profile.value) return
  try {
    const data = await socialApi.getUserPosts(profile.value.userId)
    posts.value = data.posts ?? []
  } catch {
    posts.value = []
  }
}

const goBack = () => router.back()
const viewPost = (post: Post) => router.push(`/posts/${post._id}`)

onMounted(async () => {
  await loadProfile()
  if (profile.value) await loadPosts()
  loading.value = false
})
</script>

<template>
  <div class="profile-view">
    <div class="container fade-in">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="18" /> Back
      </button>

      <div v-if="error && !profile" class="error-banner">{{ error }}</div>

      <div v-else-if="profile" class="profile-card glass">
        <div class="avatar">
          <User :size="48" />
        </div>
        <h1>{{ profile.displayName }}</h1>
        <p class="username">@{{ profile.username }}</p>
        <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>
      </div>

      <section v-if="profile" class="posts-section">
        <h3>Posts</h3>
        <div v-if="posts.length === 0" class="empty">No posts yet.</div>
        <div v-else class="post-list">
          <article
            v-for="post in posts"
            :key="post._id"
            class="post-card glass"
            @click="viewPost(post)"
          >
            <p class="post-text">{{ post.content?.text || '' }}</p>
            <span class="post-date">{{ new Date(post.createdAt).toLocaleDateString() }}</span>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
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

.profile-card {
  text-align: center;
  padding: 2rem;
  border-radius: var(--radius);
}

.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.profile-card h1 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.username {
  color: var(--text-dim);
  font-size: 0.9375rem;
  margin-bottom: 0.75rem;
}

.bio {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--text-dim);
}

.posts-section h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-dim);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.post-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.post-card:hover {
  border-color: rgba(45, 212, 191, 0.3);
}

.post-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-bottom: 0.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-date {
  font-size: 0.75rem;
  color: var(--text-dim);
}
</style>
