import React, { useEffect } from 'react'
import { Layout } from './components/Layout'
import { initialSync } from './lib/sync'

export default function App() {
  useEffect(() => {
    initialSync()
  }, [])
  return <Layout />
}
