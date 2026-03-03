export const APP_NAME = "Fazenda Digital";
export const FARM_NAME = "Fazenda Primavera";

interface NavItem {
  title: string;
  href: string;
  icon: "LayoutDashboard" | "Wheat" | "DollarSign" | "ClipboardList" | "Map" | "Bot" | "Settings" | "Brain" | "CloudRain" | "HandCoins" | "HardHat" | "TrendingUp" | "Target" | "Tractor" | "ListChecks";
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Painel", href: "/", icon: "LayoutDashboard" },
  { title: "Safras", href: "/safras", icon: "Wheat" },
  { title: "Financeiro", href: "/financeiro", icon: "DollarSign", ownerOnly: true },
  { title: "Análises IA", href: "/analises", icon: "Brain" },
  { title: "Consultoria", href: "/consultoria", icon: "ClipboardList" },
  { title: "Talhões", href: "/talhoes", icon: "Map" },
  { title: "Chuvas", href: "/chuvas", icon: "CloudRain" },
  { title: "Trabalhadores", href: "/trabalhadores", icon: "HardHat", ownerOnly: true },
  { title: "Máquinas", href: "/maquinas", icon: "Tractor" },
  { title: "Atividades", href: "/atividades", icon: "ListChecks" },
  { title: "Mercado", href: "/mercado", icon: "TrendingUp" },
  { title: "Planejamento", href: "/planejamento", icon: "Target" },
  { title: "Adiantamentos", href: "/adiantamentos", icon: "HandCoins", ownerOnly: true },
  { title: "Agente IA", href: "/agente", icon: "Bot" },
  { title: "Configurações", href: "/configuracoes", icon: "Settings" },
];

export const CROP_TYPE_LABELS: Record<string, string> = {
  soy: "Soja",
  corn: "Milho",
  other: "Outro",
};

export const SEASON_STATUS_LABELS: Record<string, string> = {
  planning: "Planejamento",
  active: "Ativa",
  harvested: "Colhida",
  closed: "Encerrada",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  partial: "Parcial",
};

export const INPUT_CATEGORY_LABELS: Record<string, string> = {
  seed: "Semente",
  fertilizer: "Adubo/Fertilizante",
  herbicide: "Herbicida",
  insecticide: "Inseticida",
  fungicide: "Fungicida",
  adjuvant: "Adjuvante",
  other: "Outro",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  soil_prep: "Preparo do Solo",
  planting: "Plantio",
  spraying: "Pulverização",
  fertilizing: "Adubação",
  harvest: "Colheita",
  other: "Outro",
};

export const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  soil_prep: "border-l-amber-500",
  planting: "border-l-green-500",
  spraying: "border-l-red-500",
  fertilizing: "border-l-blue-500",
  harvest: "border-l-yellow-500",
  other: "border-l-gray-400",
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const MACHINE_TYPE_LABELS: Record<string, string> = {
  trator: "Trator",
  pulverizador: "Pulverizador",
  colheitadeira: "Colheitadeira",
  plantadeira: "Plantadeira",
  distribuidor: "Distribuidor",
  caminhao: "Caminhão",
  outro: "Outro",
};

export const MACHINE_OWNERSHIP_LABELS: Record<string, string> = {
  owned: "Própria",
  rented: "Alugada",
};

export const CROP_WATER_NEEDS: Record<
  string,
  { minMm: number; maxMm: number; cycleDays: number; peakStage: string }
> = {
  soy: {
    minMm: 450,
    maxMm: 800,
    cycleDays: 120,
    peakStage: "Floração e enchimento (R1-R5)",
  },
  corn: {
    minMm: 400,
    maxMm: 600,
    cycleDays: 130,
    peakStage: "Pendoamento e enchimento (VT-R3)",
  },
};
