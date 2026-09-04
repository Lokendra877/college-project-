import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, ThumbsUp, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  user_name: string;
  question: string;
  is_answered: boolean;
  created_at: string;
  device_id: string;
}

interface AudienceQuestionsProps {
  sessionId: string;
  userName: string;
}

export function AudienceQuestions({ sessionId, userName }: AudienceQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [upvotes, setUpvotes] = useState<Record<string, number>>({});
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const deviceId = getDeviceId();

  useEffect(() => {
    fetchQuestions();
    fetchUpvotes();

    const channel = supabase
      .channel(`questions-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audience_questions', filter: `session_id=eq.${sessionId}` }, () => fetchQuestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_upvotes' }, () => fetchUpvotes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('audience_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (data) setQuestions(data as Question[]);
  };

  const fetchUpvotes = async () => {
    // Get all upvotes for this session's questions
    const { data: questionsData } = await supabase
      .from('audience_questions')
      .select('id')
      .eq('session_id', sessionId);
    
    if (!questionsData) return;
    const qIds = questionsData.map(q => q.id);
    if (qIds.length === 0) return;

    const { data: allUpvotes } = await supabase
      .from('question_upvotes')
      .select('question_id, device_id')
      .in('question_id', qIds);

    if (allUpvotes) {
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      allUpvotes.forEach(u => {
        counts[u.question_id] = (counts[u.question_id] || 0) + 1;
        if (u.device_id === deviceId) mine.add(u.question_id);
      });
      setUpvotes(counts);
      setMyUpvotes(mine);
    }
  };

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('audience_questions')
      .insert({
        session_id: sessionId,
        device_id: deviceId,
        user_name: userName,
        question: newQuestion.trim(),
      });
    if (error) {
      toast.error('Failed to submit question');
    } else {
      setNewQuestion('');
      toast.success('Question submitted! ✨');
    }
    setSubmitting(false);
  };

  const toggleUpvote = async (questionId: string) => {
    if (myUpvotes.has(questionId)) {
      await supabase
        .from('question_upvotes')
        .delete()
        .eq('question_id', questionId)
        .eq('device_id', deviceId);
      setMyUpvotes(prev => { const s = new Set(prev); s.delete(questionId); return s; });
      setUpvotes(prev => ({ ...prev, [questionId]: (prev[questionId] || 1) - 1 }));
    } else {
      await supabase
        .from('question_upvotes')
        .insert({ question_id: questionId, device_id: deviceId });
      setMyUpvotes(prev => new Set(prev).add(questionId));
      setUpvotes(prev => ({ ...prev, [questionId]: (prev[questionId] || 0) + 1 }));
    }
  };

  // Sort by upvotes (most upvoted first)
  const sortedQuestions = [...questions].sort((a, b) => (upvotes[b.id] || 0) - (upvotes[a.id] || 0));

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4" /> Questions ({questions.length})
      </h3>

      {/* Submit question */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask a question..."
          value={newQuestion}
          onChange={e => setNewQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitQuestion()}
          maxLength={300}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={submitQuestion}
          disabled={submitting || !newQuestion.trim()}
          className="bg-primary text-primary-foreground shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Questions list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {sortedQuestions.map(q => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className={`anime-card overflow-hidden ${q.is_answered ? 'opacity-60' : ''}`}>
                <CardContent className="p-3 flex gap-3">
                  <button
                    onClick={() => toggleUpvote(q.id)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors shrink-0 ${
                      myUpvotes.has(q.id)
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/10 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${myUpvotes.has(q.id) ? 'fill-primary' : ''}`} />
                    <span className="text-xs font-bold">{upvotes[q.id] || 0}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{q.user_name}</span>
                      {q.is_answered && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Answered
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {questions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">No questions yet. Be the first to ask! 🙋</p>
        )}
      </div>
    </div>
  );
}
