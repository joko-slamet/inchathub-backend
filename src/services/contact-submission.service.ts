import { prisma } from "../config/prisma";

export type ContactSubmissionInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export const contactSubmissionService = {
  create(data: ContactSubmissionInput) {
    return prisma.contactSubmission.create({ data });
  },

  findAll() {
    return prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });
  },
};
