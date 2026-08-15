import React, { useEffect } from 'react'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/auth'
import { initialSync } from './lib/sync'
import { runAutoBackupIfNeeded } from './lib/autoBackup'

function SyncOnMount() {
  useEffect(() => {
    initialSync()
    runAutoBackupIfNeeded()
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
