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
    const status = e?.response?.status
    if (status === 404) {
      // Keep empty values; user can create profile from this form.
      return
    }
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

    // Keep auth display in sync for sidebar/header labels.
    if (profile?.username) setUsername(profile.username)

    username.value = profile?.username ?? nextUsername
    displayName.value = profile?.displayName ?? nextDisplayName
    bio.value = profile?.bio ?? nextBio
    success.value = 'Profile updated.'
  } catch (e: any) {
    const status = e?.response?.status
    // If profile does not exist yet, create it from current form values.
    if (status === 404) {
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

onMounted(loadProfile)
</script>

<template>
  <div class="settings-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Profile Settings</h1>
        <p class="subtitle">Update your public profile details.</p>
      </div>

      <main class="settings-content glass">
        <div class="section-title">
          <User :size="18" />
          <h3>Your Profile</h3>
        </div>

        <div v-if="loading" class="muted">Loading your profile...</div>

        <form v-else class="profile-form" @submit.prevent="saveProfile">
          <div class="field-group">
            <label for="profile-username">Username</label>
            <input
              id="profile-username"
              v-model="username"
              type="text"
              class="input"
              autocomplete="username"
              required
            />
          </div>

          <div class="field-group">
            <label for="profile-display-name">Display Name</label>
            <input
              id="profile-display-name"
              v-model="displayName"
              type="text"
              class="input"
              autocomplete="name"
              required
            />
          </div>

          <div class="field-group">
            <label for="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              v-model="bio"
              class="input bio-input"
              rows="4"
              placeholder="Tell people a bit about yourself (optional)."
            />
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
          <p v-if="success" class="success-msg">{{ success }}</p>

          <button class="btn btn-primary save-profile-btn" type="submit" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Profile' }}
          </button>
        </form>
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 3rem 1rem;
}

.container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-dim);
}

.settings-content {
  padding: 1.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
}

.section-title h3 {
  font-size: 1.2rem;
}

.profile-form {
  display: flex;
  flex-direction: column;
}

.save-profile-btn {
  border-radius: 10px;
  padding: 0.42rem 0.90rem;
  font-size: 0.875rem;
  width: fit-content;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1rem;
  max-width: 520px;
}

.field-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
}

.bio-input {
  resize: vertical;
  min-height: 96px;
}

.muted {
  color: var(--text-dim);
}

.error-msg {
  color: rgba(239, 68, 68, 0.95);
  margin-bottom: 0.9rem;
}

.success-msg {
  color: rgba(16, 185, 129, 0.95);
  margin-bottom: 0.9rem;
}

.btn-primary {
  align-self: flex-start;
}
</style>
