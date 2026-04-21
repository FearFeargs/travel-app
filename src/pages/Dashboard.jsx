import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import NewTripModal from '@/components/NewTripModal'

export default function Dashboard() {
  const user = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setDisplayName(data.display_name)
      })
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Welcome, {displayName || '…'}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setModalOpen(true)}>New trip</Button>
            <Button variant="outline" onClick={handleLogout}>Log out</Button>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Your trips will appear here
        </div>
      </div>
      <NewTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
