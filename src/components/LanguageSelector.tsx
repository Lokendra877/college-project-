import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, ChevronDown, Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/hooks/useTranslation';

interface LanguageSelectorProps {
  selectedLanguage: string | null;
  onSelect: (lang: string | null) => void;
}

export function LanguageSelector({ selectedLanguage, onSelect }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-0 shadow-[var(--shadow-sm)] overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-primary" />
            <span className="text-sm font-body font-medium">
              {selectedLanguage ? `Translating to: ${selectedLanguage}` : 'Select translation language'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => { onSelect(null); setIsOpen(false); }}
                  className={`text-xs px-2 py-1.5 rounded-md font-body transition-colors ${
                    !selectedLanguage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Off
                </button>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { onSelect(lang); setIsOpen(false); }}
                    className={`text-xs px-2 py-1.5 rounded-md font-body transition-colors ${
                      selectedLanguage === lang
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
