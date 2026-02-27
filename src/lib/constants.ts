export const APP_NAME = "Fazenda Digital";
export const FARM_NAME = "Fazenda Primavera";

interface NavItem {
  title: string;
  href: string;
  icon: "LayoutDashboard" | "Wheat" | "DollarSign" | "ClipboardList" | "Map" | "Bot" | "Settings" | "Brain";
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Painel", href: "/", icon: "LayoutDashboard" },
  { title: "Safras", href: "/safras", icon: "Wheat" },
  { title: "Financeiro", href: "/financeiro", icon: "DollarSign", ownerOnly: true },
  { title: "Análises IA", href: "/analises", icon: "Brain" },
  { title: "Consultoria", href: "/consultoria", icon: "ClipboardList" },
  { title: "Talhões", href: "/talhoes", icon: "Map" },
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

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};
