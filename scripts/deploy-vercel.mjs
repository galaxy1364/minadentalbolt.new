// scripts/deploy-vercel.mjs — Automated production deployer for Vercel
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Read .env.local
function getEnv() {
  const envPath = path.join(rootDir, '.env.local')
  const env = { ...process.env }
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        let val = match[2] || ''
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        env[match[1]] = val
      }
    }
  }
  return env
}

async function main() {
  const env = getEnv()
  const token = env.VERCEL_TOKEN
  const teamId = env.VERCEL_TEAM_ID || 'team_K4mkyTW2Ju9Xqg9uR39S3c3d'
  const projectName = env.VERCEL_PROJECT_NAME || 'minadentalbolt-new'

  if (!token) {
    console.error('❌ VERCEL_TOKEN is missing')
    process.exit(1)
  }

  console.log('🚀 Triggering Vercel Production Deployment for main branch...')

  const body = {
    name: projectName,
    target: 'production',
    gitSource: {
      type: 'github',
      repo: 'minadentalbolt.new',
      org: 'galaxy1364',
      ref: 'main',
    },
  }

  const res = await fetch(`https://api.vercel.com/v13/deployments?teamId=${teamId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('❌ Failed to trigger deployment:', data)
    process.exit(1)
  }

  const deploymentId = data.id
  const url = data.url
  console.log(`✅ Deployment initiated successfully!`)
  console.log(`   ID:  ${deploymentId}`)
  console.log(`   URL: https://${url}`)
  console.log('⏳ Waiting for deployment build to complete...')

  let ready = false
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 6000))
    const checkRes = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const checkData = await checkRes.json()
    console.log(`   Status: ${checkData.readyState || 'BUILDING'} (${i * 6 + 6}s)`)
    if (checkData.readyState === 'READY') {
      ready = true
      break
    }
    if (checkData.readyState === 'ERROR' || checkData.readyState === 'CANCELED') {
      console.error('❌ Deployment failed on Vercel:', checkData.error || checkData.readyState)
      process.exit(1)
    }
  }

  if (ready) {
    console.log(`🎉 Deployment is READY on production!`)
    console.log(`🌐 Live URL: https://minadentalbolt-new.vercel.app`)
  } else {
    console.log(`⚠️ Deployment is still building in background. Monitor at https://vercel.com`)
  }
}

main().catch((err) => {
  console.error('Fatal error during deployment:', err)
  process.exit(1)
})
