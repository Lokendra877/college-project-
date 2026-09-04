import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Send, BarChart3, CheckSquare, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AdminPollCreatorProps {
  sessionId: string;
}

export function AdminPollCreator({ sessionId }: AdminPollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [timerDuration, setTimerDuration] = useState('0'); // 0 = no timer, value in seconds

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const createPoll = async () => {
    if (!question.trim()) { toast.error('Enter a question'); return; }
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) { toast.error('Need at least 2 options'); return; }

    setCreating(true);
    const durationSec = parseInt(timerDuration);
    const closesAt = durationSec > 0 ? new Date(Date.now() + durationSec * 1000).toISOString() : null;
    const { error } = await supabase
      .from('session_polls')
      .insert({
        session_id: sessionId,
        question: question.trim(),
        options: validOptions as unknown as any,
        is_multi_select: isMultiSelect,
        closes_at: closesAt,
      } as any);

    if (error) {
      toast.error('Failed to create poll');
    } else {
      toast.success('Poll created! 🗳️');
      setQuestion('');
      setOptions(['', '']);
      setIsMultiSelect(false);
      setTimerDuration('0');
      setShowForm(false);
    }
    setCreating(false);
  };

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-2">
        <BarChart3 className="w-4 h-4" /> Create Poll
      </Button>
    );
  }

  return (
    <Card className="anime-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> New Poll
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Poll question..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={200}
        />
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={e => {
                const updated = [...options];
                updated[idx] = e.target.value;
                setOptions(updated);
              }}
              maxLength={100}
            />
            {options.length > 2 && (
              <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} className="shrink-0 text-destructive">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between">
          {options.length < 6 && (
            <Button variant="ghost" size="sm" onClick={addOption}>
              <Plus className="w-4 h-4 mr-1" /> Add Option
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="multi-select"
              checked={isMultiSelect}
              onCheckedChange={(checked) => setIsMultiSelect(checked === true)}
            />
            <Label htmlFor="multi-select" className="text-xs cursor-pointer flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> Allow multiple selections
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <Label className="text-xs">Auto-close after:</Label>
          <Select value={timerDuration} onValueChange={setTimerDuration}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No timer</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="120">2 minutes</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="600">10 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={createPoll} disabled={creating} className="bg-primary text-primary-foreground">
            <Send className="w-4 h-4 mr-1" /> {creating ? 'Creating...' : 'Launch Poll'}
          </Button>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
