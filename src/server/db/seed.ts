import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hash } from "bcryptjs";
import { sql as rawSql } from "drizzle-orm";
import * as schema from "./schema";

async function seed() {
  const sql = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(sql, { schema });

  console.log("Seeding database...");

  // ─── Truncate all tables ──────────────────────────────────────────────────
  console.log("Truncating existing data...");
  await db.execute(rawSql`TRUNCATE TABLE
    rain_cache,
    rain_entries,
    ai_insights,
    chat_messages,
    chat_sessions,
    activity_products,
    activities,
    consulting_visits,
    financial_entries,
    yield_assessments,
    advances,
    loans,
    services,
    inputs,
    season_fields,
    crop_seasons,
    fields,
    farms,
    users
    CASCADE`);

  // ─── Users ─────────────────────────────────────────────────────────────
  const ownerPassword = await hash("fazenda123", 12);
  const consultantPassword = await hash("consultor123", 12);

  const [owner] = await db
    .insert(schema.users)
    .values({
      name: "Christina",
      email: "christina@fazendaprimavera.com",
      passwordHash: ownerPassword,
      role: "owner",
    })
    .returning();

  const [consultant] = await db
    .insert(schema.users)
    .values({
      name: "Rafael Consultor",
      email: "rafael@consultoria.com",
      passwordHash: consultantPassword,
      role: "consultant",
    })
    .returning();

  console.log("Users created:", owner.id, consultant.id);

  // ─── Farm ──────────────────────────────────────────────────────────────
  const [farm] = await db
    .insert(schema.farms)
    .values({
      name: "Fazenda Primavera",
      location: "Goiás, Brasil",
      latitude: "-15.9390",
      longitude: "-49.8140",
      totalAreaHa: "39.23",
      ownerId: owner.id,
    })
    .returning();

  console.log("Farm created:", farm.id);

  // ─── Fields ────────────────────────────────────────────────────────────
  const fieldNames = [
    "Frente da casa do peão",
    "Fundo da casa do peão",
    "Ao lado da sola",
    "Antiga do milho",
    "Ao lado do milho",
    "Antigas acerolas",
    "Acima do haras",
    "Abaixo do curral",
    "Ao lado da rodovia",
  ];

  const createdFields = await db
    .insert(schema.fields)
    .values(fieldNames.map((name) => ({ farmId: farm.id, name })))
    .returning();

  console.log("Fields created:", createdFields.length);

  // ─── Crop Seasons ──────────────────────────────────────────────────────
  const [soySeason] = await db
    .insert(schema.cropSeasons)
    .values({
      farmId: farm.id,
      name: "Safra Soja 2025/2026",
      cropType: "soy",
      cycleDays: 110,
      plantingDate: "2025-11-23",
      harvestDate: "2026-03-13",
      totalAreaHa: "35.80",
      status: "active",
    })
    .returning();

  const [cornSeason] = await db
    .insert(schema.cropSeasons)
    .values({
      farmId: farm.id,
      name: "Safra Milho 2025/2026",
      cropType: "corn",
      cycleDays: 110,
      totalAreaHa: "3.43",
      status: "active",
    })
    .returning();

  console.log("Seasons created:", soySeason.id, cornSeason.id);

  // ─── Soy Inputs ───────────────────────────────────────────────────────
  const soyInputs = [
    { name: "GUEPARDO IPRO DERM + Lumitreo", category: "seed" as const, packaging: "500 kg", unit: "Bag", quantity: "1", unitPrice: "11990.00", totalPrice: "11492.00", paymentStatus: "paid" as const },
    { name: "DM 73175 RSF IPRO DERM + ENR", category: "seed" as const, packaging: "500 kg", unit: "Bag", quantity: "1", unitPrice: "14990.00", totalPrice: "14402.00", paymentStatus: "paid" as const },
    { name: "DM 72IX74 (semente extra)", category: "seed" as const, packaging: "249 kg", unit: "Bag Aberto", quantity: "1", unitPrice: "249.00", totalPrice: "1992.00", paymentStatus: "paid" as const },
    { name: "Grafite (Unicell)", category: "adjuvant" as const, packaging: "5 kg", unit: "Kg", quantity: "1", unitPrice: "56.00", totalPrice: "56.00", paymentStatus: "paid" as const },
    { name: "Quimifol Anti Espuma", category: "adjuvant" as const, packaging: "Frasco", unit: "Litro", quantity: "1", unitPrice: "110.00", totalPrice: "110.00", paymentStatus: "pending" as const },
    { name: "CT Green", category: "fertilizer" as const, packaging: "BO 20", unit: "Litro", quantity: "20", unitPrice: "75.00", totalPrice: "1500.00", paymentStatus: "pending" as const },
    { name: "Fipronil 800 ccab", category: "insecticide" as const, packaging: "Pacote", unit: "Kg", quantity: "1", unitPrice: "340.00", totalPrice: "340.00", paymentStatus: "pending" as const },
    { name: "Roundup transorb", category: "herbicide" as const, packaging: "BO 20", unit: "Litro", quantity: "120", unitPrice: "27.00", totalPrice: "3131.55", paymentStatus: "paid" as const },
    { name: "Flumioxazina 500", category: "herbicide" as const, packaging: "Pacote", unit: "Litro", quantity: "5", unitPrice: "157.50", totalPrice: "787.50", paymentStatus: "pending" as const },
    { name: "Cletodim", category: "herbicide" as const, packaging: "BO 20", unit: "Litro", quantity: "40", unitPrice: "54.00", totalPrice: "2160.00", paymentStatus: "pending" as const },
    { name: "Cipermetrina nortox", category: "insecticide" as const, packaging: "CL 05", unit: "Litro", quantity: "5", unitPrice: "35.00", totalPrice: "175.00", paymentStatus: "pending" as const },
    { name: "Mirant (2,4-D)", category: "herbicide" as const, packaging: "BO 20", unit: "Litro", quantity: "20", unitPrice: "19.40", totalPrice: "375.01", paymentStatus: "paid" as const },
    { name: "Bulldock", category: "insecticide" as const, packaging: "Frasco", unit: "Litro", quantity: "4", unitPrice: "130.00", totalPrice: "520.00", paymentStatus: "pending" as const },
    { name: "Quimifol Vip Cerrado", category: "fertilizer" as const, packaging: "SC 25", unit: "Kg", quantity: "50", unitPrice: "22.00", totalPrice: "1100.00", paymentStatus: "pending" as const },
    { name: "Nativo", category: "fungicide" as const, packaging: "BO 20", unit: "Litro", quantity: "20", unitPrice: "95.00", totalPrice: "1900.00", paymentStatus: "pending" as const },
    { name: "Niphokam", category: "insecticide" as const, packaging: "BO 20", unit: "Litro", quantity: "40", unitPrice: "25.00", totalPrice: "1000.00", paymentStatus: "pending" as const },
    { name: "Fox xpro", category: "fungicide" as const, packaging: "BO 20", unit: "Litro", quantity: "20", unitPrice: "305.00", totalPrice: "6100.00", paymentStatus: "pending" as const },
    { name: "Connect", category: "insecticide" as const, packaging: "BO 20", unit: "Litro", quantity: "40", unitPrice: "45.00", totalPrice: "1800.00", paymentStatus: "pending" as const },
    { name: "Raynitro md", category: "fertilizer" as const, packaging: "BO 10", unit: "Litro", quantity: "10", unitPrice: "62.00", totalPrice: "620.00", paymentStatus: "pending" as const },
    { name: "Aureo", category: "adjuvant" as const, packaging: "BO 20", unit: "Litro", quantity: "20", unitPrice: "24.00", totalPrice: "480.00", paymentStatus: "pending" as const },
    { name: "Sphere max", category: "fungicide" as const, packaging: "CL 05", unit: "Litro", quantity: "10", unitPrice: "256.00", totalPrice: "2560.00", paymentStatus: "pending" as const },
    { name: "Forceps", category: "insecticide" as const, packaging: "Pacote", unit: "Kg", quantity: "10", unitPrice: "120.00", totalPrice: "1200.00", paymentStatus: "pending" as const },
    { name: "Quimifol k 40", category: "fertilizer" as const, packaging: "SC 25", unit: "Kg", quantity: "50", unitPrice: "17.00", totalPrice: "850.00", paymentStatus: "pending" as const },
    { name: "Glufosinato 200 Agroimport", category: "herbicide" as const, packaging: "20 LT", unit: "Litro", quantity: "60", unitPrice: "19.50", totalPrice: "1170.00", paymentStatus: "pending" as const },
    { name: "Hampton EC (Carfentrazona)", category: "herbicide" as const, packaging: "01 LT", unit: "Litro", quantity: "3", unitPrice: "402.00", totalPrice: "1206.00", paymentStatus: "pending" as const },
    { name: "Oleo Mineral (Fertiliza M)", category: "adjuvant" as const, packaging: "25 LT", unit: "Litro", quantity: "25", unitPrice: "13.00", totalPrice: "325.00", paymentStatus: "pending" as const },
    { name: "Clorfenapir", category: "insecticide" as const, packaging: "LT", unit: "Litro", quantity: "10", unitPrice: "60.00", totalPrice: "600.00", paymentStatus: "pending" as const },
    { name: "Roundup WG", category: "herbicide" as const, packaging: "Pacote", unit: "Kg", quantity: "20", unitPrice: "32.00", totalPrice: "640.00", paymentStatus: "pending" as const },
    { name: "Adubo", category: "fertilizer" as const, packaging: "Pacote", unit: "Kg", quantity: "120", unitPrice: "432.97", totalPrice: "51957.18", paymentStatus: "paid" as const },
    { name: "Calcário", category: "fertilizer" as const, packaging: "Caminhão", unit: "Toneladas", quantity: "36", unitPrice: "197.22", totalPrice: "7100.00", paymentStatus: "paid" as const },
    { name: "Gesso hectares Cristhina", category: "fertilizer" as const, packaging: "Caminhão", unit: "Toneladas", quantity: "36", unitPrice: "282.00", totalPrice: "10152.00", paymentStatus: "paid" as const },
    { name: "Gesso hectares do Rafael", category: "fertilizer" as const, packaging: "Caminhão", unit: "Kg", quantity: "6", unitPrice: "129.20", totalPrice: "1015.20", paymentStatus: "paid" as const },
  ];

  await db
    .insert(schema.inputs)
    .values(soyInputs.map((input) => ({ ...input, seasonId: soySeason.id })));

  console.log("Soy inputs created:", soyInputs.length);

  // ─── Corn Inputs ───────────────────────────────────────────────────────
  const cornInputs = [
    { name: "Semente 607 MG (MORGAN)", category: "seed" as const, packaging: "20.1 kg", unit: "Bag", quantity: "4", unitPrice: "722.39", totalPrice: "2889.55", paymentStatus: "pending" as const },
  ];

  await db
    .insert(schema.inputs)
    .values(cornInputs.map((input) => ({ ...input, seasonId: cornSeason.id })));

  console.log("Corn inputs created:", cornInputs.length);

  // ─── Soy Services ─────────────────────────────────────────────────────
  const soyServices = [
    { description: "Descarregamento adubo/calcário", hours: "1", costPerHour: "250.00", totalCost: "250.00", paymentStatus: "paid" as const },
    { description: "Distribuição do gesso", hectares: "36", costPerHectare: "80.00", totalCost: "2880.00", paymentStatus: "paid" as const },
    { description: "Distribuição de gesso + trator hectare do Rafael", hectares: "6", costPerHectare: "80.00", totalCost: "480.00", paymentStatus: "paid" as const },
    { description: "Trator (arado/cerca/remoção pés de acerola)", hours: "10.1", costPerHour: "250.00", totalCost: "2525.00", paymentStatus: "paid" as const },
    { description: "Distribuição de adubo", hectares: "36", costPerHectare: "80.00", totalCost: "2880.00", paymentStatus: "pending" as const },
    { description: "Distribuição do calcário", hectares: "31.5", costPerHectare: "80.00", totalCost: "2524.40", paymentStatus: "pending" as const },
    { description: "Distribuição de gesso em área separada", hectares: "4", costPerHectare: "80.00", totalCost: "320.00", paymentStatus: "pending" as const },
    { description: "Plantio", hectares: "35.8", costPerHectare: "300.00", totalCost: "10740.00", paymentStatus: "pending" as const, workerName: "Valdeci" },
    { description: "Pulverização 01 pré plantio (Aplicado 2X)", hectares: "35.8", costPerHectare: "80.00", totalCost: "5728.00", paymentStatus: "pending" as const },
    { description: "Pulverização 02 (Vassoura de botão - Aplicado 2X)", hectares: "16", costPerHectare: "80.00", totalCost: "2560.00", paymentStatus: "pending" as const },
    { description: "Pulverização 03 (Vassoura de botão)", hectares: "16.7", costPerHectare: "80.00", totalCost: "1336.00", paymentStatus: "pending" as const },
    { description: "Pulverização 04 (Capim Margoso)", hectares: "35.8", costPerHectare: "80.00", totalCost: "2864.00", paymentStatus: "pending" as const },
    { description: "Pulverização 05 (Vassoura + Capim Margoso)", hectares: "35.8", costPerHectare: "80.00", totalCost: "2864.00", paymentStatus: "pending" as const },
    { description: "Pulverização 06 (Adubação foliar)", hectares: "35.8", costPerHectare: "80.00", totalCost: "2864.00", paymentStatus: "pending" as const },
    { description: "Pulverização 07 (Adubação foliar)", hectares: "35.8", costPerHectare: "80.00", totalCost: "2864.00", paymentStatus: "pending" as const },
    { description: "Previsão de custo colheita (3,5 sacos por hectare)", hectares: "35.8", totalCost: "13455.00", paymentStatus: "pending" as const },
  ];

  await db
    .insert(schema.services)
    .values(soyServices.map((s) => ({ ...s, seasonId: soySeason.id })));

  console.log("Soy services created:", soyServices.length);

  // ─── Corn Services ─────────────────────────────────────────────────────
  const cornServices = [
    { description: "Pulverização 01 pré plantio (Aplicado 2X)", hectares: "3.43", costPerHectare: "80.00", totalCost: "548.80", paymentStatus: "pending" as const },
    { description: "Adubação", hectares: "3.43", costPerHectare: "80.00", totalCost: "274.40", paymentStatus: "pending" as const },
  ];

  await db
    .insert(schema.services)
    .values(cornServices.map((s) => ({ ...s, seasonId: cornSeason.id })));

  console.log("Corn services created:", cornServices.length);

  // ─── Soy Activities (ALL individual spray activities from planning) ────
  const soyActivities = [
    // Soil prep
    { title: "Distribuição de Calcário", activityType: "soil_prep" as const, scheduledDate: "2025-08-21", status: "completed" as const, completedDate: "2025-08-21", observations: "Utilizado para corrigir a acidez do solo, neutralizando o alumínio tóxico e fornecendo nutrientes essenciais (cálcio e magnésio), o que resulta em um ambiente propício para o desenvolvimento das raízes e, consequentemente, aumento da produtividade, podendo chegar a ganhos de até 30%." },
    { title: "Distribuição de Gesso", activityType: "soil_prep" as const, scheduledDate: "2025-08-19", status: "completed" as const, completedDate: "2025-08-19", observations: "Utilizado para corrigir o solo em profundidade (subsuperfície), entre 20 e 60 cm. Ele atua reduzindo o alumínio tóxico e fornecendo cálcio e enxofre para as raízes, o que estimula o enraizamento profundo, aumenta a absorção de água e nutrientes e melhora a resistência a veranicos." },
    // Fertilizing
    { title: "Distribuição de Adubo", activityType: "fertilizing" as const, scheduledDate: "2025-11-01", status: "completed" as const, completedDate: "2025-11-01", observations: "Utilizado fundamentalmente para garantir altas produtividades, corrigir a deficiência de nutrientes no solo e fornecer os elementos necessários para o desenvolvimento vigoroso da planta" },
    // Pre-planting spray (2025-11-11): individual products
    { title: "Aplicação de Quimifol Antiespuma", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "80ml/bomba", observations: "Adjuvante antiespumante para reduz/evita formação de espuma na calda de pulverização. Não é defensivo" },
    { title: "Aplicação de CT-Green", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "2,25L/bomba", observations: "Fertilizante foliar que contém óleo essencial de citronela que possui efeito repelente para insetos, contendo nitrogênio e boro, melhorando a nutrição da planta" },
    { title: "Aplicação de Fipronil 800", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "300g/bomba", observations: "Inseticida / cupinicida (praga — insetos/cupins)" },
    { title: "Aplicação de Roundup transorb", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "45L/bomba", observations: "Herbicida à base de glifosato usado para controlar plantas daninhas de folhas largas e estreitas em diversas culturas e áreas" },
    { title: "Aplicação de Mirant (2,4-D)", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "8L/bomba", observations: "Herbicida (herbicida hormonal / auxínico, para plantas daninhas de folhas largas)" },
    { title: "Aplicação de Cipermetrina", activityType: "spraying" as const, scheduledDate: "2025-11-11", status: "completed" as const, completedDate: "2025-11-11", quantity: "2,25L/bomba", observations: "Inseticida para o controle de pragas, como insetos e ácaros, em diversos ambientes" },
    // Planting and day-after-planting sprays (2025-11-23)
    { title: "Distribuição de Adubo", activityType: "fertilizing" as const, scheduledDate: "2025-11-23", status: "completed" as const, completedDate: "2025-11-23", observations: "Utilizado fundamentalmente para garantir altas produtividades, corrigir a deficiência de nutrientes no solo e fornecer os elementos necessários para o desenvolvimento vigoroso da planta" },
    { title: "Plantio", activityType: "planting" as const, scheduledDate: "2025-11-23", status: "completed" as const, completedDate: "2025-11-23", quantity: "35,8 hect" },
    // Post-planting sprays (2025-11-24)
    { title: "Aplicação de Cletodin/interllect", activityType: "spraying" as const, scheduledDate: "2025-11-24", status: "completed" as const, completedDate: "2025-11-24", quantity: "12L/bomba", observations: "Herbicida seletivo / sistêmico, indicado para controle de plantas daninhas gramíneas" },
    { title: "Aplicação de Flumioxazina", activityType: "spraying" as const, scheduledDate: "2025-11-24", status: "completed" as const, completedDate: "2025-11-24", quantity: "1,5L/bomba", observations: "Herbicida seletivo, de ação residual para controle de plantas daninhas pré ou pós-emergência (inibidor de PROTOX)" },
    { title: "Aplicação de Óleo Mineral (Fertiliza M)", activityType: "spraying" as const, scheduledDate: "2025-11-24", status: "completed" as const, completedDate: "2025-11-24", quantity: "5L/bomba", observations: "Adjuvante para pulverização, serve para melhorar a cobertura, contato e persistência de inseticidas/acaricidas; usado também como agente molhante/penetrante. Não é herbicida nem fungicida." },
    // 2025-11-25
    { title: "Aplicação de Glufosinato", activityType: "spraying" as const, scheduledDate: "2025-11-25", status: "completed" as const, completedDate: "2025-11-25", quantity: "30L/bomba", observations: "Herbicida utilizado na cultura da soja para controle de plantas daninhas de difícil manejo e resistentes ao glifosato" },
    // 2025-11-26
    { title: "Aplicação Hampton", activityType: "spraying" as const, scheduledDate: "2025-11-26", status: "completed" as const, completedDate: "2025-11-26", quantity: "1,2L/bomba", observations: "Herbicida pós-emergente de contato, indicado para o controle de plantas daninhas de folha larga na cultura da soja" },
    // 2025-12-23 spray round
    { title: "Aplicação de Quimifol Antiespuma", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "4ml/ha", observations: "Adjuvante antiespumante para reduz/evita formação de espuma na calda de pulverização. Não é defensivo" },
    { title: "Aplicação de CT-Green", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "150ml/ha", observations: "Fertilizante foliar que contém óleo essencial de citronela que possui efeito repelente para insetos, contendo nitrogênio e boro, melhorando a nutrição da planta" },
    { title: "Aplicação de Roundup transorb", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "3L/ha", observations: "Herbicida à base de glifosato usado para controlar plantas daninhas de folhas largas e estreitas em diversas culturas e áreas" },
    { title: "Aplicação Clorfenapir", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "1L/ha", observations: "Inseticida e acaricida de amplo espectro usado na soja principalmente para controlar lagartas de difícil manejo" },
    // 2025-12-24 spray round
    { title: "Aplicação de Quimifol Antiespuma", activityType: "spraying" as const, scheduledDate: "2025-12-24", status: "completed" as const, completedDate: "2025-12-24", quantity: "80ml/bomba", observations: "Adjuvante antiespumante para reduz/evita formação de espuma na calda de pulverização. Não é defensivo" },
    { title: "Aplicação de CT-Green", activityType: "spraying" as const, scheduledDate: "2025-12-24", status: "completed" as const, completedDate: "2025-12-24", quantity: "2,25L/bomba", observations: "Fertilizante foliar que contém óleo essencial de citronela que possui efeito repelente para insetos, contendo nitrogênio e boro, melhorando a nutrição da planta" },
    { title: "Aplicação de Roundup transorb", activityType: "spraying" as const, scheduledDate: "2025-12-24", status: "completed" as const, completedDate: "2025-12-24", quantity: "45L/bomba", observations: "Herbicida à base de glifosato usado para controlar plantas daninhas de folhas largas e estreitas em diversas culturas e áreas" },
    { title: "Aplicação de Cletodin", activityType: "spraying" as const, scheduledDate: "2025-12-24", status: "completed" as const, completedDate: "2025-12-24", quantity: "10L/bomba", observations: "Herbicida seletivo / sistêmico, indicado para controle de plantas daninhas gramíneas" },
    { title: "Aplicação de Bulldock", activityType: "spraying" as const, scheduledDate: "2025-12-24", status: "completed" as const, completedDate: "2025-12-24", quantity: "1,2L/bomba", observations: "Utilizado para controle de um amplo espectro de pragas, com destaque para lagartas, percevejos e outras pragas sugadoras e mastigadoras" },
    // Foliar sprays
    { title: "Pulverização (Adubação foliar)", activityType: "fertilizing" as const, scheduledDate: "2026-01-08", status: "completed" as const, completedDate: "2026-01-08", quantity: "16 ha", observations: "Utilizado para complementar de manejo, focada em fornecer nutrientes via folha para corrigir deficiências rápidas de micronutrientes (como Manganês, Molibdênio e Cobalto) e estimular o desenvolvimento em momentos críticos, como florescimento e enchimento de grãos, aumentando a produtividade." },
    { title: "Pulverização (Adubação foliar)", activityType: "fertilizing" as const, scheduledDate: "2026-01-09", status: "completed" as const, completedDate: "2026-01-09", quantity: "18 ha" },
    { title: "Pulverização (Adubação foliar)", activityType: "fertilizing" as const, scheduledDate: "2026-01-26", status: "completed" as const, completedDate: "2026-01-26", quantity: "35,8 ha" },
    // Harvest
    { title: "Colheita", activityType: "harvest" as const, scheduledDate: "2026-03-13", status: "planned" as const, quantity: "35,8 ha" },
  ];

  await db
    .insert(schema.activities)
    .values(soyActivities.map((a) => ({ ...a, seasonId: soySeason.id })));

  console.log("Soy activities created:", soyActivities.length);

  // ─── Corn Activities ───────────────────────────────────────────────────
  const cornActivities = [
    { title: "Distribuição de Calcário", activityType: "soil_prep" as const, scheduledDate: "2025-08-21", status: "completed" as const, completedDate: "2025-08-21", observations: "Correção da acidez do solo." },
    { title: "Distribuição de Gesso", activityType: "soil_prep" as const, scheduledDate: "2025-08-19", status: "completed" as const, completedDate: "2025-08-19", observations: "Correção do solo em profundidade." },
    { title: "Distribuição de Adubo", activityType: "fertilizing" as const, scheduledDate: "2025-11-01", status: "completed" as const, completedDate: "2025-11-01" },
    { title: "Aplicação de Quimifol Antiespuma", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "4ml/ha", observations: "Adjuvante antiespumante para reduz/evita formação de espuma na calda de pulverização. Não é defensivo" },
    { title: "Aplicação de CT-Green", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "150ml/ha", observations: "Fertilizante foliar que contém óleo essencial de citronela que possui efeito repelente para insetos, contendo nitrogênio e boro, melhorando a nutrição da planta" },
    { title: "Aplicação de Roundup transorb", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "3L/ha", observations: "Herbicida à base de glifosato usado para controlar plantas daninhas de folhas largas e estreitas em diversas culturas e áreas" },
    { title: "Aplicação Clorfenapir", activityType: "spraying" as const, scheduledDate: "2025-12-23", status: "completed" as const, completedDate: "2025-12-23", quantity: "1L/ha", observations: "Inseticida e acaricida de amplo espectro usado na soja principalmente para controlar lagartas de difícil manejo" },
    { title: "Pulverização (Adubação foliar)", activityType: "fertilizing" as const, scheduledDate: "2026-01-05", status: "completed" as const, completedDate: "2026-01-05", quantity: "3,43 ha", observations: "Utilizado para complementar de manejo, focada em fornecer nutrientes via folha para corrigir deficiências rápidas de micronutrientes (como Manganês, Molibdênio e Cobalto) e estimular o desenvolvimento em momentos críticos, como florescimento e enchimento de grãos, aumentando a produtividade." },
    { title: "Colheita", activityType: "harvest" as const, scheduledDate: undefined, status: "planned" as const, quantity: "3,43 ha" },
  ];

  await db
    .insert(schema.activities)
    .values(cornActivities.map((a) => ({ ...a, seasonId: cornSeason.id })));

  console.log("Corn activities created:", cornActivities.length);

  // ─── Financial Entries 2025 (ALL months) ──────────────────────────────
  const financialEntries2025 = [
    // ─── January 2025 ─────────────────────────────────────────────────────
    { category: "Toim do Lizeu", amount: "236.94", date: "2025-01-05", month: 1, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "105.70", date: "2025-01-08", month: 1, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "3608.29", date: "2025-01-10", month: 1, year: 2025, type: "expense" as const },
    { category: "Casa da Roça", amount: "132.75", date: "2025-01-10", month: 1, year: 2025, type: "expense" as const },
    { category: "João Peão", amount: "1263.00", date: "2025-01-12", month: 1, year: 2025, type: "expense" as const },
    { category: "Meneira", amount: "317.80", date: "2025-01-12", month: 1, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "300.00", date: "2025-01-14", month: 1, year: 2025, type: "expense" as const },
    { category: "Estacionamento", amount: "11.00", date: "2025-01-14", month: 1, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "217.80", date: "2025-01-15", month: 1, year: 2025, type: "expense" as const },
    { category: "Gasolina +2T", amount: "119.80", date: "2025-01-15", month: 1, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "11.60", date: "2025-01-16", month: 1, year: 2025, type: "expense" as const },
    { category: "Presente Fabricio", amount: "82.00", date: "2025-01-18", month: 1, year: 2025, type: "expense" as const },
    { category: "Oleo 2T", amount: "230.00", date: "2025-01-20", month: 1, year: 2025, type: "expense" as const },
    { category: "Internet", amount: "60.00", date: "2025-01-25", month: 1, year: 2025, type: "expense" as const },
    // TOTAL Janeiro 2025: 6696.68

    // ─── February 2025 ────────────────────────────────────────────────────
    { category: "GTA animais p/ Priscila", amount: "18.05", date: "2025-02-03", month: 2, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "358.20", date: "2025-02-05", month: 2, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "286.68", date: "2025-02-06", month: 2, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "300.00", date: "2025-02-07", month: 2, year: 2025, type: "expense" as const },
    { category: "Etanol", amount: "50.00", date: "2025-02-08", month: 2, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "200.00", date: "2025-02-10", month: 2, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "2133.37", date: "2025-02-12", month: 2, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "23.77", date: "2025-02-12", month: 2, year: 2025, type: "expense" as const },
    { category: "Imposto Havana/Bombom", amount: "276.59", date: "2025-02-14", month: 2, year: 2025, type: "expense" as const },
    { category: "GTA", amount: "18.05", date: "2025-02-15", month: 2, year: 2025, type: "expense" as const },
    { category: "Nota Fiscal", amount: "2304.92", date: "2025-02-18", month: 2, year: 2025, type: "expense" as const },
    { category: "Primo do Rangel", amount: "80.00", date: "2025-02-19", month: 2, year: 2025, type: "expense" as const },
    { category: "Eucalipto", amount: "220.00", date: "2025-02-20", month: 2, year: 2025, type: "expense" as const },
    { category: "Madeira p/ curral", amount: "630.00", date: "2025-02-22", month: 2, year: 2025, type: "expense" as const },
    { category: "Asa", amount: "205.00", date: "2025-02-23", month: 2, year: 2025, type: "expense" as const },
    { category: "Star Link", amount: "1360.40", date: "2025-02-25", month: 2, year: 2025, type: "expense" as const },
    // TOTAL Fevereiro 2025: 8465.03

    // ─── March 2025 ───────────────────────────────────────────────────────
    { category: "Cesta básica", amount: "1487.00", date: "2025-03-03", month: 3, year: 2025, type: "expense" as const },
    { category: "Sal do Rangal (R$ 749,00)", amount: "1500.00", date: "2025-03-04", month: 3, year: 2025, type: "expense" as const },
    { category: "Estacionamento", amount: "43.80", date: "2025-03-05", month: 3, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "454.03", date: "2025-03-06", month: 3, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "160.00", date: "2025-03-07", month: 3, year: 2025, type: "expense" as const },
    { category: "Capinha celular", amount: "30.00", date: "2025-03-08", month: 3, year: 2025, type: "expense" as const },
    { category: "Conserto celular", amount: "58.00", date: "2025-03-08", month: 3, year: 2025, type: "expense" as const },
    { category: "Tecido", amount: "312.40", date: "2025-03-10", month: 3, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "100.00", date: "2025-03-10", month: 3, year: 2025, type: "expense" as const },
    { category: "Tela p/ bordar", amount: "80.50", date: "2025-03-11", month: 3, year: 2025, type: "expense" as const },
    { category: "Creme de cabelo", amount: "55.39", date: "2025-03-12", month: 3, year: 2025, type: "expense" as const },
    { category: "Alcool", amount: "20.00", date: "2025-03-12", month: 3, year: 2025, type: "expense" as const },
    { category: "Quatro bois nota fiscal", amount: "20678.08", date: "2025-03-14", month: 3, year: 2025, type: "income" as const },
    { category: "GTA bois", amount: "19.85", date: "2025-03-14", month: 3, year: 2025, type: "expense" as const },
    { category: "GTA cavalo", amount: "18.77", date: "2025-03-15", month: 3, year: 2025, type: "expense" as const },
    { category: "Sete cavalos nota fiscal", amount: "8067.22", date: "2025-03-16", month: 3, year: 2025, type: "income" as const },
    { category: "Agrorural", amount: "2986.37", date: "2025-03-18", month: 3, year: 2025, type: "expense" as const },
    { category: "IPVA S10", amount: "1063.80", date: "2025-03-20", month: 3, year: 2025, type: "expense" as const },
    { category: "Curral madeira Paulo", amount: "350.00", date: "2025-03-22", month: 3, year: 2025, type: "expense" as const },
    { category: "Energia", amount: "430.66", date: "2025-03-24", month: 3, year: 2025, type: "expense" as const },
    { category: "Passas", amount: "14.00", date: "2025-03-24", month: 3, year: 2025, type: "expense" as const },
    { category: "Ferramentas", amount: "220.00", date: "2025-03-25", month: 3, year: 2025, type: "expense" as const },
    { category: "Frios", amount: "38.99", date: "2025-03-26", month: 3, year: 2025, type: "expense" as const },
    { category: "Farmácia", amount: "10.00", date: "2025-03-26", month: 3, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "12.00", date: "2025-03-27", month: 3, year: 2025, type: "expense" as const },
    { category: "Compra", amount: "20.00", date: "2025-03-27", month: 3, year: 2025, type: "expense" as const },
    { category: "Tinta", amount: "42.90", date: "2025-03-28", month: 3, year: 2025, type: "expense" as const },
    { category: "Celular", amount: "749.90", date: "2025-03-29", month: 3, year: 2025, type: "expense" as const },
    // TOTAL SAIDA Março 2025: 10278.36, TOTAL ENTRADA: 28745.30

    // ─── April 2025 ───────────────────────────────────────────────────────
    { category: "Padaria", amount: "19.67", date: "2025-04-02", month: 4, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "2060.54", date: "2025-04-04", month: 4, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "591.36", date: "2025-04-06", month: 4, year: 2025, type: "expense" as const },
    { category: "Compra", amount: "50.00", date: "2025-04-07", month: 4, year: 2025, type: "expense" as const },
    { category: "Ferrajista", amount: "130.00", date: "2025-04-08", month: 4, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "244.62", date: "2025-04-10", month: 4, year: 2025, type: "expense" as const },
    { category: "Tronco curral", amount: "200.00", date: "2025-04-11", month: 4, year: 2025, type: "expense" as const },
    { category: "Roçadeira peças", amount: "300.00", date: "2025-04-12", month: 4, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "258.08", date: "2025-04-14", month: 4, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "500.00", date: "2025-04-15", month: 4, year: 2025, type: "expense" as const },
    { category: "Gasolina + Óleo", amount: "40.00", date: "2025-04-16", month: 4, year: 2025, type: "expense" as const },
    { category: "Peão", amount: "303.60", date: "2025-04-18", month: 4, year: 2025, type: "expense" as const },
    { category: "Peão Samuel", amount: "300.00", date: "2025-04-19", month: 4, year: 2025, type: "expense" as const },
    { category: "Thainara", amount: "100.00", date: "2025-04-20", month: 4, year: 2025, type: "expense" as const },
    { category: "Toim do Lizeu", amount: "260.00", date: "2025-04-22", month: 4, year: 2025, type: "expense" as const },
    { category: "Lanche", amount: "169.00", date: "2025-04-23", month: 4, year: 2025, type: "expense" as const },
    { category: "Acerto com Rangel", amount: "953.20", date: "2025-04-24", month: 4, year: 2025, type: "expense" as const },
    { category: "IPVA", amount: "1063.80", date: "2025-04-25", month: 4, year: 2025, type: "expense" as const },
    { category: "Supermercado (Genilson)", amount: "236.74", date: "2025-04-28", month: 4, year: 2025, type: "expense" as const },
    // TOTAL Abril 2025: 7780.61

    // ─── May 2025 ─────────────────────────────────────────────────────────
    { category: "Cesta básica", amount: "193.27", date: "2025-05-02", month: 5, year: 2025, type: "expense" as const },
    { category: "Mensalidade Starlink", amount: "235.52", date: "2025-05-03", month: 5, year: 2025, type: "expense" as const },
    { category: "Emily Faxina", amount: "80.00", date: "2025-05-05", month: 5, year: 2025, type: "expense" as const },
    { category: "Teclado", amount: "44.09", date: "2025-05-06", month: 5, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "512.16", date: "2025-05-07", month: 5, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "2062.12", date: "2025-05-09", month: 5, year: 2025, type: "expense" as const },
    { category: "Casa da roça", amount: "82.00", date: "2025-05-10", month: 5, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "55.14", date: "2025-05-11", month: 5, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "401.07", date: "2025-05-12", month: 5, year: 2025, type: "expense" as const },
    { category: "Gás", amount: "110.00", date: "2025-05-13", month: 5, year: 2025, type: "expense" as const },
    { category: "IPVA mamãe", amount: "170.19", date: "2025-05-14", month: 5, year: 2025, type: "expense" as const },
    { category: "IPVA carretinha", amount: "234.41", date: "2025-05-15", month: 5, year: 2025, type: "expense" as const },
    { category: "IPVA S10", amount: "354.60", date: "2025-05-16", month: 5, year: 2025, type: "expense" as const },
    { category: "Internet Gilson", amount: "60.00", date: "2025-05-17", month: 5, year: 2025, type: "expense" as const },
    { category: "Biglar", amount: "53.95", date: "2025-05-18", month: 5, year: 2025, type: "expense" as const },
    { category: "Lanche", amount: "139.80", date: "2025-05-19", month: 5, year: 2025, type: "expense" as const },
    { category: "Gasolina + Alcool + 2T", amount: "60.00", date: "2025-05-20", month: 5, year: 2025, type: "expense" as const },
    { category: "Carburador", amount: "116.00", date: "2025-05-22", month: 5, year: 2025, type: "expense" as const },
    { category: "Conserto carro mamãe", amount: "215.00", date: "2025-05-23", month: 5, year: 2025, type: "expense" as const },
    { category: "Celular", amount: "79.72", date: "2025-05-24", month: 5, year: 2025, type: "expense" as const },
    { category: "Exame admissão Genilson", amount: "180.00", date: "2025-05-25", month: 5, year: 2025, type: "expense" as const },
    { category: "Compras Shopping", amount: "85.03", date: "2025-05-26", month: 5, year: 2025, type: "expense" as const },
    { category: "Pizza Hut", amount: "77.80", date: "2025-05-27", month: 5, year: 2025, type: "expense" as const },
    { category: "Bota", amount: "380.00", date: "2025-05-28", month: 5, year: 2025, type: "expense" as const },
    { category: "Energia 068", amount: "1064.58", date: "2025-05-28", month: 5, year: 2025, type: "expense" as const },
    { category: "Energia 068 (maio)", amount: "663.80", date: "2025-05-29", month: 5, year: 2025, type: "expense" as const },
    { category: "Energia (haras)", amount: "610.73", date: "2025-05-29", month: 5, year: 2025, type: "expense" as const },
    { category: "Celular Fax. Xerox", amount: "10.00", date: "2025-05-30", month: 5, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "14.55", date: "2025-05-30", month: 5, year: 2025, type: "expense" as const },
    { category: "Exame admissão", amount: "250.00", date: "2025-05-30", month: 5, year: 2025, type: "expense" as const },
    { category: "Posto", amount: "100.00", date: "2025-05-31", month: 5, year: 2025, type: "expense" as const },
    { category: "Farmácia", amount: "146.00", date: "2025-05-31", month: 5, year: 2025, type: "expense" as const },
    { category: "Colombus", amount: "150.85", date: "2025-05-31", month: 5, year: 2025, type: "expense" as const },
    { category: "Cantinho quente", amount: "36.00", date: "2025-05-31", month: 5, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "100.00", date: "2025-05-31", month: 5, year: 2025, type: "expense" as const },
    // TOTAL Maio 2025: 9605.40 (approximate, based on list)

    // ─── June 2025 ────────────────────────────────────────────────────────
    { category: "Incra", amount: "67.86", date: "2025-06-02", month: 6, year: 2025, type: "expense" as const },
    { category: "FGTS", amount: "70.51", date: "2025-06-03", month: 6, year: 2025, type: "expense" as const },
    { category: "Folha do Genilso (30 dias + 5 dias + folgas)", amount: "2074.60", date: "2025-06-05", month: 6, year: 2025, type: "expense" as const },
    { category: "Energia Fernanda armazém", amount: "72.00", date: "2025-06-06", month: 6, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "993.30", date: "2025-06-08", month: 6, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "420.00", date: "2025-06-10", month: 6, year: 2025, type: "expense" as const },
    { category: "Farmácia (Genilson)", amount: "88.00", date: "2025-06-12", month: 6, year: 2025, type: "expense" as const },
    { category: "Farmácia", amount: "219.98", date: "2025-06-13", month: 6, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "320.49", date: "2025-06-15", month: 6, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "82.40", date: "2025-06-16", month: 6, year: 2025, type: "expense" as const },
    { category: "Restaurante grego", amount: "112.68", date: "2025-06-17", month: 6, year: 2025, type: "expense" as const },
    { category: "Janilton Divino Pires", amount: "43.85", date: "2025-06-18", month: 6, year: 2025, type: "expense" as const },
    { category: "JWH de Azevedo", amount: "15.00", date: "2025-06-19", month: 6, year: 2025, type: "expense" as const },
    { category: "Carisma doce bolo Emile", amount: "95.00", date: "2025-06-20", month: 6, year: 2025, type: "expense" as const },
    { category: "Posto Gasolina + Óleo", amount: "35.00", date: "2025-06-22", month: 6, year: 2025, type: "expense" as const },
    { category: "Ração Sorgo", amount: "696.53", date: "2025-06-24", month: 6, year: 2025, type: "expense" as const },
    { category: "Liliany", amount: "56.00", date: "2025-06-25", month: 6, year: 2025, type: "expense" as const },
    { category: "Gás", amount: "110.00", date: "2025-06-26", month: 6, year: 2025, type: "expense" as const },
    { category: "Bota", amount: "140.00", date: "2025-06-27", month: 6, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "53.59", date: "2025-06-28", month: 6, year: 2025, type: "expense" as const },
    // TOTAL Junho 2025: 5766.79 (approximate)

    // ─── July 2025 ────────────────────────────────────────────────────────
    { category: "Genilson Sal", amount: "1721.15", date: "2025-07-03", month: 7, year: 2025, type: "expense" as const },
    { category: "Viagem 40 dias", amount: "210.00", date: "2025-07-10", month: 7, year: 2025, type: "expense" as const },
    // TOTAL Julho 2025: 1931.15

    // ─── August 2025 ──────────────────────────────────────────────────────
    { category: "LATAM Bagagens", amount: "210.00", date: "2025-08-02", month: 8, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "1019.33", date: "2025-08-05", month: 8, year: 2025, type: "expense" as const },
    { category: "Energia 068", amount: "677.05", date: "2025-08-07", month: 8, year: 2025, type: "expense" as const },
    { category: "Genilson Sal", amount: "1950.00", date: "2025-08-08", month: 8, year: 2025, type: "expense" as const },
    { category: "Cesta básica do Genilson", amount: "190.92", date: "2025-08-10", month: 8, year: 2025, type: "expense" as const },
    { category: "Queijo", amount: "47.52", date: "2025-08-11", month: 8, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "100.00", date: "2025-08-12", month: 8, year: 2025, type: "expense" as const },
    { category: "Lanche", amount: "49.60", date: "2025-08-13", month: 8, year: 2025, type: "expense" as const },
    { category: "Diesel + Gasolina", amount: "120.00", date: "2025-08-14", month: 8, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "71.86", date: "2025-08-15", month: 8, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "54.95", date: "2025-08-16", month: 8, year: 2025, type: "expense" as const },
    { category: "Frios", amount: "12.99", date: "2025-08-17", month: 8, year: 2025, type: "expense" as const },
    { category: "Papelaria", amount: "19.20", date: "2025-08-18", month: 8, year: 2025, type: "expense" as const },
    // TOTAL Agosto 2025: 4523.42 (from spreadsheet total 4870.33 includes Hotel in Bogota with "-")

    // ─── September 2025 ───────────────────────────────────────────────────
    { category: "Diesel", amount: "200.00", date: "2025-09-02", month: 9, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "100.00", date: "2025-09-03", month: 9, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "270.50", date: "2025-09-05", month: 9, year: 2025, type: "expense" as const },
    { category: "Botina Genilson (peão)", amount: "135.00", date: "2025-09-06", month: 9, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "433.67", date: "2025-09-08", month: 9, year: 2025, type: "expense" as const },
    { category: "Estacionamento", amount: "13.00", date: "2025-09-09", month: 9, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "13.25", date: "2025-09-10", month: 9, year: 2025, type: "expense" as const },
    { category: "Impressora (conserto)", amount: "50.00", date: "2025-09-11", month: 9, year: 2025, type: "expense" as const },
    { category: "Resturante", amount: "173.78", date: "2025-09-12", month: 9, year: 2025, type: "expense" as const },
    { category: "Compras", amount: "2.99", date: "2025-09-13", month: 9, year: 2025, type: "expense" as const },
    { category: "Lola", amount: "120.00", date: "2025-09-14", month: 9, year: 2025, type: "expense" as const },
    { category: "Veterinário", amount: "440.00", date: "2025-09-16", month: 9, year: 2025, type: "expense" as const },
    { category: "Eletro", amount: "45.47", date: "2025-09-17", month: 9, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "1371.37", date: "2025-09-18", month: 9, year: 2025, type: "expense" as const },
    { category: "Genilson", amount: "910.80", date: "2025-09-20", month: 9, year: 2025, type: "expense" as const },
    { category: "Gasolina + Diesel", amount: "135.00", date: "2025-09-22", month: 9, year: 2025, type: "expense" as const },
    { category: "IPVA", amount: "617.99", date: "2025-09-24", month: 9, year: 2025, type: "expense" as const },
    { category: "Frete mudança Weberson", amount: "750.00", date: "2025-09-25", month: 9, year: 2025, type: "expense" as const },
    { category: "Vassoura", amount: "14.00", date: "2025-09-26", month: 9, year: 2025, type: "expense" as const },
    { category: "2x cestas básicas", amount: "148.40", date: "2025-09-27", month: 9, year: 2025, type: "expense" as const },
    { category: "Contabilidade", amount: "200.00", date: "2025-09-28", month: 9, year: 2025, type: "expense" as const },
    { category: "INSS", amount: "116.88", date: "2025-09-28", month: 9, year: 2025, type: "expense" as const },
    { category: "Imposto", amount: "841.03", date: "2025-09-29", month: 9, year: 2025, type: "expense" as const },
    { category: "Internet Peão", amount: "60.00", date: "2025-09-29", month: 9, year: 2025, type: "expense" as const },
    { category: "FGTS", amount: "121.44", date: "2025-09-30", month: 9, year: 2025, type: "expense" as const },
    // TOTAL Setembro 2025: 7284.57 (from spreadsheet)

    // ─── October 2025 ─────────────────────────────────────────────────────
    { category: "Agrorural", amount: "1429.40", date: "2025-10-02", month: 10, year: 2025, type: "expense" as const },
    { category: "Padaria", amount: "9.68", date: "2025-10-03", month: 10, year: 2025, type: "expense" as const },
    { category: "Pão", amount: "18.00", date: "2025-10-04", month: 10, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "271.00", date: "2025-10-05", month: 10, year: 2025, type: "expense" as const },
    { category: "Frios", amount: "18.90", date: "2025-10-06", month: 10, year: 2025, type: "expense" as const },
    { category: "Tosa Princesa (pet)", amount: "80.00", date: "2025-10-07", month: 10, year: 2025, type: "expense" as const },
    { category: "Compra", amount: "70.00", date: "2025-10-08", month: 10, year: 2025, type: "expense" as const },
    { category: "Weberson", amount: "728.44", date: "2025-10-10", month: 10, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "125.00", date: "2025-10-12", month: 10, year: 2025, type: "expense" as const },
    { category: "Frutaria", amount: "80.00", date: "2025-10-14", month: 10, year: 2025, type: "expense" as const },
    { category: "Diesel + Óleo motor", amount: "160.00", date: "2025-10-15", month: 10, year: 2025, type: "expense" as const },
    { category: "Frutaria", amount: "80.00", date: "2025-10-16", month: 10, year: 2025, type: "expense" as const },
    { category: "Espetinho", amount: "58.00", date: "2025-10-18", month: 10, year: 2025, type: "expense" as const },
    { category: "Açougue", amount: "28.54", date: "2025-10-19", month: 10, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "215.32", date: "2025-10-20", month: 10, year: 2025, type: "expense" as const },
    { category: "Farmácia", amount: "25.00", date: "2025-10-22", month: 10, year: 2025, type: "expense" as const },
    { category: "Arroz Logeiro (Sorgo)", amount: "100.00", date: "2025-10-23", month: 10, year: 2025, type: "expense" as const },
    { category: "Botina", amount: "58.99", date: "2025-10-24", month: 10, year: 2025, type: "expense" as const },
    { category: "Contabilidade", amount: "270.00", date: "2025-10-25", month: 10, year: 2025, type: "expense" as const },
    { category: "Carrefour", amount: "224.00", date: "2025-10-26", month: 10, year: 2025, type: "expense" as const },
    { category: "Cesta básica", amount: "185.00", date: "2025-10-27", month: 10, year: 2025, type: "expense" as const },
    { category: "INSS", amount: "124.67", date: "2025-10-28", month: 10, year: 2025, type: "expense" as const },
    { category: "Internet Peão", amount: "60.00", date: "2025-10-28", month: 10, year: 2025, type: "expense" as const },
    { category: "FGTS", amount: "129.53", date: "2025-10-29", month: 10, year: 2025, type: "expense" as const },
    { category: "Biglar", amount: "207.23", date: "2025-10-30", month: 10, year: 2025, type: "expense" as const },
    // TOTAL Outubro 2025: 4698.70 (from spreadsheet)

    // ─── November 2025 ────────────────────────────────────────────────────
    { category: "Supermercado", amount: "517.85", date: "2025-11-02", month: 11, year: 2025, type: "expense" as const },
    { category: "Grafite p/ semente", amount: "125.00", date: "2025-11-03", month: 11, year: 2025, type: "expense" as const },
    { category: "Cesta básica", amount: "165.41", date: "2025-11-04", month: 11, year: 2025, type: "expense" as const },
    { category: "Diesel", amount: "235.00", date: "2025-11-05", month: 11, year: 2025, type: "expense" as const },
    { category: "Salário Weberson (peão)", amount: "1500.00", date: "2025-11-06", month: 11, year: 2025, type: "expense" as const },
    { category: "Diesel (Valdeci) para plantar", amount: "1931.61", date: "2025-11-08", month: 11, year: 2025, type: "expense" as const },
    { category: "Cesta básica 1/2", amount: "150.05", date: "2025-11-10", month: 11, year: 2025, type: "expense" as const },
    { category: "Farmácia", amount: "140.00", date: "2025-11-12", month: 11, year: 2025, type: "expense" as const },
    { category: "Vela p/ motor", amount: "17.00", date: "2025-11-13", month: 11, year: 2025, type: "expense" as const },
    { category: "Sacolão", amount: "340.66", date: "2025-11-14", month: 11, year: 2025, type: "expense" as const },
    { category: "INSS", amount: "116.88", date: "2025-11-15", month: 11, year: 2025, type: "expense" as const },
    { category: "FGTS", amount: "121.44", date: "2025-11-16", month: 11, year: 2025, type: "expense" as const },
    { category: "Honorários contador", amount: "200.00", date: "2025-11-18", month: 11, year: 2025, type: "expense" as const },
    { category: "Internet (novembro)", amount: "61.42", date: "2025-11-20", month: 11, year: 2025, type: "expense" as const },
    { category: "Internet (dezembro)", amount: "60.00", date: "2025-11-22", month: 11, year: 2025, type: "expense" as const },
    { category: "Gasolina", amount: "125.00", date: "2025-11-24", month: 11, year: 2025, type: "expense" as const },
    { category: "Diesel (Valdeci)", amount: "22.00", date: "2025-11-25", month: 11, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "1390.08", date: "2025-11-26", month: 11, year: 2025, type: "expense" as const },
    // TOTAL Novembro 2025: 7323.40 (from spreadsheet)

    // ─── December 2025 ────────────────────────────────────────────────────
    { category: "Energia (068)", amount: "1242.24", date: "2025-12-01", month: 12, year: 2025, type: "expense" as const },
    { category: "Energia (3837)", amount: "252.89", date: "2025-12-02", month: 12, year: 2025, type: "expense" as const },
    { category: "Salário Weberson (peão)", amount: "1500.00", date: "2025-12-04", month: 12, year: 2025, type: "expense" as const },
    { category: "Honorários do Contador", amount: "200.00", date: "2025-12-05", month: 12, year: 2025, type: "expense" as const },
    { category: "FGTS", amount: "131.56", date: "2025-12-06", month: 12, year: 2025, type: "expense" as const },
    { category: "INSS", amount: "116.88", date: "2025-12-07", month: 12, year: 2025, type: "expense" as const },
    { category: "13º Salário 2ª parcela", amount: "224.54", date: "2025-12-08", month: 12, year: 2025, type: "expense" as const },
    { category: "INSS 13º Salário", amount: "29.21", date: "2025-12-09", month: 12, year: 2025, type: "expense" as const },
    { category: "Complemento salário Weberson (peão)", amount: "113.85", date: "2025-12-10", month: 12, year: 2025, type: "expense" as const },
    { category: "Supermercado", amount: "907.51", date: "2025-12-12", month: 12, year: 2025, type: "expense" as const },
    { category: "Frutaria", amount: "205.25", date: "2025-12-13", month: 12, year: 2025, type: "expense" as const },
    { category: "Troca de oleo carro mamãe", amount: "200.00", date: "2025-12-14", month: 12, year: 2025, type: "expense" as const },
    { category: "Agrorural", amount: "1585.86", date: "2025-12-16", month: 12, year: 2025, type: "expense" as const },
    { category: "Capa de chuva (peão)", amount: "59.50", date: "2025-12-17", month: 12, year: 2025, type: "expense" as const },
    { category: "Cesta básica 1/2", amount: "150.20", date: "2025-12-18", month: 12, year: 2025, type: "expense" as const },
    { category: "Botina", amount: "125.00", date: "2025-12-19", month: 12, year: 2025, type: "expense" as const },
    { category: "Almoço", amount: "500.00", date: "2025-12-20", month: 12, year: 2025, type: "expense" as const },
    { category: "Óleo diesel", amount: "200.00", date: "2025-12-22", month: 12, year: 2025, type: "expense" as const },
    { category: "Gasolina + Óleo", amount: "35.00", date: "2025-12-23", month: 12, year: 2025, type: "expense" as const },
    { category: "13º Salário 1ª parcela", amount: "126.00", date: "2025-12-24", month: 12, year: 2025, type: "expense" as const },
    // TOTAL Dezembro 2025: 7779.49 (from spreadsheet)
  ];

  // ─── Financial Entries 2026 (ALL entries) ─────────────────────────────
  const financialEntries2026 = [
    // ─── January 2026 (COMPLETE - 24 items, total 8203.92) ──────────────
    { category: "Gasolina", amount: "407.00", date: "2026-01-02", month: 1, year: 2026, type: "expense" as const },
    { category: "Gasolina + Óleo 2T", amount: "37.00", date: "2026-01-03", month: 1, year: 2026, type: "expense" as const },
    { category: "Gás", amount: "120.00", date: "2026-01-04", month: 1, year: 2026, type: "expense" as const },
    { category: "Supermercados", amount: "817.62", date: "2026-01-05", month: 1, year: 2026, type: "expense" as const },
    { category: "Padaria", amount: "38.21", date: "2026-01-06", month: 1, year: 2026, type: "expense" as const },
    { category: "Diesel", amount: "300.00", date: "2026-01-07", month: 1, year: 2026, type: "expense" as const },
    { category: "Conexões (canos e joelhos)", amount: "35.18", date: "2026-01-08", month: 1, year: 2026, type: "expense" as const },
    { category: "Garagem estacionamento", amount: "91.42", date: "2026-01-09", month: 1, year: 2026, type: "expense" as const },
    { category: "Roupas", amount: "902.00", date: "2026-01-10", month: 1, year: 2026, type: "expense" as const },
    { category: "Restaurante", amount: "151.98", date: "2026-01-11", month: 1, year: 2026, type: "expense" as const },
    { category: "Sanduiche", amount: "74.70", date: "2026-01-12", month: 1, year: 2026, type: "expense" as const },
    { category: "Utensílios", amount: "84.97", date: "2026-01-13", month: 1, year: 2026, type: "expense" as const },
    { category: "Exames laboratoriais", amount: "662.00", date: "2026-01-14", month: 1, year: 2026, type: "expense" as const },
    { category: "Almoço", amount: "80.00", date: "2026-01-15", month: 1, year: 2026, type: "expense" as const },
    { category: "Pit Dog", amount: "72.00", date: "2026-01-16", month: 1, year: 2026, type: "expense" as const },
    { category: "Lanche", amount: "14.00", date: "2026-01-17", month: 1, year: 2026, type: "expense" as const },
    { category: "Agrorural", amount: "1715.17", date: "2026-01-18", month: 1, year: 2026, type: "expense" as const },
    { category: "Energia (068)", amount: "1122.98", date: "2026-01-19", month: 1, year: 2026, type: "expense" as const },
    { category: "Energia (837)", amount: "205.19", date: "2026-01-20", month: 1, year: 2026, type: "expense" as const },
    { category: "Mudas de uva", amount: "153.60", date: "2026-01-21", month: 1, year: 2026, type: "expense" as const },
    { category: "Exames no CRD", amount: "570.00", date: "2026-01-22", month: 1, year: 2026, type: "expense" as const },
    { category: "Diesel p/ valdeci", amount: "499.90", date: "2026-01-23", month: 1, year: 2026, type: "expense" as const },
    { category: "Peça p/ roçadeira", amount: "30.00", date: "2026-01-24", month: 1, year: 2026, type: "expense" as const },
    { category: "Sacolão", amount: "19.00", date: "2026-01-25", month: 1, year: 2026, type: "expense" as const },
    // TOTAL Janeiro 2026: 8203.92

    // ─── February 2026 (COMPLETE - 14 items, total 4557.56) ─────────────
    { category: "Gasolina", amount: "202.80", date: "2026-02-02", month: 2, year: 2026, type: "expense" as const },
    { category: "Supermercados", amount: "320.18", date: "2026-02-03", month: 2, year: 2026, type: "expense" as const },
    { category: "Dobradiças", amount: "7.30", date: "2026-02-04", month: 2, year: 2026, type: "expense" as const },
    { category: "Agrorural", amount: "1189.41", date: "2026-02-05", month: 2, year: 2026, type: "expense" as const },
    { category: "Padaria", amount: "57.50", date: "2026-02-06", month: 2, year: 2026, type: "expense" as const },
    { category: "Gasolina + Óleo", amount: "70.00", date: "2026-02-07", month: 2, year: 2026, type: "expense" as const },
    { category: "Gás", amount: "120.00", date: "2026-02-08", month: 2, year: 2026, type: "expense" as const },
    { category: "Estacionamento", amount: "15.00", date: "2026-02-09", month: 2, year: 2026, type: "expense" as const },
    { category: "Lanche", amount: "63.82", date: "2026-02-10", month: 2, year: 2026, type: "expense" as const },
    { category: "Diesel (Valdeci)", amount: "566.89", date: "2026-02-11", month: 2, year: 2026, type: "expense" as const },
    { category: "Diesel", amount: "100.00", date: "2026-02-12", month: 2, year: 2026, type: "expense" as const },
    { category: "Cesta básica", amount: "169.69", date: "2026-02-15", month: 2, year: 2026, type: "expense" as const },
    { category: "Salário Peão", amount: "1566.97", date: "2026-02-20", month: 2, year: 2026, type: "expense" as const },
    { category: "Weberson", amount: "108.00", date: "2026-02-25", month: 2, year: 2026, type: "expense" as const },
    // TOTAL Fevereiro 2026: 4557.56
  ];

  const allFinancialEntries = [...financialEntries2025, ...financialEntries2026];

  await db
    .insert(schema.financialEntries)
    .values(allFinancialEntries.map((e) => ({ ...e, farmId: farm.id })));

  console.log("Financial entries created:", allFinancialEntries.length);

  // ─── Consulting Visits ─────────────────────────────────────────────────
  const visits = [
    {
      visitDate: "2025-09-01",
      activities: "- Análise das áreas de plantio\n- Documentações de orçamentos previamente realizados na Loja Pontual\n- Levantamento geral de custos previstos com Serviços (mão de obra)\n- Preenchimento de planilhas e revisão de dados",
    },
    {
      visitDate: "2025-10-25",
      activities: "- Levantamento de dados pré-plantio\n- Conferência de custos de insumos\n- Análise contratual (Cargil)\n- Preenchimento de planilhas e revisão de dados",
    },
    {
      visitDate: "2025-11-29",
      activities: "- Conferência de Laudo do Agrônomo\n- Verificação de áreas pulverizadas e parte do plantio\n- Conferência de custos com insumos e serviços\n- Planejamento prévio para plantio do milho",
    },
    {
      visitDate: "2025-12-13",
      activities: "- Conferência de todas os hectares de plantio (Soja e Milho)\n- Análise de áreas que a aplicação dos herbicidas e fertilizantes não foram suficientes\n- Revisão geral de todos os produtos e serviços\n- Fechamento geral de investimento da safra\n- Fechamento financeiro pessoal dona Christina 2025\n- Avaliação de conformidade do contrato bancário com a Cresol\n- Análise da declaração de inexigibilidade de licenciamento ambiental",
    },
    {
      visitDate: "2026-01-31",
      activities: "- Início de controle financeiro pessoal dona Christina 2026\n- Conferência de todas os hectares de plantio (Soja e Milho)\n- Análise de áreas que a aplicação dos herbicidas e fertilizantes aplicados recentemente\n- Revisão geral de todos os produtos e serviços\n- Análise das áreas de plantio e crescimento das bages da Soja\n- Análise das áreas de plantio do Milho\n- Revisão de serviços de mão de obra (Valdeci)",
    },
  ];

  await db
    .insert(schema.consultingVisits)
    .values(
      visits.map((v) => ({
        ...v,
        farmId: farm.id,
        consultantId: consultant.id,
      }))
    );

  console.log("Consulting visits created:", visits.length);

  // ─── Yield Assessment (Main - Fazenda Primavera) ──────────────────────
  // From Comparativo sheet general data: Area 32ha, price R$168/saca, 1.5% loss, 30 sacas/ha cost
  await db.insert(schema.yieldAssessments).values({
    seasonId: soySeason.id,
    cultivarName: "Fazenda Primavera",
    weight1000GrainsKg: "0.2000",
    rowSpacingM: "0.50",
    plantsPerLinearM: "12.00",
    plantPopulationHa: 240000,
    pods1Grain: 4,
    pods2Grains: 8,
    pods3Grains: 6,
    pods4Grains: 2,
    pods5Grains: 0,
    avgPodsPerPlant: "20.00",
    avgGrainsPerPod: "2.3000",
    avgGrainsPerPlant: 46,
    grainsPerM2: 1104,
    gramsPerPlant: "9.2000",
    kgPerHa: "2208.00",
    sacksPerHa: "36.80",
    estimatedLossPct: "10.00",
    pricePerSack: "128.00",
    productionCostSacks: "40.00",
  });

  console.log("Main yield assessment created (Fazenda Primavera)");

  // ─── Yield Assessment (Lote A - Comparativo) ─────────────────────────
  // From Comparativo sheet: Lote A
  // PMG: 0.21kg, spacing: 0.5m, 12.5 plants/m, pop: 250000
  // Pods: 1grain=5, 2grains=7, 3grains=19, 4grains=4, 5grains=0
  // Avg pods/plant: 35, grains/pod: 2.6286, grains/plant: 92
  // grains/m2: 2300, grams/plant: 19.32
  // kg/ha: 4830, sacas/ha: 80.5
  // Loss: 1.5%, price: R$168/saca, cost: 30 sacas/ha
  await db.insert(schema.yieldAssessments).values({
    seasonId: soySeason.id,
    cultivarName: "Lote A",
    weight1000GrainsKg: "0.2100",
    rowSpacingM: "0.50",
    plantsPerLinearM: "12.50",
    plantPopulationHa: 250000,
    pods1Grain: 5,
    pods2Grains: 7,
    pods3Grains: 19,
    pods4Grains: 4,
    pods5Grains: 0,
    avgPodsPerPlant: "35.00",
    avgGrainsPerPod: "2.6286",
    avgGrainsPerPlant: 92,
    grainsPerM2: 2300,
    gramsPerPlant: "19.3200",
    kgPerHa: "4830.00",
    sacksPerHa: "80.50",
    estimatedLossPct: "1.50",
    pricePerSack: "168.00",
    productionCostSacks: "30.00",
    notes: "Comparativo - Lote A. Bruto R$/ha: 13321.14, Líquido R$/ha: 8281.14. Perdas colheita: 1.2075 sc/ha (R$202.86/ha).",
  });

  console.log("Yield assessment created (Lote A)");

  // ─── Yield Assessment (Lote B - Comparativo) ─────────────────────────
  // From Comparativo sheet: Lote B
  // PMG: 0.205kg, spacing: 0.5m, 12.5 plants/m, pop: 250000
  // Pods: 1grain=5, 2grains=7, 3grains=19, 4grains=4, 5grains=0
  // Avg pods/plant: 35, grains/pod: 2.6286, grains/plant: 92
  // grains/m2: 2300, grams/plant: 18.86
  // kg/ha: 4715, sacas/ha: 78.58
  // Loss: 1.5%, price: R$168/saca, cost: 30 sacas/ha
  await db.insert(schema.yieldAssessments).values({
    seasonId: soySeason.id,
    cultivarName: "Lote B",
    weight1000GrainsKg: "0.2050",
    rowSpacingM: "0.50",
    plantsPerLinearM: "12.50",
    plantPopulationHa: 250000,
    pods1Grain: 5,
    pods2Grains: 7,
    pods3Grains: 19,
    pods4Grains: 4,
    pods5Grains: 0,
    avgPodsPerPlant: "35.00",
    avgGrainsPerPod: "2.6286",
    avgGrainsPerPlant: 92,
    grainsPerM2: 2300,
    gramsPerPlant: "18.8600",
    kgPerHa: "4715.00",
    sacksPerHa: "78.58",
    estimatedLossPct: "1.50",
    pricePerSack: "168.00",
    productionCostSacks: "30.00",
    notes: "Comparativo - Lote B. Bruto R$/ha: 13003.97, Líquido R$/ha: 7963.97. Perdas colheita: 1.17875 sc/ha (R$198.03/ha).",
  });

  console.log("Yield assessment created (Lote B)");

  // ─── Advances (Soy - 5 advances to Valdeci) ──────────────────────────
  await db.insert(schema.advances).values([
    {
      seasonId: soySeason.id,
      recipient: "Valdeci",
      product: "Oleo diesel S500",
      quantity: "327,92 Litros",
      value: "2381.43",
    },
    {
      seasonId: soySeason.id,
      recipient: "Valdeci",
      product: "Grafite para semente",
      quantity: "5 Kg",
      value: "56.00",
    },
    {
      seasonId: soySeason.id,
      recipient: "Valdeci",
      product: "Eixo bal rold",
      quantity: "1",
      value: "15.00",
    },
    {
      seasonId: soySeason.id,
      recipient: "Valdeci",
      product: "Clorfenapir",
      quantity: "2,5 Litros",
      notes: "Valor pendente de confirmação",
    },
    {
      seasonId: soySeason.id,
      recipient: "Valdeci",
      product: "Peça para pulverizador",
      quantity: "1",
      value: "30.00",
    },
  ]);

  console.log("Soy advances to Valdeci created: 5");

  // ─── Advances (Corn - 2 advances to Valdeci) ─────────────────────────
  await db.insert(schema.advances).values([
    {
      seasonId: cornSeason.id,
      recipient: "Valdeci",
      product: "Saco de semente do milho morgan",
      quantity: "1/2",
    },
    {
      seasonId: cornSeason.id,
      recipient: "Valdeci",
      product: "Adubo para plantio do milho",
      quantity: "552 Kg",
      value: "2107.21",
    },
  ]);

  console.log("Corn advances to Valdeci created: 2");

  // ─── Loans (2 loans from Cresol) ─────────────────────────────────────
  await db.insert(schema.loans).values([
    {
      farmId: farm.id,
      description: "Empréstimo para custeio da soja",
      bank: "Cresol",
      totalAmount: "145035.35",
      amountPayable: "145035.35",
      status: "active",
      notes: "Pagamento não efetuado. Parte do total de empréstimo R$166.493,80.",
    },
    {
      farmId: farm.id,
      description: "Empréstimo para custeio do calcário + gesso",
      bank: "Cresol",
      totalAmount: "31339.75",
      amountPayable: "31339.75",
      status: "active",
      notes: "Pagamento não efetuado. Parte do total de empréstimo R$166.493,80. Valor total a pagar: R$176.375,10.",
    },
  ]);

  console.log("Loans from Cresol created: 2");

  console.log("Seed completed successfully!");

  await sql.end();
}

seed().catch(console.error);
