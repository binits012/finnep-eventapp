import { useLocale } from '@/contexts/LocaleContext';

export function useTranslation() {
  const { locale, setLocale, translations, isLoading, t } = useLocale();

  return {
    t,
    locale,
    setLocale,
    translations,
    isLoading,
  };
}
