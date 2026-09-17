// Language metadata for all 11 major Indian languages

export interface LanguageMeta {
  code: string
  name: string       // English name
  nativeName: string // Native script
  script: string
  flag: string
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English',    nativeName: 'English',    script: 'Latin',   flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',      nativeName: 'தமிழ்',      script: 'Tamil',  flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     nativeName: 'తెలుగు',     script: 'Telugu', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    nativeName: 'বাংলা',      script: 'Bengali',flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    nativeName: 'मराठी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',   nativeName: 'ગુજરાતી',   script: 'Gujarati',flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    nativeName: 'ಕನ್ನಡ',     script: 'Kannada',flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  nativeName: 'മലയാളം',   script: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',     script: 'Gurmukhi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',      script: 'Arabic', flag: '🇮🇳' },
]

export const DEFAULT_LANGUAGE = 'en'
