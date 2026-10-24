import { Effect, Redacted } from "effect";
import { jwtVerify, SignJWT } from "jose";
import ms from "ms";
import { z } from "zod";
import { AppConfig } from "~/effect/config";
import { game_kind_schema, type GameKind } from "~/util/catalog/tags";

/** A finished guest play can be claimed this long — token expiry and the DB check agree. */
export const GUEST_CLAIM_WINDOW_MS = ms("45d");
/** Most tokens one claim call accepts; matches the browser-side cap. */
export const MAX_GUEST_CLAIMS = 100;

const ALG = "HS256";
/** Pins the token to this use so no other HS256 token signed with the key passes. */
const AUDIENCE = "krida:guest-claim";

const guest_claim_payload_schema = z.object({
  k: game_kind_schema,
  /** `puzzle_sessions.id` is a Postgres `serial` (int4). */
  sid: z.number().int().positive().max(2_147_483_647),
});

export type GuestClaim = { kind: GameKind; sessionId: number };

const encodeSecret = (secret: string) => new TextEncoder().encode(secret);

/**
 * Sign proof that the caller finished anonymous session `sessionId`. Session ids are
 * sequential, so the claim endpoint only trusts ids carried in one of these.
 */
export const signGuestClaimTokenWith = (
  secret: string,
  claim: GuestClaim,
  nowMs = Date.now(),
) =>
  new SignJWT({ k: claim.kind, sid: claim.sessionId })
    .setProtectedHeader({ alg: ALG })
    .setAudience(AUDIENCE)
    .setIssuedAt(Math.floor(nowMs / 1000))
    .setExpirationTime(Math.floor((nowMs + GUEST_CLAIM_WINDOW_MS) / 1000))
    .sign(encodeSecret(secret));

/** Forged, expired or malformed → null. */
export const verifyGuestClaimTokenWith = async (
  secret: string,
  token: string,
  nowMs = Date.now(),
): Promise<GuestClaim | null> => {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [ALG],
      audience: AUDIENCE,
      // jose treats `exp` as optional; a token without one would never expire.
      requiredClaims: ["exp"],
      currentDate: new Date(nowMs),
    });
    const parsed = guest_claim_payload_schema.safeParse(payload);
    return parsed.success
      ? { kind: parsed.data.k, sessionId: parsed.data.sid }
      : null;
  } catch {
    return null;
  }
};

/** Best effort: a signing failure only costs the guest the later claim, never the submit. */
export const issueGuestClaimToken = Effect.fn("guest_claim.issue")(function* (
  kind: GameKind,
  sessionId: number,
) {
  const config = yield* AppConfig;
  return yield* Effect.tryPromise(() =>
    signGuestClaimTokenWith(Redacted.value(config.guestClaimSecret), {
      kind,
      sessionId,
    }),
  ).pipe(Effect.catch(() => Effect.succeed(null)));
});

export const verifyGuestClaimToken = Effect.fn("guest_claim.verify")(function* (
  token: string,
) {
  const config = yield* AppConfig;
  return yield* Effect.promise(() =>
    verifyGuestClaimTokenWith(Redacted.value(config.guestClaimSecret), token),
  );
});
