import { Router } from "express";
import { aiArticleConfigRouter } from "./ai-article-config.routes";
import { articlesRouter } from "./articles.routes";
import { authRouter } from "./auth.routes";
import { companyLogoRouter } from "./company-logo.routes";
import { companyProfileRouter } from "./company-profile.routes";
import { contactSubmissionRouter } from "./contact-submission.routes";
import { webinarRegistrationRouter } from "./webinarRegistration.route";
import { healthRouter } from "./health.routes";
import { pricingRouter } from "./pricing.routes";
import { promoRouter } from "./promo.routes";
import { siteSettingsRouter } from "./site-settings.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/pricing-plans", pricingRouter);
apiRouter.use("/ai-article-config", aiArticleConfigRouter);
apiRouter.use("/articles", articlesRouter);
apiRouter.use("/company-profile", companyProfileRouter);
apiRouter.use("/company-logos", companyLogoRouter);
apiRouter.use("/promos", promoRouter);
apiRouter.use("/site-settings", siteSettingsRouter);
apiRouter.use("/contact-submissions", contactSubmissionRouter);
apiRouter.use("/webinar-registrations", webinarRegistrationRouter);
