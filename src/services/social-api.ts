import { api } from './http'

const BASE = '/api'

function normalizeIsLiked(obj: any): boolean {
  if (obj == null) return false
  const v = obj.isLiked ?? obj.liked ?? obj.userLiked ?? obj.meta?.isLiked ?? obj.meta?.liked
  return Boolean(v)
}

function normalizePost(p: any): Post {
  if (!p || !p._id) return p
  return { ...p, isLiked: normalizeIsLiked(p) }
}

function normalizeComment(c: any): Comment {
  if (!c || !c._id) return c
  return { ...c, isLiked: normalizeIsLiked(c) }
}

export interface Author {
  _id: string
  userId: string
  username: string
  displayName: string
}

export interface Post {
  _id: string
  content: { text: string }
  author: Author
  likeCount: number
  isLiked: boolean
  isOwner: boolean
  createdAt: string
  updatedAt?: string
}

export interface Comment {
  _id: string
  postId: string
  content: string
  author: Author
  likeCount: number
  isLiked: boolean
  isOwner: boolean
  createdAt: string
  updatedAt?: string
}

export interface Pagination {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
}

export interface Profile {
  _id: string
  userId: string
  username: string
  displayName: string
  bio?: string
  createdAt: string
  updatedAt: string
}

export const socialApi = {
  // Posts
  async listPosts(params?: { page?: number; pageSize?: number; sort?: 'createdAt' | 'score' }) {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    if (params?.sort) q.set('sort', params.sort)
    const res = await api.get<any>(`${BASE}/posts${q.toString() ? '?' + q : ''}`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    const rawPosts = Array.isArray(payload?.posts) ? payload.posts : []
    const posts = rawPosts.map(normalizePost)
    const pagination = payload?.pagination ?? data?.pagination ?? {
      page: 1,
      totalPages: 1,
      totalItems: posts.length,
      pageSize: 10,
    }
    return { posts, pagination }
  },

  async getPost(postId: string) {
    const res = await api.get<any>(`${BASE}/posts/${postId}`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    const rawPost = payload?.post ?? data?.post
    if (!rawPost) throw new Error('Post not found')
    return normalizePost(rawPost)
  },

  async createPost(text: string) {
    const res = await api.post<{ post: Post }>(`${BASE}/posts`, {
      content: { text },
    })
    return res.data.post
  },

  async updatePost(postId: string, text: string) {
    const res = await api.patch<{ post: Post }>(`${BASE}/posts/${postId}`, {
      content: { text },
    })
    return res.data.post
  },

  async deletePost(postId: string) {
    await api.delete(`${BASE}/posts/${postId}`)
  },

  async likePost(postId: string) {
    const res = await api.post<any>(`${BASE}/posts/${postId}/like`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    return {
      likeCount: payload.likeCount ?? data.likeCount ?? 0,
      isLiked: Boolean(payload.isLiked ?? data.isLiked ?? payload.liked ?? data.liked ?? true),
    }
  },

  async unlikePost(postId: string) {
    const res = await api.delete<any>(`${BASE}/posts/${postId}/like`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    return {
      likeCount: payload.likeCount ?? data.likeCount ?? 0,
      isLiked: Boolean(payload.isLiked ?? data.isLiked ?? payload.liked ?? data.liked ?? false),
    }
  },

  // Comments
  async listComments(
    postId: string,
    params?: { page?: number; pageSize?: number; sort?: 'createdAt' | 'score' }
  ) {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    if (params?.sort) q.set('sort', params.sort ?? 'createdAt')
    const res = await api.get<any>(
      `${BASE}/posts/${postId}/comments${q.toString() ? '?' + q : ''}`
    )
    const data = res.data
    const payload = data?.responseBody ?? data
    const rawComments = payload?.comments ?? payload?.items ?? []
    const comments = (Array.isArray(rawComments) ? rawComments : []).map(normalizeComment)
    const pagination = payload?.pagination ?? data?.pagination ?? {
      page: 1,
      totalPages: 1,
      totalItems: comments.length,
      pageSize: 10,
    }
    return { comments, pagination }
  },

  async addComment(postId: string, content: string) {
    const res = await api.post<{ comment: Comment }>(
      `${BASE}/posts/${postId}/comments`,
      { content }
    )
    return res.data.comment
  },

  async updateComment(commentId: string, content: string) {
    const res = await api.patch<{ comment: Comment }>(
      `${BASE}/comments/${commentId}`,
      { content }
    )
    return res.data.comment
  },

  async deleteComment(commentId: string) {
    await api.delete(`${BASE}/comments/${commentId}`)
  },

  async likeComment(commentId: string) {
    const res = await api.post<any>(`${BASE}/comments/${commentId}/like`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    return {
      likeCount: payload.likeCount ?? data.likeCount ?? 0,
      isLiked: Boolean(payload.isLiked ?? data.isLiked ?? payload.liked ?? data.liked ?? true),
    }
  },

  async unlikeComment(commentId: string) {
    const res = await api.delete<any>(`${BASE}/comments/${commentId}/like`)
    const data = res.data ?? {}
    const payload = data.responseBody ?? data
    return {
      likeCount: payload.likeCount ?? data.likeCount ?? 0,
      isLiked: Boolean(payload.isLiked ?? data.isLiked ?? payload.liked ?? data.liked ?? false),
    }
  },

  // Profile
  async getMyProfile() {
    const res = await api.get<{ profile: Profile }>(`${BASE}/me/profile`)
    return res.data.profile
  },

  async createProfile(data: { username: string; displayName: string; bio?: string }) {
    const res = await api.post<{ profile: Profile }>(`${BASE}/me/profile`, data)
    return res.data.profile
  },

  async updateProfile(data: Partial<{ username: string; displayName: string; bio: string }>) {
    const res = await api.patch<{ profile: Profile }>(`${BASE}/me/profile`, data)
    return res.data.profile
  },

  async getPublicProfile(username: string) {
    const res = await api.get<{ profile: Profile }>(`${BASE}/profiles/${encodeURIComponent(username)}`)
    return res.data.profile
  },

  async getUserPosts(userId: string, params?: { page?: number }) {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    const res = await api.get<{ posts: Post[]; pagination: Pagination }>(
      `${BASE}/users/${encodeURIComponent(userId)}/posts${q.toString() ? '?' + q : ''}`
    )
    return res.data
  },
}
