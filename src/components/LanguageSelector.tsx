import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Languages, Search, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageInfo } from '@/lib/translationService';

interface LanguageSelectorProps {
  selectedLanguage: string | null;
  onSelect: (lang: string | null) => void;
  labelPrefix?: string;
}

export function LanguageSelector({
  selectedLanguage,
  onSelect,
  labelPrefix = 'Translating to',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = SUPPORTED_LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border shadow-[var(--shadow-sm)] overflow-hidden">
      <CardContent className="p-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block leading-tight">
                {labelPrefix}:
              </span>
              <span className="text-sm font-semibold text-foreground">
                {selectedLanguage || 'Off (Original Voice Only)'}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/50 bg-card"
            >
              <div className="p-3 space-y-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search language (Hindi, Spanish, etc.)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  <button
                    onClick={() => {
                      onSelect(null);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-lg font-medium transition-colors ${
                      !selectedLanguage
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>Off (Original)</span>
                    {!selectedLanguage && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {filtered.map((lang: LanguageInfo) => {
                    const isSelected = selectedLanguage === lang.name;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onSelect(lang.name);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <span className="truncate">{lang.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-1 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
