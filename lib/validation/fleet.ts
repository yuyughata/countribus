import { z } from "zod";

import { uuid } from "@/lib/validation/common";

export const vehicleSchema = z.object({
  vendorId: uuid,
  categoryId: uuid,
  registrationNo: z.string().trim().min(2, "Enter the plate number").max(20),
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(100),
});

export const seatSchema = z.object({
  seatLabel: z.string().min(1).max(8),
  row: z.number().int().min(1),
  col: z.number().int().min(1),
  seatType: z.enum([
    "standard",
    "window",
    "aisle",
    "driver",
    "blocked",
    "wc",
    "entrance",
    "amenity",
    "empty",
  ]),
  isSellable: z.boolean(),
  seatClass: z.string().min(1).max(20).default("standard"),
  surchargeKobo: z.number().int().min(0).max(100_000_00).default(0),
});

export const seatTemplateSchema = z.object({
  vendorId: uuid,
  vehicleId: uuid.optional().or(z.literal("")),
  name: z.string().trim().min(1).max(60),
  rows: z.coerce.number().int().min(1).max(40),
  columns: z.coerce.number().int().min(1).max(10),
  seats: z.array(seatSchema).min(1, "Add at least one seat").max(400),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type SeatTemplateInput = z.infer<typeof seatTemplateSchema>;
