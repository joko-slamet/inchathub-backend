
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

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

    res.status(201).json(newRegistration);
  } catch (error: any) {
    if (error.code === 'P2002') { // Unique constraint failed for email
      return res.status(409).json({ message: 'Email already registered for this webinar.' });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getWebinarRegistrations = async (req: Request, res: Response) => {
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
