import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { z } from 'zod';

// ─── Request Body Schemas ────────────────────────────────

export const UpsertMatchPlanSchema = z.object({
  duties: z.array(
    z.object({
      slotKey: z.string().min(1),
      teamNumber: z.int().positive(),
      notes: z.string().optional(),
    }),
  ),
});

export const ApplyTemplateSchema = z.object({
  templateName: z.enum(['safe', 'balanced', 'aggressive']),
  teamNumbers: z.array(z.int().positive()).min(1),
});

export const UpsertPicklistSchema = z.object({
  entries: z.array(
    z.object({
      teamNumber: z.int().positive(),
      rank: z.int().nonnegative(),
      tags: z.array(z.string()),
      notes: z.string(),
      excluded: z.boolean(),
    }),
  ),
});

export const CreateTeamSchema = z.object({
  teamNumber: z.int().positive(),
  name: z.string().min(1).max(200),
});

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const CreateInviteCodeSchema = z.object({
  maxUses: z.int().positive().optional(),
  expiresInHours: z.number().positive().optional(),
});

export const ReviewJoinRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  role: z.enum(['COACH', 'MENTOR', 'STUDENT']).optional(),
});

export const ChangeMemberRoleSchema = z.object({
  role: z.enum(['COACH', 'MENTOR', 'STUDENT']),
});

export const TeamSiteBatchSchema = z.object({
  teamNumbers: z.array(z.int().positive()).min(1).max(10),
  year: z.int().positive(),
});

// ─── Validation Helpers ──────────────────────────────────

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the validated data or an HttpResponseInit with a 400 status.
 */
export async function parseBody<T extends z.ZodType>(
  request: HttpRequest,
  schema: T,
): Promise<z.infer<T> | HttpResponseInit> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      status: 400,
      jsonBody: {
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    };
  }

  return result.data;
}

/** Type guard: check if parseBody result is a validation error response. */
export function isValidationError<T>(result: T | HttpResponseInit): result is HttpResponseInit {
  return result !== null && typeof result === 'object' && 'status' in result;
}

/**
 * Extract a required route parameter, returning a 400 response if missing.
 */
export function requiredParam(request: HttpRequest, name: string): string | HttpResponseInit {
  const value = request.params[name];
  if (!value) {
    return { status: 400, jsonBody: { error: `Missing required parameter: ${name}` } };
  }
  return value;
}

/** Type guard: check if requiredParam result is an error response. */
export function isParamError(result: string | HttpResponseInit): result is HttpResponseInit {
  return typeof result !== 'string';
}
