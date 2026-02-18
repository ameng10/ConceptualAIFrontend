<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Pencil,
  Trash2,
  User,
  Send,
} from 'lucide-vue-next'
import { socialApi, type Post, type Comment } from '@/services/social-api'
import { authState } from '@/services/api'

const route = useRoute()
const router = useRouter()
const postId = route.params.postId as string

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const pagination = ref({ page: 1, totalPages: 1, totalItems: 0, pageSize: 10 })
const loading = ref(true)
const error = ref('')
const commentText = ref('')
const submittingComment = ref(false)
const editingCommentId = ref<string | null>(null)
const editingCommentText = ref('')

const loadPost = async () => {
  try {
    post.value = await socialApi.getPost(postId)
  } catch (e: any) {
    if (e.response?.status === 404) {
      error.value = 'Post not found'
    } else {
      error.value = e.response?.data?.error || e.message || 'Failed to load post'
    }
  }
}

const loadComments = async () => {
  try {
    const data = await socialApi.listComments(postId, {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    })
    comments.value = data.comments
    pagination.value = data.pagination
  } catch {
    comments.value = []
  }
}

const refresh = async () => {
  loading.value = true
  error.value = ''
  await loadPost()
  await loadComments()
  loading.value = false
}

const goToFeed = () => router.push('/posts')
const goToAuthor = () => {
  if (post.value?.author?.username) {
    router.push(`/profiles/${post.value.author.username}`)
  }
}

const goToEdit = () => router.push(`/posts/${postId}/edit`)

const handleDeletePost = async () => {
  if (!confirm('Delete this post?')) return
  try {
    await socialApi.deletePost(postId)
    router.push('/posts')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Failed to delete'
  }
}

const toggleLikePost = async () => {
  if (!post.value || !authState.isSignedIn()) return
  try {
    if (post.value.isLiked) {
      const res = await socialApi.unlikePost(postId)
      post.value.likeCount = res.likeCount
      post.value.isLiked = res.isLiked
    } else {
      const res = await socialApi.likePost(postId)
      post.value.likeCount = res.likeCount
      post.value.isLiked = res.isLiked
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
        post.value.isLiked = true
        post.value.likeCount = (post.value.likeCount ?? 0) + 1
      } else if (msg.includes('unlike') || msg.includes('not liked')) {
        post.value.isLiked = false
        post.value.likeCount = Math.max(0, (post.value.likeCount ?? 1) - 1)
      }
    }
  }
}

const submitComment = async () => {
  const text = commentText.value.trim()
  if (!text || !authState.isSignedIn()) return
  error.value = ''
  submittingComment.value = true
  try {
    const newComment = await socialApi.addComment(postId, text)
    commentText.value = ''
    // Add the new comment (API may return minimal fields; normalize for display)
    const normalized: Comment = {
      _id: newComment._id,
      postId: newComment.postId ?? postId,
      content: newComment.content ?? text,
      author: newComment.author ?? { _id: '', userId: '', username: '', displayName: 'You' },
      likeCount: newComment.likeCount ?? 0,
      isLiked: newComment.isLiked ?? false,
      isOwner: newComment.isOwner ?? true,
      createdAt: newComment.createdAt ?? new Date().toISOString(),
    }
    comments.value = [normalized, ...comments.value]
    // Refresh list to get full server data (author, etc.); keep optimistic if refresh fails
    try {
      const data = await socialApi.listComments(postId, {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
      })
      if (data.comments?.length > 0) {
        comments.value = data.comments
        pagination.value = data.pagination
      }
    } catch {
      // Keep optimistic comment if refresh fails
    }
  } catch (e: any) {
    if (e.response?.status === 401) router.push('/login')
    else error.value = e.response?.data?.error || e.message || 'Failed to add comment'
  } finally {
    submittingComment.value = false
  }
}

const startEditComment = (c: Comment) => {
  editingCommentId.value = c._id
  editingCommentText.value = c.content
}

const cancelEditComment = () => {
  editingCommentId.value = null
  editingCommentText.value = ''
}

const saveEditComment = async () => {
  if (!editingCommentId.value) return
  try {
    await socialApi.updateComment(editingCommentId.value, editingCommentText.value)
    editingCommentId.value = null
    editingCommentText.value = ''
    await loadComments()
  } catch {
    cancelEditComment()
  }
}

const deleteComment = async (c: Comment) => {
  if (!confirm('Delete this comment?')) return
  try {
    await socialApi.deleteComment(c._id)
    await loadComments()
  } catch {
    // Ignore
  }
}

const toggleLikeComment = async (c: Comment) => {
  if (!authState.isSignedIn()) {
    router.push('/login')
    return
  }
  try {
    if (c.isLiked) {
      const res = await socialApi.unlikeComment(c._id)
      c.likeCount = res.likeCount
      c.isLiked = res.isLiked
    } else {
      const res = await socialApi.likeComment(c._id)
      c.likeCount = res.likeCount
      c.isLiked = res.isLiked
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
        c.isLiked = true
        c.likeCount = (c.likeCount ?? 0) + 1
      } else if (msg.includes('unlike') || msg.includes('not liked')) {
        c.isLiked = false
        c.likeCount = Math.max(0, (c.likeCount ?? 1) - 1)
      }
    }
  }
}

