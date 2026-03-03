import { z } from "zod";

export const inputFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.enum([
    "seed",
    "fertilizer",
    "herbicide",
    "insecticide",
    "fungicide",
    "adjuvant",
    "other",
  ]),
  packaging: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  totalPrice: z.coerce.number().min(0).optional(),
  paymentStatus: z.enum(["pending", "paid", "partial"]).default("pending"),
  paymentDate: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

export const serviceFormSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  hectares: z.coerce.number().min(0).optional(),
  hours: z.coerce.number().min(0).optional(),
  costPerHectare: z.coerce.number().min(0).optional(),
  costPerHour: z.coerce.number().min(0).optional(),
  totalCost: z.coerce.number().min(0).optional(),
  paymentStatus: z.enum(["pending", "paid", "partial"]).default("pending"),
  paymentDate: z.string().optional(),
  workerName: z.string().optional(),
  machineId: z.string().optional(),
  fuelCost: z.coerce.number().min(0).optional(),
  maintenanceCost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const machineFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum([
    "trator",
    "pulverizador",
    "colheitadeira",
    "plantadeira",
    "distribuidor",
    "caminhao",
    "outro",
  ]),
  ownership: z.enum(["owned", "rented"]),
  hourlyRate: z.coerce.number().min(0).optional(),
  fuelConsumptionLH: z.coerce.number().min(0).optional(),
  fuelPricePerL: z.coerce.number().min(0).optional(),
  maintenanceCostPerH: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type MachineFormValues = z.infer<typeof machineFormSchema>;

export const activityFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  activityType: z.enum([
    "soil_prep",
    "planting",
    "spraying",
    "fertilizing",
    "harvest",
    "other",
  ]),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  machineId: z.string().optional(),
  hoursUsed: z.coerce.number().min(0).optional(),
  quantity: z.string().optional(),
  observations: z.string().optional(),
  status: z
    .enum(["planned", "in_progress", "completed", "cancelled"])
    .default("planned"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export const financialEntryFormSchema = z.object({
  type: z.enum(["expense", "income"]).default("expense"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
  notes: z.string().optional(),
});

export type FinancialEntryFormValues = z.infer<typeof financialEntryFormSchema>;

export const consultingVisitFormSchema = z.object({
  visitDate: z.string().min(1, "Data é obrigatória"),
  activities: z.string().min(1, "Atividades são obrigatórias"),
  recommendations: z.string().optional(),
});

export type ConsultingVisitFormValues = z.infer<
  typeof consultingVisitFormSchema
>;

export const fieldFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  areaHa: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

export const cropSeasonFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cropType: z.enum(["soy", "corn", "other"]),
  cycleDays: z.coerce.number().min(0).optional(),
  plantingDate: z.string().optional(),
  harvestDate: z.string().optional(),
  totalAreaHa: z.coerce.number().min(0).optional(),
  status: z
    .enum(["planning", "active", "harvested", "closed"])
    .default("planning"),
});

export type CropSeasonFormValues = z.infer<typeof cropSeasonFormSchema>;

export const rainEntryFormSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  volumeMm: z.coerce.number().min(0, "Volume deve ser positivo"),
  notes: z.string().optional(),
});

export type RainEntryFormValues = z.infer<typeof rainEntryFormSchema>;

export const loanFormSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  bank: z.string().optional(),
  totalAmount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  amountPayable: z.coerce.number().min(0).optional(),
  interestRate: z.coerce.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default("active"),
  notes: z.string().optional(),
});

export type LoanFormValues = z.infer<typeof loanFormSchema>;

export const advanceFormSchema = z.object({
  seasonId: z.string().min(1, "Safra é obrigatória"),
  recipient: z.string().min(1, "Destinatário é obrigatório"),
  product: z.string().optional(),
  quantity: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export type AdvanceFormValues = z.infer<typeof advanceFormSchema>;

export const workerFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  role: z.enum(["trabalhador", "operador", "diarista", "tratorista", "other"]),
  phone: z.string().optional(),
  dailyRate: z.coerce.number().min(0).optional(),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
});

export type WorkerFormValues = z.infer<typeof workerFormSchema>;

export const workerAssignmentFormSchema = z.object({
  workerId: z.string().min(1, "Trabalhador é obrigatório"),
  fieldId: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  hoursWorked: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});

export type WorkerAssignmentFormValues = z.infer<typeof workerAssignmentFormSchema>;
