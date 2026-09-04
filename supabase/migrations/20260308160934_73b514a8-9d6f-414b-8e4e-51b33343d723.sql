
-- Trigger notification on new user signup
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'signup',
    'New Institution Signup',
    'A new user signed up: ' || COALESCE(NEW.display_name, 'Unknown') || ' (' || COALESCE(NEW.email, 'no email') || ')',
    jsonb_build_object('user_id', NEW.id, 'email', NEW.email, 'display_name', NEW.display_name)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_profile_notify
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_signup();

-- Trigger notification on new session creation
CREATE OR REPLACE FUNCTION public.notify_new_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, user_id, metadata)
  VALUES (
    'session_activity',
    'New Session Created',
    'Session "' || NEW.title || '" was created.',
    NEW.user_id,
    jsonb_build_object('session_id', NEW.id, 'title', NEW.title)
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_session_notify
AFTER INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_session();
