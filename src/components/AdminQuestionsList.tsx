import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  user_name: string;
  question: string;
  is_answered: boolean;
  created_at: string;
}

interface AdminQuestionsListProps {
  sessionId: string;
}

export function AdminQuestionsList({ sessionId }: AdminQuestionsListProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [upvotes, setUpvotes] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchQuestions();

    const channel = supabase
      .channel(`admin-questions-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audience_questions', filter: `session_id=eq.${sessionId}` }, () => fetchQuestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_upvotes' }, () => fetchUpvoteCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('audience_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (data) {
      setQuestions(data as Question[]);
      fetchUpvoteCounts();
    }
  };

  const fetchUpvoteCounts = async () => {
    const { data: questionsData } = await supabase
      .from('audience_questions')
      .select('id')
      .eq('session_id', sessionId);
    if (!questionsData) return;
    const qIds = questionsData.map(q => q.id);
    if (qIds.length === 0) return;

    const { data: allUpvotes } = await supabase
      .from('question_upvotes')
      .select('question_id')
      .in('question_id', qIds);

    if (allUpvotes) {
      const counts: Record<string, number> = {};
      allUpvotes.forEach(u => { counts[u.question_id] = (counts[u.question_id] || 0) + 1; });
      setUpvotes(counts);
    }
  };

  const markAnswered = async (id: string) => {
    await supabase.from('audience_questions').update({ is_answered: true }).eq('id', id);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_answered: true } : q));
  };

  const sortedQuestions = [...questions].sort((a, b) => (upvotes[b.id] || 0) - (upvotes[a.id] || 0));

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No audience questions yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      <AnimatePresence>
        {sortedQuestions.map(q => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`anime-card ${q.is_answered ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-primary/10 shrink-0">
                  <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">{upvotes[q.id] || 0}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">— {q.user_name}</p>
                </div>
                {!q.is_answered ? (
                  <Button size="sm" variant="outline" onClick={() => markAnswered(q.id)} className="shrink-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Answered
                  </Button>
                ) : (
                  <span className="text-xs text-success font-medium shrink-0">✓ Answered</span>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
