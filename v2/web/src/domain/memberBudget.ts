import { WEEKLY_BUDGET } from "./budget";
import type { FamilyMember, SessionUser } from "./types";

export function memberWeeklyBudget(member: FamilyMember): number {
  return member.weeklyBudget ?? WEEKLY_BUDGET;
}

export function selfWeeklyBudget(user: SessionUser): number {
  const self = user.members.find((m) => m.isYou && m.userType === "teen");
  return self ? memberWeeklyBudget(self) : WEEKLY_BUDGET;
}
