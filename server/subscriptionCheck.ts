import type { ExamCategory } from "@shared/schema";

export interface SubscriptionProfile {
  role?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: Date | string | null;
  allowedCategories?: string[] | null;
}

export interface SubscriptionCheckResult {
  active: boolean;
  message?: string;
}

export function checkSubscriptionActive(
  profile: SubscriptionProfile | null | undefined,
  category?: ExamCategory
): SubscriptionCheckResult {
  if (!profile) {
    return { active: false, message: "Profile not found" };
  }

  if (profile.role === "admin") {
    return { active: true };
  }

  const validStatuses = ["active", "trialing"];
  if (!validStatuses.includes(profile.subscriptionStatus || "")) {
    return {
      active: false,
      message:
        "Active subscription required to take exams. Please subscribe to continue.",
    };
  }

  if (
    profile.subscriptionEndDate &&
    new Date(profile.subscriptionEndDate) < new Date()
  ) {
    return {
      active: false,
      message: "Subscription has expired. Please renew to continue.",
    };
  }

  if (category) {
    if (
      !profile.allowedCategories ||
      profile.allowedCategories.length === 0
    ) {
      return {
        active: false,
        message:
          "Your subscription category access is not configured. Please contact support or resubscribe to continue.",
      };
    }
    if (!profile.allowedCategories.includes(category)) {
      return {
        active: false,
        message: `Your subscription does not include access to this exam category. Please upgrade your subscription to access ${category.replace("_", " ")} exams.`,
      };
    }
  }

  return { active: true };
}
