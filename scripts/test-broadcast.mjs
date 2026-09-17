import { createClient } from '@supabase/supabase-js'

const url = 'https://gkxkihdibkmpryopbkkz.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreGtpaGRpYmttcHJ5b3Bia2t6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MDU2NTQsImV4cCI6MjEwMjQ4MTY1NH0.MWcT9IOmGrj25NRyZgCUmXBzcjvbCDgHbNTQPoKlAms'

async function run() {
  console.log('Connecting Client A (iPhone) and Client B (Laptop)...')
  const clientA = createClient(url, key)
  const chanA = clientA.channel('minadent-realtime', {
    config: { broadcast: { self: false } }
  })

  const clientB = createClient(url, key)
  const chanB = clientB.channel('minadent-realtime', {
    config: { broadcast: { self: false } }
  })

  let received = false
  chanB.on('broadcast', { event: 'data_changed' }, ({ payload }) => {
    console.log('🎉 CLIENT B (Laptop) RECEIVED INSTANT BROADCAST FROM CLIENT A (iPhone)!')
    console.log('Payload:', payload)
    received = true
  })

  await new Promise((resolve) => chanB.subscribe((status) => {
    console.log('Client B status:', status)
    if (status === 'SUBSCRIBED') resolve(null)
  }))

  await new Promise((resolve) => chanA.subscribe((status) => {
    console.log('Client A status:', status)
    if (status === 'SUBSCRIBED') resolve(null)
  }))

  console.log('Sending appointment from Client A...')
  const sendRes = await chanA.send({
    type: 'broadcast',
    event: 'data_changed',
    payload: {
      table: 'appointments',
      action: 'insert',
      data: {
        id: 'test-appt-reza',
        patient_name: 'Reza',
        date: '2026-09-17',
        start_time: '11:00',
        status: 'scheduled'
      },
      senderId: 'device-iphone-123',
      timestamp: Date.now()
    }
  })
  console.log('Send result:', sendRes)

  await new Promise((r) => setTimeout(r, 2500))
  console.log('Final Result: received =', received)
  process.exit(received ? 0 : 1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
