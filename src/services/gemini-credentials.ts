import { computed, ref } from 'vue'

export type GeminiTier = '0' | '1' | '2' | '3'

const apiKey = ref('')
const tier = ref<GeminiTier>('0')

export function useGeminiCredentials() {
  const isTierSupported = computed(() => tier.value === '1' || tier.value === '2' || tier.value === '3')
  const hasApiKey = computed(() => apiKey.value.trim().length > 0)
  const isValid = computed(() => hasApiKey.value && isTierSupported.value)

  const setApiKey = (value: string) => {
    apiKey.value = value
  }

  const setTier = (value: GeminiTier) => {
    tier.value = value
  }

  const clear = () => {
    apiKey.value = ''
    tier.value = '0'
  }

  return {
    apiKey,
    tier,
    isTierSupported,
    hasApiKey,
    isValid,
    setApiKey,
    setTier,
    clear,
  }
}

export function getGeminiHeadersOrThrow(): Record<string, string> {
  const key = apiKey.value.trim()
  if (!key) {
    throw new Error('Missing Gemini API Key. Add it in Settings or on the Create Project page.')
  }

  if (!(tier.value === '1' || tier.value === '2' || tier.value === '3')) {
    throw new Error('Invalid Gemini tier. Tier 0 is unsupported; select 1, 2, or 3.')
  }

  return {
    'X-Gemini-Api-Key': key,
    'X-Gemini-Tier': tier.value,
  }
}
