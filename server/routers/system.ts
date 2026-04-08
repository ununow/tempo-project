import { z } from "zod";
import { router, protectedProcedure, managerProcedure, centerManagerProcedure, TRPCError } from "./middleware";
import * as db from "../db";

export const userManagementRouter = router({
  list: managerProcedure.query(({ ctx }) => db.getAllUsers((ctx.user as any).organizationId ?? undefined)),
  setRole: centerManagerProcedure
    .input(z.object({
      userId: z.number(),
      tempoRole: z.enum(["owner", "center_manager", "sub_manager", "trainer", "viewer"]),
    }))
    .mutation(({ input }) => db.setUserTempoRole(input.userId, input.tempoRole)),
});

export const invitationRouter = router({
  list: managerProcedure.query(({ ctx }) => db.getInvitations(ctx.user.id)),
  create: managerProcedure
    .input(z.object({
      tempoRole: z.enum(["owner", "center_manager", "sub_manager", "trainer", "viewer"]),
      email: z.string().email().optional(),
      teamId: z.number().optional(),
      expiresInDays: z.number().default(7),
    }))
    .mutation(({ input, ctx }) => db.createInvitation({ ...input, invitedBy: ctx.user.id })),
  use: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => db.useInvitation(input.token, ctx.user.id)),
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input, ctx }) => db.useInvitation(input.token, ctx.user.id)),
  delete: managerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => db.deleteInvitation(input.id, ctx.user.id)),
});

export const boardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const boards = await db.getBoards();
    const role = (ctx.user as any).tempoRole ?? "trainer";
    return boards.filter(board => {
      if (!(board as any).allowedRoles || (board as any).allowedRoles === "all") return true;
      try {
        const allowed = JSON.parse((board as any).allowedRoles);
        return Array.isArray(allowed) ? allowed.includes(role) : true;
      } catch { return true; }
    });
  }),
  create: managerProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), icon: z.string().optional() }))
    .mutation(({ input, ctx }) => db.createBoard({ ...input, createdBy: ctx.user.id })),
  delete: managerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteBoard(input.id)),
});

export const postRouter = router({
  list: protectedProcedure
    .input(z.object({ boardId: z.number() }))
    .query(({ input }) => db.getPosts(input.boardId)),
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getPost(input.id)),
  create: protectedProcedure
    .input(z.object({ boardId: z.number(), title: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const boards = await db.getBoards();
      const board = boards.find(b => b.id === input.boardId);
      if (!board) throw new TRPCError({ code: "NOT_FOUND" });
      const role = (ctx.user as any).tempoRole ?? "trainer";
      if ((board as any).canWrite && (board as any).canWrite !== "all") {
        try {
          const canWrite = JSON.parse((board as any).canWrite);
          if (Array.isArray(canWrite) && !canWrite.includes(role)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "이 게시판에 글을 작성할 권한이 없습니다." });
          }
        } catch (e) { if (e instanceof TRPCError) throw e; }
      }
      return db.createPost({ ...input, authorId: ctx.user.id });
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), content: z.string().optional() }))
    .mutation(({ input, ctx }) => db.updatePost(input.id, ctx.user.id, input)),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => db.deletePost(input.id, ctx.user.id)),
  pin: managerProcedure
    .input(z.object({ id: z.number(), isPinned: z.boolean() }))
    .mutation(({ input }) => db.pinPost(input.id, input.isPinned)),
});

export const favoritesRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getUserFavorites(ctx.user.id)),
  add: protectedProcedure
    .input(z.object({ href: z.string(), label: z.string(), icon: z.string().optional() }))
    .mutation(({ input, ctx }) => db.addUserFavorite({ ...input, userId: ctx.user.id })),
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => db.removeUserFavorite(input.id, ctx.user.id)),
});

export const externalLinkRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getExternalLinks(ctx.user.id)),
  add: protectedProcedure
    .input(z.object({ title: z.string(), url: z.string().url(), icon: z.string().optional(), category: z.string().optional() }))
    .mutation(({ input, ctx }) => db.addExternalLink({ ...input, userId: ctx.user.id })),
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => db.removeExternalLink(input.id, ctx.user.id)),
});

export const profileRouter = router({
  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      avatarUrl: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.updateUserProfile(ctx.user.id, input)),
});
