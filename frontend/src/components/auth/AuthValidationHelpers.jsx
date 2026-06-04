import React from 'react'

export const ALLOWED_DOMAINS = [
  'gmail.com', 'googlemail.com', 'microsoft.com', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'aol.com',
  'zoho.com', 'zohomail.com', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com',
  'yandex.ru', 'fastmail.com', 'tutanota.com', 'tutanota.de', 'rediffmail.com',
  'mail.ru', 'qq.com', 'naver.com', 'daum.net', 'kakao.com', 'cox.net',
  'comcast.net', 'verizon.net', 'att.net', 'btinternet.com'
]

export function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isEmailAllowed(email) {
  if (!isEmailValid(email)) return false
  const parts = email.split('@')
  if (parts.length !== 2) return false
  const domain = parts[1].toLowerCase()
  
  // Check for educational domains
  if (domain.endsWith('.edu') || domain.includes('.edu.')) {
    return true
  }
  
  return ALLOWED_DOMAINS.includes(domain)
}

export function checkPasswordStrength(password) {
  const pwd = password || ''
  return {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^a-zA-Z0-9]/.test(pwd),
  }
}

export function isPasswordValid(password) {
  const checks = checkPasswordStrength(password)
  return checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special
}

export function PasswordStrengthValidator({ password }) {
  if (!password) return null

  const checks = checkPasswordStrength(password)
  const rules = [
    { label: 'At least 8 characters', valid: checks.length },
    { label: 'One uppercase letter', valid: checks.uppercase },
    { label: 'One lowercase letter', valid: checks.lowercase },
    { label: 'One number', valid: checks.number },
    { label: 'One special character', valid: checks.special },
  ]

  return (
    <div className="mt-2 space-y-1 text-xs transition-all duration-300">
      {rules.map((rule, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-1.5 font-medium ${
            rule.valid ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
          }`}
        >
          <span className="text-sm leading-none">{rule.valid ? '✓' : '✗'}</span>
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ConfirmPasswordValidator({ password, confirmPassword }) {
  if (!confirmPassword) return null
  const matches = password === confirmPassword

  return (
    <div
      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
        matches ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
      }`}
    >
      <span className="text-sm leading-none">{matches ? '✓' : '✗'}</span>
      <span>{matches ? 'Password matched' : 'Password does not match'}</span>
    </div>
  )
}

export function EmailDomainValidator({ email }) {
  if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) return null
  const allowed = isEmailAllowed(email)

  if (!allowed) {
    return (
      <div className="mt-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium leading-tight">
        Registration is only allowed for trusted email providers or educational domains.
      </div>
    )
  }

  return null
}
