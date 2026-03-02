"use client";

import { ExportButton } from "@/components/export-button";

interface FinanceiroExportProps {
  entries: Array<{
    category: string;
    description: string | null;
    amount: string;
    date: string;
    type: string;
  }>;
  year: number;
}

export function FinanceiroExport({ entries, year }: FinanceiroExportProps) {
  const data = entries.map((e) => ({
    tipo: e.type === "expense" ? "Despesa" : "Receita",
    categoria: e.category,
    descricao: e.description ?? "",
    valor: e.amount,
    data: new Date(e.date).toLocaleDateString("pt-BR"),
  }));

  return (
    <ExportButton
      data={data}
      filename={`financeiro-${year}`}
      columns={[
        { key: "tipo", label: "Tipo" },
        { key: "categoria", label: "Categoria" },
        { key: "descricao", label: "Descrição" },
        { key: "valor", label: "Valor (R$)" },
        { key: "data", label: "Data" },
      ]}
    />
  );
}
