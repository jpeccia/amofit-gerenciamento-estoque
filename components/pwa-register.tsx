'use client'

import { useEffect } from 'react'

/**
 * Registers the PWA service worker on browser environment.
 *
 * @returns null
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA Service Worker registered with scope:', registration.scope)
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err)
        })
    }
  }, [])

  return null
}
