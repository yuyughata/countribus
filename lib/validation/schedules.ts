import { z } from "zod";

import { uuid } from "@/lib/validation/common";

export const routeSchema = z
  .object({
    vendorId: uuid,
    originTerminalId: uuid,
    destinationTerminalId: uuid,
    name: z.string().trim().min(2, "Name the route").max(80),
  })
  .refine((d) => d.originTerminalId !== d.destinationTerminalId, {
    message: "Origin and destination must differ",
    path: ["destinationTerminalId"],
  });

export const scheduleSchema = z
  .object({
    vendorId: uuid,
    routeId: uuid,
    vehicleId: uuid,
    departureAt: z.string().min(1, "Set a departure time"),
    arrivalEstimateAt: z.string().min(1, "Set an arrival estimate"),
    fareNaira: z.coerce.number().positive("Enter a fare").max(1_000_000),
    boardingAddress: z
      .string()
      .trim()
      .min(6, "Enter the boarding terminal address")
      .max(200),
    boardingContactPhone: z
      .string()
      .trim()
      .min(7, "Enter a contact phone number")
      .max(30),
  })
  .refine((d) => new Date(d.arrivalEstimateAt) > new Date(d.departureAt), {
    message: "Arrival must be after departure",
    path: ["arrivalEstimateAt"],
  });

export type RouteInput = z.infer<typeof routeSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
