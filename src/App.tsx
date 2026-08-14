import React, { useEffect } from 'react'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/auth'
import { initialSync } from './lib/sync'

function SyncOnMount() {
  useEffect(() => {
    initialSync()
  }, [])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <SyncOnMount />
      <Layout />
    </AuthProvider>
  )
}
