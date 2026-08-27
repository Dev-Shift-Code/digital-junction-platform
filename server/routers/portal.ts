import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assignClientToProject,
  createDeliverable,
  createGuestCheckoutRequest,
  createManualCheckoutOrder,
  createOneTimeDeliveryEntitlement,
  createOwnerOneTimeDeliveryEntitlement,
  createPaypalCheckoutOrder,
  createPaypalPaymentTransaction,
  createPayrexCheckoutOrder,
  createPayrexPaymentTransaction,
  createInquiry,
  createMilestone,
  createProductInquiry,
  createProject,
  deleteCaseStudy,
  deleteDigitalProduct,
  deletePaymentMethod,
  deleteProductFile,
  getAdminProjectDetail,
  getAllCaseStudies,
  getCaseStudyById,
  getAllPortalContent,
  getAllPaymentMethods,
  getAllInquiries,
  getAllVouchers,
  getAllProjects,
  getClientProjectDetail,
  getClientProjects,
  getClientUsers,
  getAllProductAccess,
  getAuthorizedProductDownload,
  getAllDigitalProducts,
  getAllPublicSiteContent,
  getDigitalProductBySlug,
  getDigitalProductById,
  getGuestCheckoutRequests,
  getActivePaymentMethods,
  getPaymentMethodById,
  getPaymentProviderSetting,
  getPaymentProviderSettings,
  getPaypalTransactionForPublicToken,
  getVoucherDiscount,
  getPayrexPaymentStatus,
  listPaidDeliveryFiles,
  getPublishedDigitalProductById,
  getPublishedCaseStudies,
  getPublishedDigitalProducts,
  getPublishedPortalContent,
  getPublicSiteContent,
  getProductFiles,
  getUserProductAccess,
  grantProductAccess,
  saveCaseStudy,
  saveDigitalProduct,
  savePaymentMethod,
  saveVoucher,
  setPaymentProviderActive,
  saveProductFile,
  savePublicSiteContent,
  savePortalContent,
  updateDeliverable,
  updateCaseStudyCover,
  updateDigitalProductCover,
  updateGuestCheckoutRequestStatus,
  updateGuestCheckoutPaymentReview,
  updateInquiryStatus,
  setVoucherActive,
  updateMilestone,
  updateProject,
  revokeDeliveryEntitlementsForOrder,
} from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { isD1OnlyFileMode, storagePut, storagePutPaymentQr, storagePutPrivateDeliveryFile } from "../storage";
import { createPayrexGcashCheckout } from "../payrex";
import { capturePaypalOrder, createPaypalOrder } from "../paypal";
import { ENV } from "../_core/env";

const projectStatus = z.enum(["discovery", "in_progress", "review", "complete", "on_hold"]);
const milestoneStatus = z.enum(["upcoming", "in_progress", "completed"]);
const paymentMethodType = z.enum(["Manual", "GoTyme", "PayPal", "GCash", "MariBank"]);
const paymentImageMimeType = z.enum(["image/png", "image/jpeg", "image/webp"]);
const paymentInstructions = z.string().trim().min(3).max(5000).refine(
  value => !/(?:account\s*(?:number|name)|bank\s*(?:number|account)|gcash\s*number|mobile\s*number|\b[\d][\d\s-]{8,}[\d]\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(value),
  "Do not include account, bank, mobile-number, or email details in buyer instructions. Use the QR code for payment destination details.",
);

const optionalDate = z.coerce.date().optional().nullable();
const voucherCode = z.string().trim().min(3).max(64).optional();

async function resolveCheckoutTotal(input: { productId: number; quantity: number; voucherCode?: string }) {
  const product = await getPublishedDigitalProductById(input.productId);
  if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "This product is not available for checkout." });
  const subtotalCents = priceToCents(product.price) * input.quantity;
  const voucherResult = input.voucherCode ? await getVoucherDiscount({ code: input.voucherCode, productId: product.id, subtotalCents }) : null;
  if (input.voucherCode && !voucherResult) throw new TRPCError({ code: "BAD_REQUEST", message: "This voucher is not active, has reached its limit, or cannot be used for this product." });
  return { product, subtotalCents, discountCents: voucherResult?.discountCents || 0, totalCents: voucherResult?.totalCents || subtotalCents, voucherId: voucherResult?.voucher.id || null, voucherCodeSnapshot: voucherResult?.voucher.code || null };
}

