import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X, Mic2, BarChart3, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ElementType> = {
  turn_coming: Mic2,
  poll_created: BarChart3,
  question_answered: MessageCircle,
};

interface UserNotificationBellProps {
  sessionId: string;
}

export function UserNotificationBell({ sessionId }: UserNotificationBellProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const deviceId = getDeviceId();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`user-notif-${sessionId}-${deviceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `device_id=eq.${deviceId}`,
      }, (payload) => {
        const n = payload.new as UserNotification;
        setNotifications(prev => [n, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, deviceId]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('session_id', sessionId)
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as UserNotification[]);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold animate-glow-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80">
          <Card className="shadow-lg border-2 border-border">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-heading text-sm">Notifications ✨</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No notifications yet 📭</div>
                ) : (
                  notifications.map(n => {
                    const Icon = typeIcons[n.type] || Bell;
                    return (
                      <div
                        key={n.id}
                        className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/10 transition-colors ${
                          !n.is_read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => !n.is_read && markAsRead(n.id)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          !n.is_read ? 'bg-primary/10' : 'bg-muted/20'
                        }`}>
                          <Icon className={`w-4 h-4 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{n.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
