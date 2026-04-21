import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function NewTripModal({ open, onClose }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!title.trim()) return 'Title is required.'
    if (!destination.trim()) return 'Destination is required.'
    if (!startDate) return 'Start date is required.'
    if (!endDate) return 'End date is required.'
    if (endDate < startDate) return 'End date must be on or after the start date.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('create_trip', {
      p_title: title.trim(),
      p_destination_summary: destination.trim(),
      p_start_date: startDate,
      p_end_date: endDate,
      p_description: description.trim() || null,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    navigate(`/trips/${data}`)
  }

  function handleClose() {
    if (loading) return
    setTitle('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Baja Spring Break 2027"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              placeholder="Baja California, Mexico"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">
              Description{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="A week exploring the coast…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create trip'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
