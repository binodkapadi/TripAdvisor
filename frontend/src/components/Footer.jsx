import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import fbIcon from '../images/fb.jpg'
import discordIcon from '../images/discord.png'
import githubIcon from '../images/github.png'
import instagramIcon from '../images/instagram.jpg'
import telegramIcon from '../images/telegram.png'
import twitterIcon from '../images/Twiter.png'
import linkedinIcon from '../images/linkden.png'
import youtubeIcon from '../images/youtube.jpg'

const social = [
  { src: fbIcon, href: 'https://www.facebook.com/royalbinod.kapadi', label: 'Facebook' },
  { src: discordIcon, href: 'https://discord.com/users/1020520872206938153', label: 'Discord' },
  { src: githubIcon, href: 'https://github.com/binodkapadi', label: 'GitHub' },
  { src: instagramIcon, href: 'https://www.instagram.com/binodbhatt9865', label: 'Instagram' },
  { src: telegramIcon, href: 'https://t.me/errevolution1', label: 'Telegram' },
  { src: twitterIcon, href: 'https://x.com/KapadiBinod', label: 'Twitter' },
  { src: linkedinIcon, href: 'https://www.linkedin.com/in/binodkapadi', label: 'LinkedIn' },
  { src: youtubeIcon, href: 'https://www.youtube.com/@errevolution1', label: 'YouTube' }
]

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[color:var(--glass-border)] bg-[color:var(--glass-strong)]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center gap-8">
          {/* Logo and Tagline */}
          <div className="flex flex-col items-center gap-4">
            <Link to="/#home" className="group inline-flex items-center gap-2">
              <motion.div
                className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 ring-1 ring-[color:var(--glass-border)]"
                whileHover={{ rotate: -5, scale: 1.05 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-lg">✈︎</span>
              </motion.div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-white">Trip</span>
                <span className="text-lg font-extrabold text-orange-400">Advisor</span>
              </div>
            </Link>

            <p className="text-center text-sm text-[color:var(--text-muted)] max-w-md">
              AI-powered travel planning that turns your dream trips into beautifully optimized itineraries.
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex flex-wrap gap-4 justify-center">
            {social.map((s, idx) => (
              <motion.a
                key={`${s.label}-${idx}`}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 shadow-sm transition hover:scale-105 hover:bg-white/20"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                aria-label={s.label}
              >
                <img src={s.src} alt={s.label} className="h-8 w-8 rounded-full object-contain" />
              </motion.a>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center text-xs text-[color:var(--text-muted)] border-t border-[color:var(--glass-border)] pt-8 w-full">
            <div className="text-sm text-[color:var(--text-soft)] mb-1">Copyright © by Binod Kapadi</div>
            <div>All Rights Reserved — 2026</div>
          </div>
        </div>
      </div>
    </footer>
  )
}

