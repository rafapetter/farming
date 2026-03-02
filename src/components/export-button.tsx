"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface ExportButtonProps {
  data: Array<Record<string, string | number | null>>;
  filename: string;
  columns: Array<{ key: string; label: string }>;
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const exportCsv = () => {
    const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
    const rows = data.map((row) =>
      columns.map((c) => escapeCsvValue(row[c.key])).join(",")
    );
    downloadFile([header, ...rows].join("\n"), `${filename}.csv`, "text/csv");
  };

  const exportTxt = () => {
    const lines = data.map((row) =>
      columns.map((c) => `${c.label}: ${row[c.key] ?? "—"}`).join(" | ")
    );
    const header = `Relatório: ${filename}\nData: ${new Date().toLocaleDateString("pt-BR")}\n${"=".repeat(60)}\n`;
    downloadFile(header + lines.join("\n"), `${filename}.txt`, "text/plain");
  };

  if (data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportCsv}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTxt}>
          <FileText className="mr-2 h-4 w-4" />
          Texto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
