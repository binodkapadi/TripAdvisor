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
        className="flex items-center gap-2 rounded-full sm:rounded-2xl bg-[color:var(--glass)] p-1 sm:px-3 sm:py-2 text-sm text-[color:var(--text)] ring-1 ring-[color:var(--glass-border)] transition hover:bg-[color:var(--glass-hover)]"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="h-7 w-7 sm:h-6 sm:w-6 rounded-full object-cover"
          />
        ) : (
          <div className="h-7 w-7 sm:h-6 sm:w-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
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
            className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] p-2 shadow-[var(--shadow-soft)]"
          >
            <div className="px-4 py-3 border-b border-[color:var(--glass-border)] flex items-center gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[color:var(--glass-border)]"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center ring-2 ring-[color:var(--glass-border)]">
                  <User size={20} className="text-white" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-semibold text-[color:var(--text)] truncate">{user?.displayName}</div>
                <div className="text-xs text-[color:var(--text-muted)] truncate">{user?.email}</div>
              </div>
            </div>

            <div className="p-2 space-y-1">
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-[color:var(--text)] mb-2">Upload photo</div>
                <div className="flex items-center gap-2">
                  <label
                    className="cursor-pointer rounded bg-[color:var(--glass)] px-2 py-1 text-xs text-[color:var(--text)] ring-1 ring-[color:var(--glass-border)] hover:bg-[color:var(--glass-hover)] transition"
                    htmlFor="profile-photo-upload"
                  >
                    Choose File
                  </label>
                  <span className="text-xs text-[color:var(--text-muted)] truncate">
                    {uploadLoading ? 'Uploading...' : 'No file chosen'}
                  </span>
                </div>
              </div>

              <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[color:var(--text-soft)] hover:bg-[color:var(--glass-hover)] hover:text-[color:var(--text)] transition">
                <Settings size={16} />
                Settings
              </button>
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
            </div>

            <div className="p-2 border-t border-[color:var(--glass-border)]">
              <button
                onClick={() => {
                  signOutUser()
                  setIsOpen(false)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-3 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition"
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
