import { z } from "zod";
import { Brief } from "./domain";

// Accounts, workspaces and onboarding (lane B5). Free product: nothing here carries a plan, tier or price.

export const WorkspaceRole = z.enum(["buyer", "media-owner"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRole>;

const Email = z.string().trim().toLowerCase().email().max(254);
const Password = z.string().min(10, "Use at least 10 characters.").max(128);

export const SignUpRequest = z.object({ name: z.string().trim().min(1).max(80), email: Email, password: Password });
export const SignInRequest = z.object({ email: Email, password: z.string().min(1).max(128) });

export const AuthUser = z.object({ id: z.string(), name: z.string(), email: z.string() });
export type AuthUser = z.infer<typeof AuthUser>;

export const Workspace = z.object({
  id: z.string(),
  name: z.string(),
  role: WorkspaceRole,
  city: z.literal("atlanta"),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof Workspace>;

export const CreateWorkspaceRequest = z.object({ name: z.string().trim().min(2).max(80), role: WorkspaceRole });

// "workspace" = no workspace yet; the stored steps are tools -> first -> done.
export const OnboardingStep = z.enum(["workspace", "tools", "first", "done"]);
export type OnboardingStep = z.infer<typeof OnboardingStep>;

export const OnboardingState = z.object({
  step: OnboardingStep,
  role: WorkspaceRole.nullable(),
  toolsSkipped: z.boolean(),
  firstSkipped: z.boolean(),
  briefCount: z.number().int(),
  completedAt: z.string().nullable(),
});
export type OnboardingState = z.infer<typeof OnboardingState>;

export const WorkspaceResponse = z.object({ workspace: Workspace, onboarding: OnboardingState });

// Moves forward only: tools -> first (connect tools or skip them), first -> done (after a brief / viewing faces, or skip it).
export const PatchOnboardingRequest = z.object({ step: z.enum(["first", "done"]), skipped: z.boolean().optional() });

export const MeResponse = z.object({
  user: AuthUser.nullable(),
  workspace: Workspace.nullable(),
  onboarding: OnboardingState,
  providers: z.object({ google: z.boolean() }),
});
export type MeResponse = z.infer<typeof MeResponse>;

export const BriefsResponse = z.object({ briefs: z.array(Brief) });
