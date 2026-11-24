import { useEffect } from 'react'

/** Speak at once, cutting off anything still being said. English browser speech synthesis. */
export function say(text: string, volume = 1) {
  const s = window.speechSynthesis
  if (!s) return
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 1.1
  u.volume = volume
  s.speak(u)
}

/**
 * Mobile browsers only allow speech that starts from a user gesture. Call this from a tap
 * that has nothing to say yet, so later calls from timers are allowed.
 */
export function unlockSpeech() {
  say(' ', 0)
}

/** Keep the screen on while mounted, re-acquiring the lock when the page comes back. */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const get = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock
          ?.request('screen')
          .then((l) => (lock = l))
          .catch(() => {})
    }
    get()
    document.addEventListener('visibilitychange', get)
    return () => {
      document.removeEventListener('visibilitychange', get)
      lock?.release().catch(() => {})
    }
  }, [])
}
