
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Student } from '../types';

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const sendOverdueAlert = async (student: Student, durationMins: number, librarianEmail: string) => {
  try {
    // 1. Browser Notification (Instant Feedback)
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 Library Overdue Alert", {
        body: `${student.name} (${student.id}) has been in the library for ${Math.floor(durationMins / 60)}h ${durationMins % 60}m.`,
        icon: student.photo || "/favicon.ico"
      });
    }

    // 2. Email Notification via Supabase Edge Function
    if (isSupabaseConfigured && librarianEmail && librarianEmail !== 'undefined') {
      try {
        const { data, error } = await supabase.functions.invoke('notify-overdue', {
          body: {
            studentName: student.name,
            studentId: student.id,
            duration: durationMins,
            recipient: librarianEmail
          }
        });
        if (error) throw error;
        console.log('Email alert triggered via Edge Function:', data);
      } catch (err) {
        console.warn('Edge Function communication failed:', err instanceof Error ? err.message : 'Unknown network error');
      }
    }
  } catch (globalErr) {
    console.error("Critical failure in overdue alert service:", globalErr);
  }
};
