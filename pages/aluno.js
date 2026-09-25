import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Aluno() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/')
    }, 100)
    setLoading(false)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
}
