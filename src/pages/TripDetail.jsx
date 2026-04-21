import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setTrip(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-muted-foreground">Trip not found.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">{trip.title}</h1>
            <p className="text-muted-foreground">{trip.destination_summary}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
        {trip.description && (
          <p className="text-foreground">{trip.description}</p>
        )}
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Days and items will appear here
        </div>
      </div>
    </div>
  )
}
