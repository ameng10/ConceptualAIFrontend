<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { User } from 'lucide-vue-next'
import { socialApi } from '@/services/social-api'
import { setUsername } from '@/services/auth-storage'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const username = ref('')
const displayName = ref('')
const bio = ref('')

const loadProfile = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const profile = await socialApi.getMyProfile()
    username.value = profile?.username ?? ''
    displayName.value = profile?.displayName ?? ''
    bio.value = profile?.bio ?? ''
  } catch (e: any) {
    // 404 just means they have not made one yet — this form creates it.
    if (e?.response?.status === 404) return
    error.value = e?.response?.data?.error || e?.message || 'Failed to load profile.'
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  const nextUsername = username.value.trim()
  const nextDisplayName = displayName.value.trim()
  const nextBio = bio.value.trim()

  if (!nextUsername || !nextDisplayName) {
    error.value = 'Username and display name are required.'
    success.value = ''
    return
  }

  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const profile = await socialApi.updateProfile({
      username: nextUsername,
      displayName: nextDisplayName,
      bio: nextBio || undefined,
    })
    // Keep the sidebar label in sync with what they just saved.
    if (profile?.username) setUsername(profile.username)
    username.value = profile?.username ?? nextUsername
    displayName.value = profile?.displayName ?? nextDisplayName
    bio.value = profile?.bio ?? nextBio
    success.value = 'Profile updated.'
  } catch (e: any) {
    if (e?.response?.status === 404) {
      try {
        const created = await socialApi.createProfile({
          username: nextUsername,
          displayName: nextDisplayName,
          bio: nextBio || undefined,
        })
        if (created?.username) setUsername(created.username)
        username.value = created?.username ?? nextUsername
        displayName.value = created?.displayName ?? nextDisplayName
        bio.value = created?.bio ?? nextBio
        success.value = 'Profile created.'
        return
      } catch (createErr: any) {
        error.value =
          createErr?.response?.data?.error || createErr?.message || 'Failed to create profile.'
        return
      }
    }
    error.value = e?.response?.data?.error || e?.message || 'Failed to save profile.'
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadProfile())
</script>

<template>
  <section class="panel glass">
    <div class="section-title">
      <User :size="18" />
      <h3>Your profile</h3>
    </div>

    <div v-if="loading" class="muted">Loading your profile…</div>

    <form v-else class="profile-form" @submit.prevent="saveProfile">
      <div class="field-group">
        <label for="profile-username">Username</label>
        <input id="profile-username" v-model="username" type="text" autocomplete="username" required />
      </div>
      <div class="field-group">
        <label for="profile-display-name">Display name</label>
        <input id="profile-display-name" v-model="displayName" type="text" autocomplete="name" required />
      </div>
      <div class="field-group">
        <label for="profile-bio">Bio</label>
        <textarea
          id="profile-bio"
          v-model="bio"
          class="bio-input"
          rows="4"
          placeholder="Tell people a bit about yourself (optional)."
        />
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="success" class="success-msg">{{ success }}</p>

      <button class="btn btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save profile' }}
      </button>
    </form>
  </section>
</template>

<style scoped>

.panel {
  padding: 1.75rem;
  border-radius: 0.875rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}
.section-title h3 { margin: 0; font-size: 1.0625rem; font-weight: 800; }

.field-group { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.field-group label { font-size: 0.8125rem; font-weight: 600; color: var(--text-dim); }
.field-group input,
.field-group textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.bio-input { resize: vertical; }

.muted { color: var(--text-dim); font-size: 0.875rem; }
.hint { margin: 0.75rem 0 0; }
.error-msg { color: var(--danger, #ef4444); font-size: 0.875rem; margin: 0.5rem 0; }
.success-msg { color: var(--success, #22c55e); font-size: 0.875rem; margin: 0.5rem 0; }
</style>
