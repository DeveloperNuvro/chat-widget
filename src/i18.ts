import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'es', // default language
    fallbackLng: 'es', // use english if selected language is not available
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;