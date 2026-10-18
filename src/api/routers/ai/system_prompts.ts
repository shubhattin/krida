import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { t, protectedAdminProcedure } from '~/api/trpc_init';
import { image_system_prompt_templates } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { ConflictError, NotFoundError } from '~/effect/errors';
import { runTrpcEffect } from '~/effect/run';

const template_subject_schema = z.enum(['puzzle', 'collection']);
const template_title_schema = z.string().trim().min(1).max(200);

const list_route = protectedAdminProcedure
  .input(z.object({ subject: template_subject_schema.optional() }).optional())
  .query(({ input }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        return yield* dbRunHttp('system_prompts.list', (db) =>
          db
            .select({
              id: image_system_prompt_templates.id,
              subject: image_system_prompt_templates.subject,
              title: image_system_prompt_templates.title,
              content: image_system_prompt_templates.content,
              created_at: image_system_prompt_templates.created_at,
              updated_at: image_system_prompt_templates.updated_at
            })
            .from(image_system_prompt_templates)
            .orderBy(asc(image_system_prompt_templates.id))
            .then((rows) =>
              input?.subject ? rows.filter((row) => row.subject === input.subject) : rows
            )
        );
      })
    )
  );

const get_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .query(({ input: { id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const row = yield* dbRunHttp('system_prompts.get', (db) =>
          db.query.image_system_prompt_templates.findFirst({
            where: (tbl, { eq: eqOp }) => eqOp(tbl.id, id)
          })
        );
        if (!row) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'system_prompt_template',
              message: 'Template not found'
            })
          );
        }
        return row;
      })
    )
  );

const create_route = protectedAdminProcedure
  .input(
    z.object({
      title: template_title_schema,
      subject: template_subject_schema.default('puzzle')
    })
  )
  .mutation(({ input: { title, subject } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const clash = yield* dbRunHttp('system_prompts.create.lookup', (db) =>
          db.query.image_system_prompt_templates.findFirst({
            where: (tbl, { eq: eqOp, and: andOp }) =>
              andOp(eqOp(tbl.subject, subject), eqOp(tbl.title, title))
          })
        );
        if (clash) {
          return yield* Effect.fail(
            ConflictError.make({ message: 'A template with this title already exists' })
          );
        }
        const rows = yield* dbRunHttp('system_prompts.create', (db) =>
          db
            .insert(image_system_prompt_templates)
            .values({ title, subject, content: '' })
            .returning()
        );
        return rows[0]!;
      })
    )
  );

const update_route = protectedAdminProcedure
  .input(
    z.object({
      id: z.number().int(),
      title: template_title_schema.optional(),
      content: z.string().max(20000).optional()
    })
  )
  .mutation(({ input: { id, title, content } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const existing = yield* dbRunHttp('system_prompts.update.lookup', (db) =>
          db.query.image_system_prompt_templates.findFirst({
            where: (tbl, { eq: eqOp }) => eqOp(tbl.id, id)
          })
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'system_prompt_template',
              message: 'Template not found'
            })
          );
        }
        if (title !== undefined && title !== existing.title) {
          const clash = yield* dbRunHttp('system_prompts.update.clash', (db) =>
            db.query.image_system_prompt_templates.findFirst({
              where: (tbl, { eq: eqOp, and: andOp }) =>
                andOp(eqOp(tbl.subject, existing.subject), eqOp(tbl.title, title))
            })
          );
          if (clash) {
            return yield* Effect.fail(
              ConflictError.make({ message: 'A template with this title already exists' })
            );
          }
        }
        const rows = yield* dbRunHttp('system_prompts.update', (db) =>
          db
            .update(image_system_prompt_templates)
            .set({
              title: title ?? existing.title,
              content: content ?? existing.content,
              updated_at: new Date()
            })
            .where(eq(image_system_prompt_templates.id, id))
            .returning()
        );
        return rows[0]!;
      })
    )
  );

const delete_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int() }))
  .mutation(({ input: { id } }) =>
    runTrpcEffect(
      Effect.gen(function* () {
        const existing = yield* dbRunHttp('system_prompts.delete.lookup', (db) =>
          db.query.image_system_prompt_templates.findFirst({
            where: (tbl, { eq: eqOp }) => eqOp(tbl.id, id)
          })
        );
        if (!existing) {
          return yield* Effect.fail(
            NotFoundError.make({
              resource: 'system_prompt_template',
              message: 'Template not found'
            })
          );
        }
        yield* dbRunHttp('system_prompts.delete', async (db) => {
          await db
            .delete(image_system_prompt_templates)
            .where(eq(image_system_prompt_templates.id, id));
        });
        return { success: true };
      })
    )
  );

export const system_prompts_router = t.router({
  list: list_route,
  get: get_route,
  create: create_route,
  update: update_route,
  delete: delete_route
});
