import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assignClientToProject,
  createDeliverable,
  createGuestCheckoutRequest,
  createInquiry,
  createMilestone,
  createProductInquiry,
  createProject,
  getAdminProjectDetail,
  getAllCaseStudies,
  getAllPortalContent,
  getAllProjects,
  getClientProjectDetail,
  getClientProjects,
  getClientUsers,
  getAllProductAccess,
  getAuthorizedProductDownload,
  getAllDigitalProducts,
  getDigitalProductBySlug,
  getPublishedDigitalProductById,
  getPublishedCaseStudies,
  getPublishedDigitalProducts,
  getPublishedPortalContent,
  getUserProductAccess,
  grantProductAccess,
  saveCaseStudy,
  saveDigitalProduct,
  savePortalContent,
  updateDeliverable,
  updateMilestone,
  updateProject,
} from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const projectStatus = z.enum(["discovery", "in_progress", "review", "complete", "on_hold"]);
const milestoneStatus = z.enum(["upcoming", "in_progress", "completed"]);

const optionalDate = z.coerce.date().optional().nullable();

function unavailable(error: unknown): never {
  console.error("[portal] procedure failed", error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The portal service is temporarily unavailable." });
}

export const portalRouter = router({
  projects: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      try {
        return getClientProjects(ctx.user.id);
      } catch (error) {
        return unavailable(error);
      }
    }),
    byId: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      try {
        const project = await getClientProjectDetail(ctx.user.id, input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
  }),
  content: router({
    listPublished: protectedProcedure.query(async () => {
      try {
        return getPublishedPortalContent();
      } catch (error) {
        return unavailable(error);
      }
    }),
  }),
  caseStudies: router({
    listPublished: publicProcedure.query(async () => {
      try {
        return getPublishedCaseStudies();
      } catch (error) {
        return unavailable(error);
      }
    }),
  }),
  products: router({
    listPublished: publicProcedure.query(async () => {
      try {
        return getPublishedDigitalProducts();
      } catch (error) {
        return unavailable(error);
      }
    }),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
      try {
        const product = await getDigitalProductBySlug(input.slug);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        return product;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    inquire: publicProcedure
      .input(z.object({ productId: z.number().int().positive(), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), message: z.string().trim().min(10).max(5000) }))
      .mutation(async ({ input }) => {
        try {
          return createProductInquiry(input);
        } catch (error) {
          return unavailable(error);
        }
      }),
    guestCheckout: publicProcedure
      .input(z.object({ productId: z.number().int().positive(), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), message: z.string().trim().max(5000).optional() }))
      .mutation(async ({ input }) => {
        try {
          const product = await getPublishedDigitalProductById(input.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "This product is not available for guest checkout." });
          const request = await createGuestCheckoutRequest({ ...input, company: input.company || null, message: input.message || null });
          return { requestId: request.id, status: request.status, productTitle: product.title };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
  }),
  productAccess: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      try {
        const rows = await getUserProductAccess(ctx.user.id);
        return rows.map(({ access, product }) => ({
          accessId: access.id,
          deliveryFileName: access.deliveryFileName,
          grantedAt: access.createdAt,
          product: {
            id: product.id,
            title: product.title,
            category: product.category,
            summary: product.summary,
            version: product.updatedAt,
          },
        }));
      } catch (error) {
        return unavailable(error);
      }
    }),
    download: protectedProcedure.input(z.object({ accessId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await getAuthorizedProductDownload(ctx.user.id, input.accessId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Download access was not found for this account." });
      return { fileUrl: result.access.deliveryUrl, fileName: result.access.deliveryFileName, productTitle: result.product.title };
    }),
  }),
  inquiries: router({
    create: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          email: z.string().trim().email().max(320),
          company: z.string().trim().max(180).optional(),
          serviceInterest: z.string().trim().max(120).optional(),
          message: z.string().trim().min(20).max(5000),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return createInquiry(input);
        } catch (error) {
          return unavailable(error);
        }
      }),
  }),
  admin: router({
    projects: adminProcedure.query(async () => {
      try {
        return getAllProjects();
      } catch (error) {
        return unavailable(error);
      }
    }),
    clients: adminProcedure.query(async () => {
      try {
        return getClientUsers();
      } catch (error) {
        return unavailable(error);
      }
    }),
    projectDetail: adminProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input }) => {
      try {
        const project = await getAdminProjectDetail(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    createProject: adminProcedure
      .input(
        z.object({
          title: z.string().trim().min(3).max(180),
          slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
          serviceCategory: z.string().trim().min(2).max(100),
          description: z.string().trim().max(5000).optional().nullable(),
          status: projectStatus.default("discovery"),
          progress: z.number().int().min(0).max(100).default(0),
          startDate: optionalDate,
          targetDate: optionalDate,
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return createProject(input);
        } catch (error) {
          return unavailable(error);
        }
      }),
    updateProject: adminProcedure
      .input(
        z.object({
          projectId: z.number().int().positive(),
          title: z.string().trim().min(3).max(180).optional(),
          serviceCategory: z.string().trim().min(2).max(100).optional(),
          description: z.string().trim().max(5000).optional().nullable(),
          status: projectStatus.optional(),
          progress: z.number().int().min(0).max(100).optional(),
          startDate: optionalDate,
          targetDate: optionalDate,
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const { projectId, ...changes } = input;
          return updateProject(projectId, changes);
        } catch (error) {
          return unavailable(error);
        }
      }),
    assignClient: adminProcedure
      .input(z.object({ projectId: z.number().int().positive(), userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          await assignClientToProject(input.projectId, input.userId);
          return { success: true } as const;
        } catch (error) {
          return unavailable(error);
        }
      }),
    createMilestone: adminProcedure
      .input(
        z.object({
          projectId: z.number().int().positive(),
          title: z.string().trim().min(2).max(180),
          description: z.string().trim().max(5000).optional().nullable(),
          status: milestoneStatus.default("upcoming"),
          dueDate: optionalDate,
          completedAt: optionalDate,
          sortOrder: z.number().int().min(0).default(0),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return createMilestone(input);
        } catch (error) {
          return unavailable(error);
        }
      }),
    updateMilestone: adminProcedure
      .input(
        z.object({
          milestoneId: z.number().int().positive(),
          title: z.string().trim().min(2).max(180).optional(),
          description: z.string().trim().max(5000).optional().nullable(),
          status: milestoneStatus.optional(),
          dueDate: optionalDate,
          completedAt: optionalDate,
          sortOrder: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const { milestoneId, ...changes } = input;
          return updateMilestone(milestoneId, changes);
        } catch (error) {
          return unavailable(error);
        }
      }),
    createDeliverable: adminProcedure
      .input(
        z.object({
          projectId: z.number().int().positive(),
          title: z.string().trim().min(2).max(180),
          description: z.string().trim().max(5000).optional().nullable(),
          fileName: z.string().trim().min(1).max(255),
          fileUrl: z.string().url().max(5000),
          fileKey: z.string().trim().max(512).optional().nullable(),
          isClientVisible: z.boolean().default(true),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          return createDeliverable(input);
        } catch (error) {
          return unavailable(error);
        }
      }),
    updateDeliverable: adminProcedure
      .input(
        z.object({
          deliverableId: z.number().int().positive(),
          title: z.string().trim().min(2).max(180).optional(),
          description: z.string().trim().max(5000).optional().nullable(),
          fileName: z.string().trim().min(1).max(255).optional(),
          fileUrl: z.string().url().max(5000).optional(),
          fileKey: z.string().trim().max(512).optional().nullable(),
          isClientVisible: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const { deliverableId, ...changes } = input;
          return updateDeliverable(deliverableId, changes);
        } catch (error) {
          return unavailable(error);
        }
      }),
    portalContent: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllPortalContent();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure
        .input(
          z.object({
            contentId: z.number().int().positive().optional(),
            title: z.string().trim().min(2).max(180),
            body: z.string().trim().min(2).max(10000),
            placement: z.enum(["welcome", "announcement", "resource"]).default("announcement"),
            isPublished: z.boolean().default(false),
            sortOrder: z.number().int().min(0).default(0),
          }),
        )
        .mutation(async ({ input }) => {
          try {
            const { contentId, ...content } = input;
            return savePortalContent(content, contentId);
          } catch (error) {
            return unavailable(error);
          }
      }),
    }),
    caseStudies: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllCaseStudies();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure
        .input(
          z.object({
            caseStudyId: z.number().int().positive().optional(),
            title: z.string().trim().min(2).max(180),
            slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
            category: z.string().trim().min(2).max(100),
            clientName: z.string().trim().max(180).optional().nullable(),
            summary: z.string().trim().min(10).max(5000),
            problem: z.string().trim().max(5000).optional().nullable(),
            solution: z.string().trim().max(5000).optional().nullable(),
            results: z.string().trim().max(5000).optional().nullable(),
            technologies: z.string().trim().max(2000).optional().nullable(),
            coverImageUrl: z.string().url().max(5000).optional().nullable(),
            isPublished: z.boolean().default(false),
            sortOrder: z.number().int().min(0).default(0),
          }),
        )
        .mutation(async ({ input }) => {
          try {
            const { caseStudyId, ...caseStudy } = input;
            return saveCaseStudy(caseStudy, caseStudyId);
          } catch (error) {
            return unavailable(error);
          }
      }),
    }),
    products: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllDigitalProducts();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure
        .input(z.object({ productId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(180), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180), category: z.string().trim().min(2).max(100), summary: z.string().trim().min(10).max(5000), description: z.string().trim().max(10000).optional().nullable(), deliveryNotes: z.string().trim().max(5000).optional().nullable(), price: z.coerce.number().min(0).max(1000000), coverImageUrl: z.string().url().max(5000).optional().nullable(), isPublished: z.boolean().default(false), isFeatured: z.boolean().default(false), isArchived: z.boolean().default(false), sortOrder: z.number().int().min(0).default(0) }))
        .mutation(async ({ input }) => {
          try {
            const { productId, price, ...product } = input;
            return saveDigitalProduct({ ...product, price: price.toFixed(2) }, productId);
          } catch (error) {
            return unavailable(error);
          }
      }),
    }),
    productAccess: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllProductAccess();
        } catch (error) {
          return unavailable(error);
        }
      }),
      grant: adminProcedure
        .input(z.object({ productId: z.number().int().positive(), userId: z.number().int().positive(), deliveryUrl: z.string().url().max(5000), deliveryFileName: z.string().trim().min(1).max(255) }))
        .mutation(async ({ ctx, input }) => {
          try {
            return grantProductAccess({ ...input, grantedByUserId: ctx.user.id });
          } catch (error) {
            return unavailable(error);
          }
        }),
    }),
  }),
});
