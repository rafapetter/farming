import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  date,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["owner", "consultant"]);
export const cropTypeEnum = pgEnum("crop_type", ["soy", "corn", "other"]);
export const seasonStatusEnum = pgEnum("season_status", [
  "planning",
  "active",
  "harvested",
  "closed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "partial",
]);
export const inputCategoryEnum = pgEnum("input_category", [
  "seed",
  "fertilizer",
  "herbicide",
  "insecticide",
  "fungicide",
  "adjuvant",
  "other",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "soil_prep",
  "planting",
  "spraying",
  "fertilizing",
  "harvest",
  "other",
]);
export const activityStatusEnum = pgEnum("activity_status", [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);
export const financialTypeEnum = pgEnum("financial_type", [
  "expense",
  "income",
]);
export const chatRoleEnum = pgEnum("chat_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);
export const inputModeEnum = pgEnum("input_mode", ["text", "voice"]);
export const insightTypeEnum = pgEnum("insight_type", [
  "alert",
  "recommendation",
  "summary",
  "forecast",
]);
export const insightPriorityEnum = pgEnum("insight_priority", [
  "low",
  "medium",
  "high",
]);
export const workerRoleEnum = pgEnum("worker_role", [
  "trabalhador",
  "operador",
  "diarista",
  "tratorista",
  "other",
]);
export const machineOwnershipEnum = pgEnum("machine_ownership", [
  "owned",
  "rented",
]);
export const machineTypeEnum = pgEnum("machine_type", [
  "trator",
  "pulverizador",
  "colheitadeira",
  "plantadeira",
  "distribuidor",
  "caminhao",
  "outro",
]);
export const commoditySourceEnum = pgEnum("commodity_source", [
  "cepea",
  "cbot",
]);
export const commodityTypeEnum = pgEnum("commodity_type", ["soy", "corn"]);
export const weatherMetricEnum = pgEnum("weather_metric", [
  "temp_high",
  "temp_low",
  "wind",
  "humidity_low",
  "frost",
  "heavy_rain",
]);
export const nfStatusEnum = pgEnum("nf_status", [
  "pending",
  "processed",
  "error",
]);

// ─── Core Tables ─────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("consultant"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const farms = pgTable("farms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  totalAreaHa: decimal("total_area_ha", { precision: 10, scale: 2 }),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cropSeasons = pgTable("crop_seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  name: text("name").notNull(),
  cropType: cropTypeEnum("crop_type").notNull(),
  cycleDays: integer("cycle_days"),
  plantingDate: date("planting_date"),
  harvestDate: date("harvest_date"),
  totalAreaHa: decimal("total_area_ha", { precision: 10, scale: 2 }),
  status: seasonStatusEnum("status").notNull().default("planning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const fields = pgTable("fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  name: text("name").notNull(),
  areaHa: decimal("area_ha", { precision: 10, scale: 2 }),
  coordinates: jsonb("coordinates"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const seasonFields = pgTable("season_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  fieldId: uuid("field_id")
    .references(() => fields.id)
    .notNull(),
  cropType: cropTypeEnum("crop_type"),
  plantedAreaHa: decimal("planted_area_ha", { precision: 10, scale: 2 }),
});

// ─── Cost Control Tables ─────────────────────────────────────────────────────

export const inputs = pgTable("inputs", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  name: text("name").notNull(),
  category: inputCategoryEnum("category").notNull().default("other"),
  packaging: text("packaging"),
  unit: text("unit"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  paymentDate: date("payment_date"),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  description: text("description").notNull(),
  hectares: decimal("hectares", { precision: 10, scale: 2 }),
  hours: decimal("hours", { precision: 10, scale: 2 }),
  costPerHectare: decimal("cost_per_hectare", { precision: 12, scale: 2 }),
  costPerHour: decimal("cost_per_hour", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  paymentDate: date("payment_date"),
  workerName: text("worker_name"),
  machineId: uuid("machine_id").references(() => machines.id),
  fuelCost: decimal("fuel_cost", { precision: 10, scale: 2 }),
  maintenanceCost: decimal("maintenance_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const advances = pgTable("advances", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  recipient: text("recipient").notNull(),
  product: text("product"),
  quantity: text("quantity"),
  value: decimal("value", { precision: 12, scale: 2 }),
  date: date("date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loans = pgTable("loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  description: text("description").notNull(),
  bank: text("bank"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPayable: decimal("amount_payable", { precision: 12, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Planning & Management Tables ────────────────────────────────────────────

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  fieldId: uuid("field_id").references(() => fields.id),
  machineId: uuid("machine_id").references(() => machines.id),
  title: text("title").notNull(),
  activityType: activityTypeEnum("activity_type").notNull().default("other"),
  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),
  hoursUsed: decimal("hours_used", { precision: 6, scale: 2 }),
  quantity: text("quantity"),
  observations: text("observations"),
  status: activityStatusEnum("status").notNull().default("planned"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const activityProducts = pgTable("activity_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .references(() => activities.id)
    .notNull(),
  inputId: uuid("input_id")
    .references(() => inputs.id)
    .notNull(),
  quantityUsed: text("quantity_used"),
  dosage: text("dosage"),
});

// ─── Financial Control Tables ────────────────────────────────────────────────

export const financialEntries = pgTable("financial_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  type: financialTypeEnum("type").notNull().default("expense"),
  category: text("category").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  month: integer("month"),
  year: integer("year"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Rain/Precipitation Tables ──────────────────────────────────────────────

export const rainEntries = pgTable("rain_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  date: date("date").notNull(),
  volumeMm: decimal("volume_mm", { precision: 8, scale: 2 }).notNull(),
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rainCache = pgTable("rain_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  queryType: text("query_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  responseData: jsonb("response_data").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

// ─── Workers Tables ─────────────────────────────────────────────────────────

export const workers = pgTable("workers", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  name: text("name").notNull(),
  role: workerRoleEnum("role").notNull().default("trabalhador"),
  phone: text("phone"),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  active: boolean("active").default(true).notNull(),
  hireDate: date("hire_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workerAssignments = pgTable("worker_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id")
    .references(() => workers.id)
    .notNull(),
  activityId: uuid("activity_id").references(() => activities.id),
  fieldId: uuid("field_id").references(() => fields.id),
  date: date("date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Machines Tables ────────────────────────────────────────────────────────

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  name: text("name").notNull(),
  type: machineTypeEnum("type").notNull().default("outro"),
  ownership: machineOwnershipEnum("ownership").notNull().default("owned"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  fuelConsumptionLH: decimal("fuel_consumption_l_h", {
    precision: 6,
    scale: 2,
  }),
  fuelPricePerL: decimal("fuel_price_per_l", { precision: 8, scale: 2 }),
  maintenanceCostPerH: decimal("maintenance_cost_per_h", {
    precision: 10,
    scale: 2,
  }),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Consulting Tables ───────────────────────────────────────────────────────

export const consultingVisits = pgTable("consulting_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  consultantId: uuid("consultant_id")
    .references(() => users.id)
    .notNull(),
  visitDate: date("visit_date").notNull(),
  activities: text("activities").notNull(),
  recommendations: text("recommendations"),
  photos: jsonb("photos"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Yield Forecast Tables ───────────────────────────────────────────────────

export const yieldAssessments = pgTable("yield_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .references(() => cropSeasons.id)
    .notNull(),
  fieldId: uuid("field_id").references(() => fields.id),
  assessmentDate: date("assessment_date"),
  cultivarName: text("cultivar_name"),
  weight1000GrainsKg: decimal("weight_1000_grains_kg", {
    precision: 6,
    scale: 4,
  }),
  rowSpacingM: decimal("row_spacing_m", { precision: 4, scale: 2 }),
  plantsPerLinearM: decimal("plants_per_linear_m", { precision: 6, scale: 2 }),
  plantPopulationHa: integer("plant_population_ha"),
  pods1Grain: integer("pods_1_grain"),
  pods2Grains: integer("pods_2_grains"),
  pods3Grains: integer("pods_3_grains"),
  pods4Grains: integer("pods_4_grains"),
  pods5Grains: integer("pods_5_grains"),
  avgPodsPerPlant: decimal("avg_pods_per_plant", { precision: 6, scale: 2 }),
  avgGrainsPerPod: decimal("avg_grains_per_pod", { precision: 6, scale: 4 }),
  avgGrainsPerPlant: integer("avg_grains_per_plant"),
  grainsPerM2: integer("grains_per_m2"),
  gramsPerPlant: decimal("grams_per_plant", { precision: 8, scale: 4 }),
  kgPerHa: decimal("kg_per_ha", { precision: 10, scale: 2 }),
  sacksPerHa: decimal("sacks_per_ha", { precision: 10, scale: 2 }),
  estimatedLossPct: decimal("estimated_loss_pct", { precision: 5, scale: 2 }),
  pricePerSack: decimal("price_per_sack", { precision: 10, scale: 2 }),
  productionCostSacks: decimal("production_cost_sacks", {
    precision: 10,
    scale: 2,
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── AI & Agent Tables ───────────────────────────────────────────────────────

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  title: text("title"),
  messages: jsonb("messages"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => chatSessions.id)
    .notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  inputMode: inputModeEnum("input_mode").default("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  seasonId: uuid("season_id").references(() => cropSeasons.id),
  type: insightTypeEnum("type").notNull(),
  title: text("title"),
  content: text("content"),
  priority: insightPriorityEnum("priority").notNull().default("medium"),
  dismissed: boolean("dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Commodity Prices Tables ─────────────────────────────────────────────────

export const commodityPrices = pgTable("commodity_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  source: commoditySourceEnum("source").notNull(),
  commodity: commodityTypeEnum("commodity").notNull(),
  date: date("date").notNull(),
  pricePerSack: decimal("price_per_sack", { precision: 10, scale: 2 }),
  priceDollar: decimal("price_dollar", { precision: 10, scale: 4 }),
  unit: text("unit"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

// ─── Telegram Tables ────────────────────────────────────────────────────────

export const telegramLinks = pgTable("telegram_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  chatId: text("chat_id").notNull(),
  username: text("username"),
  active: boolean("active").default(true).notNull(),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// ─── Weather Alert Tables ───────────────────────────────────────────────────

export const weatherAlertRules = pgTable("weather_alert_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  metric: weatherMetricEnum("metric").notNull(),
  threshold: decimal("threshold", { precision: 8, scale: 2 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weatherAlerts = pgTable("weather_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  ruleId: uuid("rule_id").references(() => weatherAlertRules.id),
  metric: weatherMetricEnum("metric").notNull(),
  value: decimal("value", { precision: 8, scale: 2 }).notNull(),
  message: text("message").notNull(),
  date: date("date").notNull(),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Nota Fiscal Tables ─────────────────────────────────────────────────────

export const notasFiscais = pgTable("notas_fiscais", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  seasonId: uuid("season_id").references(() => cropSeasons.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  extractedData: jsonb("extracted_data"),
  status: nfStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Buyers Tables ──────────────────────────────────────────────────────────

export const buyers = pgTable("buyers", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  location: text("location"),
  commodities: jsonb("commodities"),
  lastContactDate: date("last_contact_date"),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Crop Evaluation Tables ─────────────────────────────────────────────────

export const cropEvaluations = pgTable("crop_evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  cropName: text("crop_name").notNull(),
  analysisData: jsonb("analysis_data"),
  estimatedRevenuePerHa: decimal("estimated_revenue_per_ha", {
    precision: 10,
    scale: 2,
  }),
  estimatedCostPerHa: decimal("estimated_cost_per_ha", {
    precision: 10,
    scale: 2,
  }),
  riskScore: decimal("risk_score", { precision: 3, scale: 1 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Budget Tables ──────────────────────────────────────────────────────────

export const budgetTargets = pgTable("budget_targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  farmId: uuid("farm_id")
    .references(() => farms.id)
    .notNull(),
  category: text("category").notNull(),
  monthlyLimit: decimal("monthly_limit", { precision: 12, scale: 2 }),
  yearlyLimit: decimal("yearly_limit", { precision: 12, scale: 2 }),
  year: integer("year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cron Log Tables ────────────────────────────────────────────────────────

export const cronLogs = pgTable("cron_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(),
  details: jsonb("details"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  farms: many(farms),
  chatSessions: many(chatSessions),
  consultingVisits: many(consultingVisits),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  owner: one(users, { fields: [farms.ownerId], references: [users.id] }),
  cropSeasons: many(cropSeasons),
  fields: many(fields),
  financialEntries: many(financialEntries),
  consultingVisits: many(consultingVisits),
  loans: many(loans),
  aiInsights: many(aiInsights),
  chatSessions: many(chatSessions),
  rainEntries: many(rainEntries),
}));

export const cropSeasonsRelations = relations(cropSeasons, ({ one, many }) => ({
  farm: one(farms, { fields: [cropSeasons.farmId], references: [farms.id] }),
  seasonFields: many(seasonFields),
  inputs: many(inputs),
  services: many(services),
  advances: many(advances),
  activities: many(activities),
  yieldAssessments: many(yieldAssessments),
  aiInsights: many(aiInsights),
}));

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  farm: one(farms, { fields: [fields.farmId], references: [farms.id] }),
  seasonFields: many(seasonFields),
  activities: many(activities),
  yieldAssessments: many(yieldAssessments),
}));

export const seasonFieldsRelations = relations(seasonFields, ({ one }) => ({
  season: one(cropSeasons, {
    fields: [seasonFields.seasonId],
    references: [cropSeasons.id],
  }),
  field: one(fields, {
    fields: [seasonFields.fieldId],
    references: [fields.id],
  }),
}));

export const inputsRelations = relations(inputs, ({ one, many }) => ({
  season: one(cropSeasons, {
    fields: [inputs.seasonId],
    references: [cropSeasons.id],
  }),
  activityProducts: many(activityProducts),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  season: one(cropSeasons, {
    fields: [services.seasonId],
    references: [cropSeasons.id],
  }),
}));

export const advancesRelations = relations(advances, ({ one }) => ({
  season: one(cropSeasons, {
    fields: [advances.seasonId],
    references: [cropSeasons.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  season: one(cropSeasons, {
    fields: [activities.seasonId],
    references: [cropSeasons.id],
  }),
  field: one(fields, {
    fields: [activities.fieldId],
    references: [fields.id],
  }),
  machine: one(machines, {
    fields: [activities.machineId],
    references: [machines.id],
  }),
  activityProducts: many(activityProducts),
}));

export const activityProductsRelations = relations(
  activityProducts,
  ({ one }) => ({
    activity: one(activities, {
      fields: [activityProducts.activityId],
      references: [activities.id],
    }),
    input: one(inputs, {
      fields: [activityProducts.inputId],
      references: [inputs.id],
    }),
  })
);

export const financialEntriesRelations = relations(
  financialEntries,
  ({ one }) => ({
    farm: one(farms, {
      fields: [financialEntries.farmId],
      references: [farms.id],
    }),
  })
);

export const consultingVisitsRelations = relations(
  consultingVisits,
  ({ one }) => ({
    farm: one(farms, {
      fields: [consultingVisits.farmId],
      references: [farms.id],
    }),
    consultant: one(users, {
      fields: [consultingVisits.consultantId],
      references: [users.id],
    }),
  })
);

export const yieldAssessmentsRelations = relations(
  yieldAssessments,
  ({ one }) => ({
    season: one(cropSeasons, {
      fields: [yieldAssessments.seasonId],
      references: [cropSeasons.id],
    }),
    field: one(fields, {
      fields: [yieldAssessments.fieldId],
      references: [fields.id],
    }),
  })
);

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [chatSessions.userId],
      references: [users.id],
    }),
    farm: one(farms, {
      fields: [chatSessions.farmId],
      references: [farms.id],
    }),
    messages: many(chatMessages),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  farm: one(farms, {
    fields: [loans.farmId],
    references: [farms.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  farm: one(farms, {
    fields: [aiInsights.farmId],
    references: [farms.id],
  }),
  season: one(cropSeasons, {
    fields: [aiInsights.seasonId],
    references: [cropSeasons.id],
  }),
}));

export const rainEntriesRelations = relations(rainEntries, ({ one }) => ({
  farm: one(farms, {
    fields: [rainEntries.farmId],
    references: [farms.id],
  }),
}));

export const rainCacheRelations = relations(rainCache, ({ one }) => ({
  farm: one(farms, {
    fields: [rainCache.farmId],
    references: [farms.id],
  }),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  farm: one(farms, {
    fields: [workers.farmId],
    references: [farms.id],
  }),
  assignments: many(workerAssignments),
}));

export const workerAssignmentsRelations = relations(
  workerAssignments,
  ({ one }) => ({
    worker: one(workers, {
      fields: [workerAssignments.workerId],
      references: [workers.id],
    }),
    activity: one(activities, {
      fields: [workerAssignments.activityId],
      references: [activities.id],
    }),
    field: one(fields, {
      fields: [workerAssignments.fieldId],
      references: [fields.id],
    }),
  })
);

export const commodityPricesRelations = relations(
  commodityPrices,
  ({ one }) => ({
    farm: one(farms, {
      fields: [commodityPrices.farmId],
      references: [farms.id],
    }),
  })
);

export const telegramLinksRelations = relations(telegramLinks, ({ one }) => ({
  farm: one(farms, {
    fields: [telegramLinks.farmId],
    references: [farms.id],
  }),
}));

export const weatherAlertRulesRelations = relations(
  weatherAlertRules,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [weatherAlertRules.farmId],
      references: [farms.id],
    }),
    alerts: many(weatherAlerts),
  })
);

export const weatherAlertsRelations = relations(weatherAlerts, ({ one }) => ({
  farm: one(farms, {
    fields: [weatherAlerts.farmId],
    references: [farms.id],
  }),
  rule: one(weatherAlertRules, {
    fields: [weatherAlerts.ruleId],
    references: [weatherAlertRules.id],
  }),
}));

export const notasFiscaisRelations = relations(notasFiscais, ({ one }) => ({
  farm: one(farms, {
    fields: [notasFiscais.farmId],
    references: [farms.id],
  }),
  season: one(cropSeasons, {
    fields: [notasFiscais.seasonId],
    references: [cropSeasons.id],
  }),
}));

export const buyersRelations = relations(buyers, ({ one }) => ({
  farm: one(farms, {
    fields: [buyers.farmId],
    references: [farms.id],
  }),
}));

export const cropEvaluationsRelations = relations(
  cropEvaluations,
  ({ one }) => ({
    farm: one(farms, {
      fields: [cropEvaluations.farmId],
      references: [farms.id],
    }),
  })
);

export const budgetTargetsRelations = relations(budgetTargets, ({ one }) => ({
  farm: one(farms, {
    fields: [budgetTargets.farmId],
    references: [farms.id],
  }),
}));
