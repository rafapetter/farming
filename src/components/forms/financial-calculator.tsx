"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FinancialCalculatorProps {
  totalProductionCost: number;
  totalAreaSoy: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FinancialCalculator({
  totalProductionCost,
  totalAreaSoy,
}: FinancialCalculatorProps) {
  const [pricePerSack, setPricePerSack] = useState(128);
  const [productivitySacks, setProductivitySacks] = useState(36.8);
  const [areaHa, setAreaHa] = useState(totalAreaSoy);

  const costPerHa = totalAreaSoy > 0 ? totalProductionCost / totalAreaSoy : 0;
  const costInSacksPerHa = pricePerSack > 0 ? costPerHa / pricePerSack : 0;
  const grossRevenuePerHa = productivitySacks * pricePerSack;
  const netRevenuePerHa = grossRevenuePerHa - costPerHa;
  const grossRevenueTotal = grossRevenuePerHa * areaHa;
  const netRevenueTotal = netRevenuePerHa * areaHa;
  const breakEvenSacks = pricePerSack > 0 ? costPerHa / pricePerSack : 0;

  const scenarios = [
    { productivity: 25, label: "Pessimista" },
    { productivity: 30, label: "Conservador" },
    { productivity: productivitySacks, label: "Estimado" },
    { productivity: 40, label: "Otimista" },
    { productivity: 50, label: "Excelente" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Calculadora Financeira</CardTitle>
        </div>
        <CardDescription>
          Simule cenários de produtividade, preço e receita
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price">Preço da Saca (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={pricePerSack}
              onChange={(e) => setPricePerSack(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productivity">Produtividade (sc/ha)</Label>
            <Input
              id="productivity"
              type="number"
              step="0.1"
              value={productivitySacks}
              onChange={(e) =>
                setProductivitySacks(parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Área (ha)</Label>
            <Input
              id="area"
              type="number"
              step="0.01"
              value={areaHa}
              onChange={(e) => setAreaHa(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Custo/ha</p>
            <p className="text-lg font-bold">{formatCurrency(costPerHa)}</p>
            <p className="text-xs text-muted-foreground">
              {costInSacksPerHa.toFixed(1)} sc/ha
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Ponto de Equilíbrio</p>
            <p className="text-lg font-bold">
              {breakEvenSacks.toFixed(1)} sc/ha
            </p>
            <p className="text-xs text-muted-foreground">
              Produtividade mínima
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Resultado/ha</p>
              {netRevenuePerHa >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <p
              className={`text-lg font-bold ${
                netRevenuePerHa >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netRevenuePerHa)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Resultado Total</p>
              {netRevenueTotal >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <p
              className={`text-lg font-bold ${
                netRevenueTotal >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netRevenueTotal)}
            </p>
          </div>
        </div>

        {/* Scenario Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cenário</TableHead>
                <TableHead className="text-right">sc/ha</TableHead>
                <TableHead className="text-right">Receita Bruta</TableHead>
                <TableHead className="text-right">Resultado/ha</TableHead>
                <TableHead className="text-right">Resultado Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => {
                const gross = s.productivity * pricePerSack;
                const net = gross - costPerHa;
                const totalNet = net * areaHa;
                return (
                  <TableRow
                    key={s.label}
                    className={
                      s.productivity === productivitySacks ? "bg-muted/50" : ""
                    }
                  >
                    <TableCell className="font-medium">{s.label}</TableCell>
                    <TableCell className="text-right">
                      {s.productivity.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(gross * areaHa)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        net >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(net)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        totalNet >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(totalNet)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
