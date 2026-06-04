import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../state/auth/AuthProvider.jsx'
import { LogOut, User, Settings, Upload } from 'lucide-react'

export default function ProfilePopover() {
  const { user, signOutUser, uploadProfilePhoto } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  async function handlePhotoChange(file) {
    if (!file) return
    setUploadError(null)
    setUploadLoading(true)

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = reader.result
        if (typeof base64 !== 'string') {
          throw new Error('Invalid file data')
        }
        const payload = base64.split(',')[1]
        await uploadProfilePhoto(payload, file.type)
      } catch (err) {
        setUploadError(err?.message || 'Unable to upload photo')
      } finally {
        setUploadLoading(false)
      }
    }
    reader.onerror = () => {
      setUploadError('Unable to read the selected file')
      setUploadLoading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl bg-[color:var(--glass)] px-3 py-2 text-sm text-[color:var(--text)] ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)]"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <span className="hidden sm:block">{user?.displayName}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] p-2 shadow-[var(--shadow-soft)]"
          >
            <div className="px-3 py-2 border-b border-[color:var(--glass-border)]">
              <div className="text-sm font-medium text-[color:var(--text)]">{user?.displayName}</div>
              <div className="text-xs text-[color:var(--text-muted)]">{user?.email}</div>
            </div>

            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)] transition">
              <Settings size={16} />
              Settings
            </button>

            <label
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)] transition"
              htmlFor="profile-photo-upload"
            >
              <Upload size={16} />
              {uploadLoading ? 'Uploading...' : 'Upload photo'}
            </label>
            <input
              ref={fileInputRef}
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                handlePhotoChange(file)
                event.target.value = ''
              }}
            />
            {uploadError && (
              <div className="mx-3 mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                {uploadError}
              </div>
            )}

            <button
              onClick={() => {
                signOutUser()
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
