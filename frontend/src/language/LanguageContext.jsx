
import React, { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('dairyLanguage') || 'en'
  )

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage)
    localStorage.setItem('dairyLanguage', newLanguage)
  }

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function LanguageSelector() {
  const { language, changeLanguage } = useLanguage()

  return (
    <select
      className="form-select form-select-sm"
      style={{ width: '135px' }}
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
      aria-label="Select language"
    >
      <option value="en">English</option>
      <option value="mr">मराठी</option>
      <option value="hi">हिंदी</option>
    </select>
  )
}



export function GlobalLanguageSelector() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '15px',
        zIndex: 9999,
        width: '145px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <LanguageSelector />
    </div>
  )
}