function priceToCents(value: string | number) {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new TRPCError({ code: "BAD_REQUEST", message: "The product price is invalid." });
  const [whole, decimal = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}

async function hashDeliveryToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

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
  publicContent: router({
    list: publicProcedure.input(z.object({ page: z.string().trim().min(1).max(64) })).query(async ({ input }) => {
      try {
        return getPublicSiteContent(input.page);
      } catch (error) {
        return unavailable(error);
      }
    }),
  }),
  paymentMethods: router({
    listActive: publicProcedure.query(async () => {
      try {
        const methods = await getActivePaymentMethods();
        return methods.map(({ id, methodType, displayName, qrCodeUrl, instructions }) => ({ id, methodType, displayName, qrCodeUrl, instructions }));
      } catch (error) {
        return unavailable(error);
      }
    }),
    checkoutOptions: publicProcedure.query(async () => {
      try {
        const [providers, manualMethods] = await Promise.all([getPaymentProviderSettings(), getActivePaymentMethods()]);
        return { payrex: providers.find(setting => setting.provider === "payrex")?.isActive ?? true, paypal: providers.find(setting => setting.provider === "paypal")?.isActive ?? true, manualMethods: manualMethods.map(({ id, displayName, methodType, qrCodeUrl, instructions }) => ({ id, displayName, methodType, qrCodeUrl, instructions })) };
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
    validateVoucher: publicProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20), code: z.string().trim().min(3).max(64) })).query(async ({ input }) => {
      try {
        const total = await resolveCheckoutTotal({ productId: input.productId, quantity: input.quantity, voucherCode: input.code });
        return { code: total.voucherCodeSnapshot, subtotalCents: total.subtotalCents, discountCents: total.discountCents, totalCents: total.totalCents };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    inclusions: publicProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => {
      try {
        const product = await getPublishedDigitalProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product files are not available." });
        const files = await getProductFiles(input.productId);
        return files.map(file => ({ id: file.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes }));
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
      .input(z.object({ productId: z.number().int().positive(), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), message: z.string().trim().max(5000).optional(), paymentMethodId: z.number().int().positive(), paymentReference: z.string().trim().min(3).max(180), paymentProofFileName: z.string().trim().min(1).max(255).optional(), paymentProofMimeType: paymentImageMimeType.optional(), paymentProofSizeBytes: z.number().int().min(1).max(5_000_000).optional(), paymentProofBase64: z.string().min(1).max(7_000_000).optional() }))
      .mutation(async ({ input }) => {
        try {
          const product = await getPublishedDigitalProductById(input.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "This product is not available for guest checkout." });
          const paymentMethod = await getPaymentMethodById(input.paymentMethodId);
          if (!paymentMethod || !paymentMethod.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active payment method before submitting your order." });
          let proof: { key: string; url: string } | null = null;
          if (!isD1OnlyFileMode()) {
            if (!input.paymentProofBase64 || !input.paymentProofFileName || !input.paymentProofMimeType || !input.paymentProofSizeBytes) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment proof is required before submitting your order." });
            const proofBytes = Buffer.from(input.paymentProofBase64, "base64");
            if (!proofBytes.length || proofBytes.length > 5_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment proof must be an image smaller than 5 MB." });
            const safeProofName = input.paymentProofFileName.replace(/[^a-zA-Z0-9._-]/g, "-");
            proof = await storagePut(`payment-proofs/${Date.now()}-${safeProofName}`, proofBytes, input.paymentProofMimeType);
          }
          const request = await createGuestCheckoutRequest({ productId: input.productId, name: input.name, email: input.email, company: input.company || null, message: input.message || null, paymentMethodId: paymentMethod.id, paymentMethodName: paymentMethod.displayName, paymentMethodType: paymentMethod.methodType, paymentInstructionsSnapshot: paymentMethod.instructions, paymentLogoUrlSnapshot: null, paymentQrCodeUrlSnapshot: paymentMethod.qrCodeUrl, paymentReference: input.paymentReference, paymentProofUrl: proof?.url || null, paymentProofKey: proof?.key || null, paymentProofFileName: input.paymentProofFileName || null, paymentProofMimeType: input.paymentProofMimeType || null, paymentProofSizeBytes: input.paymentProofSizeBytes || null, paymentStatus: proof ? "submitted" : "awaiting_payment" });
          return { requestId: request.id, status: request.status, paymentStatus: request.paymentStatus, paymentMethodName: paymentMethod.displayName, productTitle: product.title };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    createPayrexCheckout: publicProcedure
      .input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).default(1), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), message: z.string().trim().max(5000).optional(), voucherCode }))
      .mutation(async ({ input }) => {
        try {
          const setting = await getPaymentProviderSetting("payrex");
          if (setting && !setting.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "GCash via PayRex is currently unavailable. Choose another payment method." });
          const total = await resolveCheckoutTotal({ productId: input.productId, quantity: input.quantity, voucherCode: input.voucherCode });
          if (total.totalCents < 2_000) throw new TRPCError({ code: "BAD_REQUEST", message: "PayRex GCash checkout requires a final total of at least ₱20.00." });
          const publicToken = crypto.randomUUID();
          const orderReference = `DJ-${publicToken}`;
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
          const appOrigin = ENV.publicAppOrigin.replace(/\/+$/, "");
          const session = await createPayrexGcashCheckout({
            orderReference, productTitle: total.product.title, productDescription: total.product.summary, coverImageUrl: total.product.coverImageUrl, unitAmountCents: total.totalCents, quantity: 1,
            successUrl: `${appOrigin}/checkout/${encodeURIComponent(total.product.slug)}?payment=${encodeURIComponent(publicToken)}&result=success`,
            cancelUrl: `${appOrigin}/checkout/${encodeURIComponent(total.product.slug)}?payment=${encodeURIComponent(publicToken)}&result=cancelled`, expiresAt,
          });
          const order = await createPayrexCheckoutOrder({ productId: total.product.id, name: input.name, email: input.email, company: input.company || null, message: input.message || null, publicToken, paymentReference: orderReference, voucherId: total.voucherId, voucherCodeSnapshot: total.voucherCodeSnapshot, subtotalCents: total.subtotalCents, discountCents: total.discountCents, totalCents: total.totalCents });
          await createPayrexPaymentTransaction({ orderId: order.id, publicToken, amountCents: total.totalCents, providerCheckoutSessionId: session.id, providerPaymentIntentId: session.payment_intent?.id || null, checkoutUrl: session.url, expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : expiresAt });
          return { publicToken, checkoutUrl: session.url, expiresAt: session.expires_at ? session.expires_at * 1000 : expiresAt.getTime(), amountCents: total.totalCents, currency: "PHP" };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    createPaypalCheckout: publicProcedure
      .input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).default(1), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), message: z.string().trim().max(5000).optional(), voucherCode }))
      .mutation(async ({ input }) => {
        try {
          const setting = await getPaymentProviderSetting("paypal");
          if (setting && !setting.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "PayPal is currently unavailable. Choose another payment method." });
          const total = await resolveCheckoutTotal({ productId: input.productId, quantity: input.quantity, voucherCode: input.voucherCode });
          if (total.totalCents < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "The final total must be at least ₱0.01 for PayPal checkout." });
          const publicToken = crypto.randomUUID();
          const orderReference = `DJ-PP-${publicToken}`;
          const appOrigin = ENV.publicAppOrigin.replace(/\/+$/, "");
          const paypal = await createPaypalOrder({ orderReference, productTitle: input.quantity > 1 ? `${total.product.title} × ${input.quantity}` : total.product.title, productDescription: total.product.summary, amountCents: total.totalCents, successUrl: `${appOrigin}/checkout/${encodeURIComponent(total.product.slug)}?payment=${encodeURIComponent(publicToken)}&provider=paypal`, cancelUrl: `${appOrigin}/checkout/${encodeURIComponent(total.product.slug)}?payment=${encodeURIComponent(publicToken)}&provider=paypal&result=cancelled` });
          const order = await createPaypalCheckoutOrder({ productId: total.product.id, name: input.name, email: input.email, company: input.company || null, message: input.message || null, publicToken, paymentReference: orderReference, voucherId: total.voucherId, voucherCodeSnapshot: total.voucherCodeSnapshot, subtotalCents: total.subtotalCents, discountCents: total.discountCents, totalCents: total.totalCents });
          await createPaypalPaymentTransaction({ orderId: order.id, publicToken, amountCents: total.totalCents, providerOrderId: paypal.order.id, approvalUrl: paypal.approvalUrl });
          return { publicToken, checkoutUrl: paypal.approvalUrl, amountCents: total.totalCents, currency: "PHP", provider: "paypal" as const };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    createManualCheckout: publicProcedure
      .input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).default(1), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), message: z.string().trim().max(5000).optional(), paymentMethodId: z.number().int().positive(), voucherCode }))
      .mutation(async ({ input }) => {
        try {
          const [paymentMethod, total] = await Promise.all([
            getPaymentMethodById(input.paymentMethodId),
            resolveCheckoutTotal({ productId: input.productId, quantity: input.quantity, voucherCode: input.voucherCode }),
          ]);
          if (!paymentMethod || !paymentMethod.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active manual payment method before placing this order." });
          if (total.totalCents < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "A manual payment order must have a final total of at least ₱0.01." });
          const order = await createManualCheckoutOrder({ productId: total.product.id, name: input.name, email: input.email, company: input.company || null, message: input.message || null, paymentMethodId: paymentMethod.id, paymentMethodName: paymentMethod.displayName, paymentMethodType: paymentMethod.methodType, paymentInstructionsSnapshot: paymentMethod.instructions, paymentQrCodeUrlSnapshot: paymentMethod.qrCodeUrl || null, voucherId: total.voucherId, voucherCodeSnapshot: total.voucherCodeSnapshot, subtotalCents: total.subtotalCents, discountCents: total.discountCents, totalCents: total.totalCents });
          return { orderId: order.id, paymentMethodName: paymentMethod.displayName, qrCodeUrl: paymentMethod.qrCodeUrl, instructions: paymentMethod.instructions, subtotalCents: total.subtotalCents, discountCents: total.discountCents, totalCents: total.totalCents, status: "awaiting_manual_review" as const };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    capturePaypalCheckout: publicProcedure.input(z.object({ publicToken: z.string().uuid(), paypalOrderId: z.string().trim().min(3).max(255) })).mutation(async ({ input }) => {
      try {
        const transaction = await getPaypalTransactionForPublicToken(input.publicToken);
        if (!transaction || transaction.providerCheckoutSessionId !== input.paypalOrderId) throw new TRPCError({ code: "FORBIDDEN", message: "This PayPal approval does not match the checkout session." });
        if (transaction.status === "paid") return { pendingWebhook: false, status: "paid" as const };
        const order = await capturePaypalOrder(input.paypalOrderId);
        if (order.status !== "COMPLETED") throw new TRPCError({ code: "BAD_REQUEST", message: "PayPal has not completed this payment." });
        return { pendingWebhook: true, status: "pending" as const };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    payrexPaymentStatus: publicProcedure.input(z.object({ publicToken: z.string().uuid() })).query(async ({ input }) => {
      try {
        const result = await getPayrexPaymentStatus(input.publicToken);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Payment status was not found." });
        return { orderId: result.order.id, productTitle: result.product.title, provider: result.transaction.provider, amountCents: result.transaction.amountCents, currency: result.transaction.currency, status: result.transaction.status, paidAt: result.transaction.paidAt, expiresAt: result.transaction.expiresAt, checkoutUrl: result.transaction.status === "pending" ? result.transaction.checkoutUrl : null };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    paidDeliveryFiles: publicProcedure.input(z.object({ publicToken: z.string().uuid() })).query(async ({ input }) => {
      try {
        const delivery = await listPaidDeliveryFiles(input.publicToken);
        if (!delivery) throw new TRPCError({ code: "FORBIDDEN", message: "Delivery files become available after verified payment." });
        return { orderId: delivery.order.id, files: delivery.files };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return unavailable(error);
      }
    }),
    createOneTimeDeliveryLink: publicProcedure.input(z.object({ publicToken: z.string().uuid(), productFileId: z.number().int().positive() })).mutation(async ({ input }) => {
      try {
        const token = crypto.randomUUID();
        const entitlement = await createOneTimeDeliveryEntitlement({ paymentPublicToken: input.publicToken, productFileId: input.productFileId, tokenHash: await hashDeliveryToken(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
        if (!entitlement) throw new TRPCError({ code: "FORBIDDEN", message: "This file is not available for this verified payment." });
        return { url: `${ENV.publicAppOrigin.replace(/\/+$/, "")}/api/delivery/${token}`, expiresAt: entitlement.expiresAt };
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
      delete: adminProcedure.input(z.object({ caseStudyId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          return deleteCaseStudy(input.caseStudyId);
        } catch (error) {
          return unavailable(error);
        }
      }),
      uploadCover: adminProcedure.input(z.object({ caseStudyId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(160).refine(value => value.startsWith("image/"), "Project covers must be image files."), sizeBytes: z.number().int().min(1), base64: z.string().min(1) })).mutation(async ({ input }) => {
        try {
          const project = await getCaseStudyById(input.caseStudyId);
          if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
          const bytes = Buffer.from(input.base64, "base64");
          if (!bytes.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a non-empty project cover image." });
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const stored = await storagePut(`project-covers/${project.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
          return updateCaseStudyCover(project.id, stored.url);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
      removeCover: adminProcedure.input(z.object({ caseStudyId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          const project = await getCaseStudyById(input.caseStudyId);
          if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
          return updateCaseStudyCover(project.id, null);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
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
      delete: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          return deleteDigitalProduct(input.productId);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    }),
    orders: router({
      list: adminProcedure.query(async () => {
        try {
          return getGuestCheckoutRequests();
        } catch (error) {
          return unavailable(error);
        }
      }),
      updateStatus: adminProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["submitted", "contacted", "fulfilled", "cancelled"]) })).mutation(async ({ input }) => {
        try {
          return updateGuestCheckoutRequestStatus(input.orderId, input.status);
        } catch (error) {
          return unavailable(error);
        }
      }),
      reviewPayment: adminProcedure.input(z.object({ orderId: z.number().int().positive(), paymentStatus: z.enum(["verified", "rejected"]), paymentReviewNote: z.string().trim().max(1000).optional() })).mutation(async ({ input }) => {
        try {
          return updateGuestCheckoutPaymentReview(input.orderId, input.paymentStatus, input.paymentReviewNote);
        } catch (error) {
          return unavailable(error);
        }
      }),
      revokeDeliveryLinks: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          return revokeDeliveryEntitlementsForOrder(input.orderId);
        } catch (error) {
          return unavailable(error);
        }
      }),
      createReplacementDeliveryLink: adminProcedure.input(z.object({ orderId: z.number().int().positive(), productFileId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          const token = crypto.randomUUID();
          const entitlement = await createOwnerOneTimeDeliveryEntitlement({ orderId: input.orderId, productFileId: input.productFileId, tokenHash: await hashDeliveryToken(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
          if (!entitlement) throw new TRPCError({ code: "BAD_REQUEST", message: "A replacement link can be created only for a verified PayRex payment and an eligible private buyer file." });
          return { url: `${ENV.publicAppOrigin.replace(/\/+$/, "")}/api/delivery/${token}`, expiresAt: entitlement.expiresAt };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    }),
    vouchers: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllVouchers();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure.input(z.object({ voucherId: z.number().int().positive().optional(), code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,64}$/), label: z.string().trim().min(2).max(160), scope: z.enum(["general", "selected_products"]), discountKind: z.enum(["percent", "fixed"]), discountValue: z.number().int().positive().max(10_000_000), maxRedemptions: z.number().int().positive().max(1_000_000).optional().nullable(), startsAt: optionalDate, endsAt: optionalDate, isActive: z.boolean().default(true), productIds: z.array(z.number().int().positive()).max(200).default([]) }).superRefine((input, ctx) => {
        if (input.discountKind === "percent" && input.discountValue > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100%." });
        if (input.scope === "selected_products" && !input.productIds.length) ctx.addIssue({ code: "custom", path: ["productIds"], message: "Choose at least one product for a selected-product voucher." });
        if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after start date." });
      })).mutation(async ({ input }) => {
        try {
          const uniqueProductIds = Array.from(new Set(input.productIds));
          if (input.scope === "selected_products") {
            const products = await Promise.all(uniqueProductIds.map(productId => getDigitalProductById(productId)));
            if (products.some(product => !product)) throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected products no longer exist." });
          }
          return saveVoucher({ ...input, discountValue: input.discountKind === "fixed" ? input.discountValue * 100 : input.discountValue, productIds: uniqueProductIds });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
      setActive: adminProcedure.input(z.object({ voucherId: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
        try {
          return setVoucherActive(input.voucherId, input.isActive);
        } catch (error) {
          return unavailable(error);
        }
      }),
    }),
    inquiries: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllInquiries();
        } catch (error) {
          return unavailable(error);
        }
      }),
      updateStatus: adminProcedure.input(z.object({ inquiryId: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]) })).mutation(async ({ input }) => {
        try {
          return updateInquiryStatus(input.inquiryId, input.status);
        } catch (error) {
          return unavailable(error);
        }
      }),
    }),
    paymentMethods: router({
      providers: router({
        list: adminProcedure.query(async () => {
          try {
            return getPaymentProviderSettings();
          } catch (error) {
            return unavailable(error);
          }
        }),
        setActive: adminProcedure.input(z.object({ provider: z.enum(["payrex", "paypal"]), isActive: z.boolean() })).mutation(async ({ input }) => {
          try {
            return setPaymentProviderActive(input.provider, input.isActive);
          } catch (error) {
            return unavailable(error);
          }
        }),
      }),
      list: adminProcedure.query(async () => {
        try {
          return getAllPaymentMethods();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure.input(z.object({ paymentMethodId: z.number().int().positive().optional(), methodType: paymentMethodType, displayName: z.string().trim().min(2).max(120), logoUrl: z.string().trim().url().max(5000).optional().nullable(), logoKey: z.string().trim().max(512).optional().nullable(), qrCodeUrl: z.string().trim().url().max(5000).optional().nullable(), qrCodeKey: z.string().trim().max(512).optional().nullable(), instructions: paymentInstructions, isActive: z.boolean().default(true), sortOrder: z.number().int().min(0).default(0) })).mutation(async ({ input }) => {
        try {
          const { paymentMethodId, ...values } = input;
          return savePaymentMethod(values, paymentMethodId);
        } catch (error) {
          return unavailable(error);
        }
      }),
      uploadQrCode: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: paymentImageMimeType, sizeBytes: z.number().int().min(1), base64: z.string().min(1) })).mutation(async ({ input }) => {
        try {
          const bytes = Buffer.from(input.base64, "base64");
          if (!bytes.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a non-empty QR code image." });
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          return storagePutPaymentQr(`payment-method-qr/${Date.now()}-${safeName}`, bytes, input.mimeType);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
      remove: adminProcedure.input(z.object({ paymentMethodId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          return deletePaymentMethod(input.paymentMethodId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Payment method could not be deleted.";
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
      }),
    }),
    productFiles: router({
      list: adminProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => {
        try {
          return getProductFiles(input.productId);
        } catch (error) {
          return unavailable(error);
        }
      }),
      upload: adminProcedure.input(z.object({ productId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(160).optional(), sizeBytes: z.number().int().min(0), base64: z.string().min(1) })).mutation(async ({ input }) => {
        try {
          const product = await getDigitalProductById(input.productId);
          if (!product || product.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "An active product is required before attaching files." });
          const bytes = Buffer.from(input.base64, "base64");
          if (!bytes.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a non-empty buyer delivery file." });
          const stored = await storagePutPrivateDeliveryFile(`product-files/${product.id}/${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, bytes, input.mimeType || "application/octet-stream");
          return saveProductFile({ productId: product.id, fileName: input.fileName, fileUrl: stored.url, fileKey: stored.publicId, mimeType: input.mimeType || null, sizeBytes: input.sizeBytes, sortOrder: 0 });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
      remove: adminProcedure.input(z.object({ productFileId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          await deleteProductFile(input.productFileId);
          return { success: true } as const;
        } catch (error) {
          return unavailable(error);
        }
      }),
    }),
    productCovers: router({
      upload: adminProcedure.input(z.object({ productId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(160).optional(), sizeBytes: z.number().int().min(1).max(5_000_000), base64: z.string().min(1).max(7_000_000) })).mutation(async ({ input }) => {
        try {
          if (input.mimeType && !input.mimeType.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "Product covers must be image files." });
          const product = await getDigitalProductById(input.productId);
          if (!product || product.isArchived) throw new TRPCError({ code: "NOT_FOUND", message: "An active product is required before adding a cover." });
          const bytes = Buffer.from(input.base64, "base64");
          if (!bytes.length || bytes.length > 5_000_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Product covers must be smaller than 5 MB." });
          const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const stored = await storagePut(`product-covers/${product.id}/${Date.now()}-${safeName}`, bytes, input.mimeType || "application/octet-stream");
          return updateDigitalProductCover(product.id, stored.url);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
      remove: adminProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ input }) => {
        try {
          const product = await getDigitalProductById(input.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
          return updateDigitalProductCover(product.id, null);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return unavailable(error);
        }
      }),
    }),
    publicSiteContent: router({
      list: adminProcedure.query(async () => {
        try {
          return getAllPublicSiteContent();
        } catch (error) {
          return unavailable(error);
        }
      }),
      save: adminProcedure.input(z.object({ contentId: z.number().int().positive().optional(), page: z.enum(["home", "shop", "services", "work", "about", "contact", "footer"]), section: z.string().trim().min(2).max(64), eyebrow: z.string().trim().max(160).optional().nullable(), title: z.string().trim().max(300).optional().nullable(), body: z.string().trim().max(10000).optional().nullable(), imageUrl: z.string().url().max(5000).optional().nullable(), ctaLabel: z.string().trim().max(120).optional().nullable(), ctaHref: z.string().trim().max(500).optional().nullable(), isPublished: z.boolean().default(true) })).mutation(async ({ input }) => {
        try {
          const { contentId, ...values } = input;
          return savePublicSiteContent(values, contentId);
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
