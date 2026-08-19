/**
 * How a reminder is said, in both languages.
 *
 * Kept apart from shared/studyReminders.ts, which decides *whether* something
 * is true. Splitting them means the dashboard strip and the reminder email
 * cannot drift into disagreeing about what a student's situation is, and the
 * wording can be changed without touching the rules.
 *
 * The wording rules, which are the point:
 *
 *   - State the fact and stop. "Your exam is in 2 days" - not "only 2 days
 *     left!", which manufactures panic out of the same number.
 *   - Never imply an outcome. Nothing here says or hints at whether they will
 *     pass; we have no data that would justify it.
 *   - Suggest one thing to do, and make it something the app can actually do.
 *
 * Spanish is written, not translated word-for-word, and runs 20-30% longer -
 * every surface using this has to have room for that.
 */

import type { Reminder, ReminderCode } from "./studyReminders";

export type ReminderLanguage = "en" | "es";

export interface ReminderCopy {
  title: string;
  /** One sentence saying what to do about it. */
  action: string;
  /** Where the action goes. Relative, always inside the app. */
  href: string;
  /**
   * The link's own words. Here rather than in the component so a reminder is
   * translated in one place - a Spanish sentence with an English button on
   * the end of it is worse than either language alone.
   */
  linkLabel: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const BUILDERS: Record<
  ReminderCode,
  (data: Record<string, number | string>, lang: ReminderLanguage) => ReminderCopy
> = {
  exam_imminent: (data, lang) => {
    const days = Number(data.days ?? 0);
    if (lang === "es") {
      return {
        title:
          days === 0
            ? "Tu examen es hoy."
            : `Tu examen es en ${days} ${plural(days, "día", "días")}.`,
        action: "Repasa las preguntas que fallaste antes de presentarte.",
        href: "/missed-questions",
        linkLabel: "Repasar",
      };
    }
    return {
      title: days === 0 ? "Your exam is today." : `Your exam is in ${days} ${plural(days, "day", "days")}.`,
      action: "Review the questions you have got wrong before you sit it.",
      href: "/missed-questions",
      linkLabel: "Review",
    };
  },

  exam_approaching: (data, lang) => {
    const days = Number(data.days ?? 0);
    if (lang === "es") {
      return {
        title: `Faltan ${days} días para tu examen.`,
        action: "Un examen simulado completo muestra dónde estás parado.",
        href: "/exams",
        linkLabel: "Ver examenes",
      };
    }
    return {
      title: `Your exam is ${days} days away.`,
      action: "A full mock exam shows you where you stand.",
      href: "/exams",
      linkLabel: "See exams",
    };
  },

  subscription_ending: (data, lang) => {
    const days = Number(data.days ?? 0);
    if (lang === "es") {
      return {
        title:
          days === 0
            ? "Tu acceso termina hoy."
            : `Tu acceso termina en ${days} ${plural(days, "día", "días")}.`,
        action: "Puedes renovar o cancelar desde tu perfil.",
        href: "/profile",
        linkLabel: "Administrar",
      };
    }
    return {
      title:
        days === 0
          ? "Your access ends today."
          : `Your access ends in ${days} ${plural(days, "day", "days")}.`,
      action: "You can renew or cancel from your profile.",
      href: "/profile",
      linkLabel: "Manage",
    };
  },

  inactive: (data, lang) => {
    const days = Number(data.days ?? 0);
    if (lang === "es") {
      return {
        title: `Han pasado ${days} días desde tu última práctica.`,
        action: "Diez preguntas bastan para retomar el ritmo.",
        href: "/exams",
        linkLabel: "Practicar",
      };
    }
    return {
      title: `It has been ${days} days since you last practised.`,
      action: "Ten questions is enough to pick the thread back up.",
      href: "/exams",
      linkLabel: "Practise",
    };
  },

  notebook_waiting: (data, lang) => {
    const count = Number(data.count ?? 0);
    if (lang === "es") {
      return {
        title: `Tienes ${count} preguntas falladas en tu cuaderno.`,
        action: "Repasarlas es la forma más rápida de subir tu puntaje.",
        href: "/missed-questions",
        linkLabel: "Abrir cuaderno",
      };
    }
    return {
      title: `${count} questions you got wrong are waiting in your notebook.`,
      action: "Working through them is the fastest way to move your score.",
      href: "/missed-questions",
      linkLabel: "Open notebook",
    };
  },

  no_attempts_yet: (_data, lang) =>
    lang === "es"
      ? {
          title: "Aún no has hecho ninguna práctica.",
          action: "Empieza con una práctica rápida para ver dónde estás.",
          href: "/exams",
          linkLabel: "Empezar",
        }
      : {
          title: "You have not practised yet.",
          action: "Start with a quick practice to see where you are.",
          href: "/exams",
          linkLabel: "Start",
        },
};

export function reminderCopy(reminder: Reminder, lang: ReminderLanguage): ReminderCopy {
  return BUILDERS[reminder.code](reminder.data, lang);
}