const canInteract = computed(() => authState.isSignedIn())


const handleCommentKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    submitComment()
  }
}

onMounted(refresh)
</script>

<template>
  <div class="post-detail-view">
    <div class="container fade-in">
      <button class="back-btn" @click="goToFeed">
        <ArrowLeft :size="18" /> Back to feed
      </button>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <article v-if="post" class="post-card glass">
        <div class="post-content">
          <p class="post-text">{{ post.content?.text || '' }}</p>
        </div>
        <div class="post-meta">
          <button class="author-btn" @click="goToAuthor">
            <User :size="14" />
            {{ post.author?.displayName || post.author?.username || 'Unknown' }}
          </button>
          <div class="post-actions">
            <button
              class="action-btn"
              :class="{ liked: post.isLiked }"
              @click="toggleLikePost"
              :disabled="!canInteract"
              title="Like"
            >
              <Heart :size="16" :fill="post.isLiked ? 'currentColor' : 'none'" />
              {{ post.likeCount }}
            </button>
            <template v-if="post.isOwner">
              <button class="action-btn" @click="goToEdit" title="Edit">
                <Pencil :size="16" />
              </button>
              <button class="action-btn danger" @click="handleDeletePost" title="Delete">
                <Trash2 :size="16" />
              </button>
            </template>
          </div>
        </div>
        <div class="post-date">
          {{ new Date(post.createdAt).toLocaleString() }}
        </div>
      </article>

      <section v-if="post" class="comments-section">
        <h3>Comments</h3>

        <form v-if="canInteract" class="comment-form" @submit.prevent="submitComment">
          <textarea
            v-model="commentText"
            placeholder="Add a comment... (Ctrl+Enter to post)"
            rows="3"
            class="comment-input"
            @keydown="handleCommentKeydown"
          />
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="submittingComment"
          >
            <Send :size="16" />
            {{ submittingComment ? 'Posting...' : 'Post' }}
          </button>
        </form>
        <p v-else class="sign-in-hint">
          <router-link to="/login">Sign in</router-link> to comment.
        </p>

        <div class="comment-list">
          <div
            v-for="c in comments"
            :key="c._id"
            class="comment-card glass"
          >
            <div v-if="editingCommentId === c._id" class="comment-edit">
              <textarea v-model="editingCommentText" rows="2" class="comment-input" />
              <div class="edit-actions">
                <button class="btn-ghost" @click="cancelEditComment">Cancel</button>
                <button class="btn btn-primary" @click="saveEditComment">Save</button>
              </div>
            </div>
            <div v-else>
              <div class="comment-header">
                <button
                  class="author-btn"
                  @click="router.push(`/profiles/${c.author?.username}`)"
                >
                  {{ c.author?.displayName || c.author?.username || 'Unknown' }}
                </button>
                <div class="comment-actions">
                  <button
                    class="stat-btn"
                    :class="{ liked: c.isLiked }"
                    @click="toggleLikeComment(c)"
                    :disabled="!canInteract"
                  >
                    <Heart :size="14" :fill="c.isLiked ? 'currentColor' : 'none'" />
                    {{ c.likeCount }}
                  </button>
                  <template v-if="c.isOwner">
                    <button class="stat-btn" @click="startEditComment(c)">Edit</button>
                    <button class="stat-btn danger" @click="deleteComment(c)">Delete</button>
                  </template>
                </div>
              </div>
              <p class="comment-text">{{ c.content }}</p>
              <span class="comment-date">{{ new Date(c.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div v-if="comments.length === 0 && !loading" class="no-comments">
          No comments yet. Be the first to comment.
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.post-detail-view {
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

.post-card {
  padding: 1.5rem;
  border-radius: var(--radius);
}

.post-content {
  margin-bottom: 1rem;
}

.post-text {
  font-size: 1.125rem;
  line-height: 1.6;
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

.post-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.875rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.liked {
  color: #f43f5e;
  border-color: rgba(244, 63, 94, 0.3);
}

.action-btn.danger:hover:not(:disabled) {
  border-color: var(--error);
  color: var(--error);
}

.post-date {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-dim);
}

.comments-section h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.comment-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9375rem;
  resize: vertical;
}

.comment-input:focus {
  outline: none;
  border-color: var(--primary);
}

.sign-in-hint {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-dim);
}

.sign-in-hint a {
  color: var(--primary);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.8125rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.stat-btn:hover:not(:disabled) {
  color: var(--primary);
}

.stat-btn:disabled {
  opacity: 0.5;
}

.stat-btn.liked {
  color: #f43f5e;
}

.stat-btn.danger:hover {
  color: var(--error);
}

.comment-text {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-bottom: 0.25rem;
}

.comment-date {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.comment-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-ghost {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.875rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-ghost:hover {
  color: var(--text);
  border-color: var(--text-dim);
}

.no-comments {
  padding: 2rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9375rem;
}
</style>
