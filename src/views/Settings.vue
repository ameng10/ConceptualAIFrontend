<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { User, Github, KeyRound } from 'lucide-vue-next'
import { socialApi } from '@/services/social-api'
import { setUsername } from '@/services/auth-storage'
import GitHubAccountForm from '@/components/GitHubAccountForm.vue'
import { getAuthMethods, setPassword, type AuthMethods } from '@/services/federated-auth'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const username = ref('')
const displayName = ref('')
const bio = ref('')
const showConceptDesign = ref(false)

const loadProfile = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const profile = await socialApi.getMyProfile()
    username.value = profile?.username ?? ''
    displayName.value = profile?.displayName ?? ''
    bio.value = profile?.bio ?? ''
    showConceptDesign.value = Boolean(profile?.showConceptDesign)
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
      showConceptDesign: showConceptDesign.value,
    })

    // Keep auth display in sync for sidebar/header labels.
    if (profile?.username) setUsername(profile.username)

    username.value = profile?.username ?? nextUsername
    displayName.value = profile?.displayName ?? nextDisplayName
    bio.value = profile?.bio ?? nextBio
    if (typeof profile?.showConceptDesign === 'boolean') {
      showConceptDesign.value = profile.showConceptDesign
    }
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
          showConceptDesign: showConceptDesign.value,
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

// --- Sign-in methods (password + linked Google/GitHub) ---
const methods = ref<AuthMethods | null>(null)
const methodsError = ref('')
const pwSaving = ref(false)
const pwError = ref('')
const pwSuccess = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const loadAuthMethods = async () => {
  methodsError.value = ''
  try {
    methods.value = await getAuthMethods()
  } catch (e: any) {
    methodsError.value = e?.message || 'Failed to load sign-in methods.'
  }
}

const submitPassword = async () => {
  pwError.value = ''
  pwSuccess.value = ''
  if (newPassword.value.length < 8) {
    pwError.value = 'New password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'Passwords do not match.'
    return
  }
  const hadPassword = methods.value?.hasPassword === true
  if (hadPassword && !currentPassword.value) {
    pwError.value = 'Current password is required.'
    return
  }
  pwSaving.value = true
  try {
    await setPassword(newPassword.value, hadPassword ? currentPassword.value : undefined)
    pwSuccess.value = hadPassword ? 'Password changed.' : 'Password set. You can now sign in with email + password.'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await loadAuthMethods() // flips the form to change-mode without a reload
  } catch (e: any) {
    pwError.value = e?.message || 'Could not update password.'
  } finally {
    pwSaving.value = false
  }
}

onMounted(() => {
  void loadProfile()
  void loadAuthMethods()
})
</script>

<template>
  <div class="settings-view">
    <div class="container fade-in">
      <div class="header">
        <h1 class="animated-gradient-text">Settings</h1>
        <p class="subtitle">Manage your GitHub connection and public profile.</p>
      </div>

      <main class="settings-content glass">
        <div class="section-title">
          <KeyRound :size="18" />
          <h3>Sign-in Methods</h3>
        </div>

        <div v-if="methodsError" class="error-msg">{{ methodsError }}</div>
        <div v-else-if="!methods" class="muted">Loading sign-in methods...</div>
        <template v-else>
          <ul class="methods-list">
            <li>
              <span class="method-name">Password</span>
              <span :class="['method-state', methods.hasPassword ? 'on' : 'off']">
                {{ methods.hasPassword ? 'Set' : 'Not set' }}
              </span>
            </li>
            <li>
              <span class="method-name">Google</span>
              <span :class="['method-state', methods.google ? 'on' : 'off']">
                {{ methods.google ? 'Linked' : 'Not linked' }}
              </span>
            </li>
            <li>
              <span class="method-name">GitHub</span>
              <span :class="['method-state', methods.github ? 'on' : 'off']">
                {{ methods.github ? 'Linked' : 'Not linked' }}
              </span>
            </li>
          </ul>
          <p class="muted hint">
            Signing in with Google or GitHub using {{ methods.email }} always lands in this account.
          </p>

          <form class="password-form" @submit.prevent="submitPassword">
            <h4>{{ methods.hasPassword ? 'Change password' : 'Set a password' }}</h4>
            <div v-if="methods.hasPassword" class="field-group">
              <label>Current password</label>
              <input v-model="currentPassword" type="password" autocomplete="current-password" />
            </div>
            <div class="field-group">
              <label>New password</label>
              <input v-model="newPassword" type="password" autocomplete="new-password" />
            </div>
            <div class="field-group">
              <label>Confirm new password</label>
              <input v-model="confirmPassword" type="password" autocomplete="new-password" />
            </div>
            <div v-if="pwError" class="error-msg">{{ pwError }}</div>
            <div v-if="pwSuccess" class="success-msg">{{ pwSuccess }}</div>
            <button type="submit" class="btn btn-primary" :disabled="pwSaving">
              {{ pwSaving ? 'Saving…' : methods.hasPassword ? 'Change Password' : 'Set Password' }}
            </button>
          </form>
        </template>
      </main>

      <main class="settings-content glass">
        <div class="section-title">
          <Github :size="18" />
          <h3>GitHub Connection</h3>
        </div>

        <GitHubAccountForm />
      </main>

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

          <div class="field-group toggle-field">
            <label class="toggle-row" for="profile-show-concept-design">
              <input
                id="profile-show-concept-design"
                v-model="showConceptDesign"
                type="checkbox"
                class="toggle-checkbox"
              />
              <span class="toggle-copy">
                <span class="toggle-label">Show concept-design review step (advanced)</span>
                <span class="toggle-hint">Pause the pipeline after the design stage so you can review and modify the concept design before the build finishes.</span>
              </span>
            </label>
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

.reconnect-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.reconnect-copy {
  margin: 0;
  color: var(--text-dim);
}

.reconnect-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: end;
}

.reconnect-field {
  margin-bottom: 0;
  max-width: none;
}

.reconnect-btn {
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  width: fit-content;
}

.reconnect-message {
  margin: 0;
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

.toggle-field {
  max-width: 520px;
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  margin-top: 0.2rem;
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
  flex: 0 0 auto;
}

.toggle-copy {
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.toggle-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.4;
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

.methods-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.methods-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.method-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.method-state {
  font-size: 0.8rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
}

.method-state.on {
  color: rgba(16, 185, 129, 0.95);
  background: rgba(16, 185, 129, 0.12);
}

.method-state.off {
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.06);
}

.hint {
  font-size: 0.8rem;
  margin-bottom: 1.25rem;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.password-form h4 {
  font-size: 0.95rem;
  margin: 0;
}

@media (max-width: 780px) {
  .reconnect-form {
    grid-template-columns: 1fr;
  }
}
</style>
