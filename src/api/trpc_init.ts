import type { Context } from './context';
import { TRPCError, initTRPC } from '@trpc/server';
import transformer from './transformer';

export const t = initTRPC.context<Context>().create({
  transformer
});

export const publicProcedure = t.procedure;

export const protectedUnverifiedProcedure = publicProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({
    ctx: { user }
  });
});

export const protectedProcedure = publicProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (!user || !user.is_approved) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({
    ctx: { user }
  });
});

export const protectedAdminProcedure = protectedProcedure.use(async function isAuthed({
  next,
  ctx: { user }
}) {
  if (user.role !== 'admin')
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not a Admin User' });
  return next({
    ctx: { user }
  });
});
