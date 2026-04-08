import { z } from "zod";
import { router, protectedProcedure, TRPCError } from "./middleware";
import * as db from "../db";

export const trainerMemberRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.user.tempoRole ?? "trainer";
    if (["owner", "center_manager"].includes(role)) {
      return db.getAllTrainerMembers((ctx.user as any).organizationId ?? undefined);
    } else if (role === "sub_manager") {
      const teams = await db.getTeamsByManager(ctx.user.id);
      const teamIds = teams.map(t => t.id);
      return db.getTrainerMembersByTeams(teamIds);
    }
    return db.getTrainerMembers(ctx.user.id);
  }),
  add: protectedProcedure
    .input(z.object({
      memberUid: z.string().min(1),
      memberName: z.string().optional(),
      memberPhone: z.string().optional(),
      ptType: z.string().optional(),
      remainingSessions: z.number().optional(),
      memo: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.addTrainerMember({ ...input, trainerId: ctx.user.id })),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      memberName: z.string().optional(),
      memberPhone: z.string().optional(),
      ptType: z.string().optional(),
      remainingSessions: z.number().optional(),
      memo: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        if (!myMembers.some(m => m.id === input.id))
          throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 수정할 수 있습니다." });
      }
      return db.updateTrainerMember(input);
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const role = ctx.user.tempoRole ?? "trainer";
      if (role === "trainer") {
        const myMembers = await db.getTrainerMembers(ctx.user.id);
        if (!myMembers.some(m => m.id === input.id))
          throw new TRPCError({ code: "FORBIDDEN", message: "본인 담당 회원만 삭제할 수 있습니다." });
      }
      return db.removeTrainerMember(input.id);
    }),
});
