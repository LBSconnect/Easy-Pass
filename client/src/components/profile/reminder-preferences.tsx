/**
 * Whether a student wants reminder emails.
 *
 * Off unless they say otherwise, and the switch is the only thing that turns
 * it on - no default, no pre-ticked box, nothing inferred from a purchase.
 *
 * It saves on the switch rather than behind a Save button. A person turning
 * off email expects it to be off when they close the tab, and an unsaved
 * form is how that promise gets broken. The switch reverts if the save
 * fails, so what is shown is always what the server holds.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell } from "lucide-react";
import type { UserProfile } from "@shared/schema";

export function ReminderPreferences() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const { toast } = useToast();
  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });

  // Mirrored locally so the switch moves the instant it is clicked, rather
  // than after a round trip.
  const [optedIn, setOptedIn] = useState(false);
  useEffect(() => {
    setOptedIn(profile?.emailRemindersOptIn === true);
  }, [profile?.emailRemindersOptIn]);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await apiRequest("PATCH", "/api/profile", { emailRemindersOptIn: next });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (_error, next) => {
      // Put it back. A switch that says "on" while the server says "off" is
      // worse than no switch at all.
      setOptedIn(!next);
      toast({
        title: es ? "No se pudo guardar" : "Could not save",
        description: es
          ? "Tu preferencia no cambió. Intenta de nuevo."
          : "Your preference was not changed. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid="card-reminder-preferences">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {es ? "Recordatorios" : "Reminders"}
        </CardTitle>
        <CardDescription>
          {es
            ? "Los recordatorios aparecen en tu panel siempre. Por correo, solo si lo activas."
            : "Reminders always appear on your dashboard. By email, only if you turn it on."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="email-reminders" className="text-sm font-medium">
              {es ? "Recordatorios por correo" : "Email reminders"}
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              {es
                ? "Como máximo uno por semana, y solo sobre algo con fecha: tu examen, o el fin de tu acceso."
                : "At most one a week, and only about something with a date on it: your exam, or your access ending."}
            </p>
          </div>
          <Switch
            id="email-reminders"
            checked={optedIn}
            disabled={mutation.isPending}
            onCheckedChange={(next) => {
              setOptedIn(next);
              mutation.mutate(next);
            }}
            data-testid="switch-email-reminders"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {es
            ? "Cada correo incluye un enlace para darte de baja, sin necesidad de iniciar sesión."
            : "Every email carries an unsubscribe link that works without signing in."}
        </p>
      </CardContent>
    </Card>
  );
}
