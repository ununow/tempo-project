export { publicProcedure, protectedProcedure, router } from "../_core/trpc";
export { TRPCError } from "@trpc/server";

import { protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// sub_manager 이상 접근 가능
export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.tempoRole;
  if (!role || !["owner", "center_manager", "sub_manager"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

// 책임센터장 이상만 접근 가능
export const centerManagerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.tempoRole;
  if (!role || !["owner", "center_manager"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "책임센터장 이상 권한이 필요합니다." });
  }
  return next({ ctx });
});
