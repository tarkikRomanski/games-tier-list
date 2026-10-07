import { Fragment, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import uk from './uk.js';

/** Languages the interface is available in. `code` is the BCP 47 tag, `short` is shown in the header switcher. */
export const LANGUAGES = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'uk', short: 'UA', label: 'Українська' },
];

const DICTIONARIES = { en, uk };
const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'lang';

const isSupported = (code) => Object.hasOwn(DICTIONARIES, code);

/** The saved choice, else the first supported language the browser asks for, else English. */
function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (isSupported(base)) return base;
  }
  return DEFAULT_LANG;
}

// The active language, readable outside React (API errors, date helpers).
let currentLang = detectLanguage();
export const getLanguage = () => currentLang;

const pluralRules = {};
function pluralForm(lang, count) {
  pluralRules[lang] ??= new Intl.PluralRules(lang);
  return pluralRules[lang].select(count);
}

/**
 * Replaces `{name}` placeholders with `vars[name]`. Returns a string, or an array of React nodes
 * when a value is an element (e.g. a <Link> in the middle of a sentence).
 */
function interpolate(template, vars) {
  if (!vars) return template;
  const parts = template.split(/\{(\w+)\}/);
  if (parts.length === 1) return template;
  let hasElements = false;
  const out = parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const value = vars[part];
    if (isValidElement(value)) {
      hasElements = true;
      return <Fragment key={i}>{value}</Fragment>;
    }
    return value ?? `{${part}}`;
  });
  return hasElements ? out : out.join('');
}

/**
 * Looks up `key` in the language's dictionary, falling back to English and then to the key itself.
 * An entry may be an object of plural forms ({ one, few, many, other }) chosen by `vars.count`.
 */
export function translate(lang, key, vars) {
  let entry = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANG][key];
  if (entry === undefined) return key;
  if (typeof entry === 'object') entry = entry[pluralForm(lang, vars?.count ?? 0)] ?? entry.other;
  return interpolate(entry, vars);
}

/**
 * A catalogue genre ("Shooter") in `lang`. Catalogue names are already English, so only other languages
 * carry `genre.*` entries, and a genre missing from the dictionary keeps its catalogue name.
 */
export const translateGenre = (lang, name) => DICTIONARIES[lang]?.[`genre.${name}`] ?? name;

/** Translate with the active language, for code that runs outside components. */
export const t = (key, vars) => translate(currentLang, key, vars);

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang);

  useEffect(() => {
    currentLang = lang;
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!isSupported(next)) return;
    currentLang = next;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page view only */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `{ lang, setLang, t }` for the active language. */
export const useI18n = () => useContext(I18nContext);
