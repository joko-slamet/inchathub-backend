
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { mailService } from '../services/mail.service';

export const createWebinarRegistration = async (req: Request, res: Response) => {
  try {
    const { name, city, email, whatsapp } = req.body;

    const newRegistration = await prisma.webinarRegistration.create({
      data: {
        name,
        city,
        email,
        whatsapp,
      },
    });

    try {
      await mailService.sendWebinarConfirmation({
        name,
        city,
        email,
        whatsapp,
      });
    } catch (mailError) {
      console.error('[mail] failed to send webinar confirmation', mailError);
    }

    res.status(201).json(newRegistration);
  } catch (error: any) {
    if (error.code === 'P2002') { // Unique constraint failed for email
      return res.status(409).json({ message: 'Email already registered for this webinar.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getWebinarRegistrations = async (_req: Request, res: Response) => {
  try {
    const registrations = await prisma.webinarRegistration.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.status(200).json(registrations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
