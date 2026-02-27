"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
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

function formatNumber(value: number, decimals = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Parse a string that may use comma as decimal separator */
function parseBrNumber(raw: string): number {
  // Replace comma with dot for parsing
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

interface NumberInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  prefix?: string;
  suffix?: string;
}

function NumberInput({ id, label, value, onChange, step, prefix, suffix }: NumberInputProps) {
  const [raw, setRaw] = useState(formatNumber(value, step < 1 ? 2 : 1));
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback(
    (text: string) => {
      setRaw(text);
      const parsed = parseBrNumber(text);
      if (parsed >= 0) onChange(parsed);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    setRaw(formatNumber(value, step < 1 ? 2 : 1));
  }, [value, step]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    // Show raw number with comma for editing
    setRaw(value.toFixed(step < 1 ? 2 : 1).replace(".", ","));
  }, [value, step]);

  const increment = useCallback(() => {
    const newVal = Math.round((value + step) * 100) / 100;
    onChange(newVal);
    setRaw(formatNumber(newVal, step < 1 ? 2 : 1));
  }, [value, step, onChange]);

  const decrement = useCallback(() => {
    const newVal = Math.max(0, Math.round((value - step) * 100) / 100);
    onChange(newVal);
    setRaw(formatNumber(newVal, step < 1 ? 2 : 1));
  }, [value, step, onChange]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={decrement}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${prefix ? "pl-8" : ""} ${suffix ? "pr-12" : ""}`}
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={increment}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function FinancialCalculator({
  totalProductionCost,
  totalAreaSoy,
}: FinancialCalculatorProps) {
  const [pricePerSack, setPricePerSack] = useState(110);
  const [productivitySacks, setProductivitySacks] = useState(60);
  const [areaHa, setAreaHa] = useState(totalAreaSoy);

  const costPerHa = totalAreaSoy > 0 ? totalProductionCost / totalAreaSoy : 0;
  const costInSacksPerHa = pricePerSack > 0 ? costPerHa / pricePerSack : 0;
  const grossRevenuePerHa = productivitySacks * pricePerSack;
  const netRevenuePerHa = grossRevenuePerHa - costPerHa;
  const netRevenueTotal = netRevenuePerHa * areaHa;
  const breakEvenSacks = pricePerSack > 0 ? costPerHa / pricePerSack : 0;

  const scenarios = [
    { productivity: 25, label: "Pessimista" },
    { productivity: 35, label: "Conservador" },
    { productivity: productivitySacks, label: "Estimado" },
    { productivity: 65, label: "Otimista" },
    { productivity: 75, label: "Excelente" },
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
          <NumberInput
            id="price"
            label="Preço da Saca"
            value={pricePerSack}
            onChange={setPricePerSack}
            step={5}
            prefix="R$"
          />
          <NumberInput
            id="productivity"
            label="Produtividade"
            value={productivitySacks}
            onChange={setProductivitySacks}
            step={1}
            suffix="sc/ha"
          />
          <NumberInput
            id="area"
            label="Área"
            value={areaHa}
            onChange={setAreaHa}
            step={1}
            suffix="ha"
          />
        </div>

        {/* Summary */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3 min-w-0">
            <p className="text-xs text-muted-foreground">Custo/ha</p>
            <p className="text-base sm:text-lg font-bold truncate">{formatCurrency(costPerHa)}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(costInSacksPerHa)} sc/ha
            </p>
          </div>
          <div className="rounded-lg border p-3 min-w-0">
            <p className="text-xs text-muted-foreground">Equilíbrio</p>
            <p className="text-base sm:text-lg font-bold truncate">
              {formatNumber(breakEvenSacks)} sc/ha
            </p>
            <p className="text-xs text-muted-foreground">
              Mínimo p/ cobrir custos
            </p>
          </div>
          <div className="rounded-lg border p-3 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Resultado/ha</p>
              {netRevenuePerHa >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <p
              className={`text-base sm:text-lg font-bold truncate ${
                netRevenuePerHa >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netRevenuePerHa)}
            </p>
          </div>
          <div className="rounded-lg border p-3 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Resultado Total</p>
              {netRevenueTotal >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
            <p
              className={`text-base sm:text-lg font-bold truncate ${
                netRevenueTotal >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netRevenueTotal)}
            </p>
          </div>
        </div>

        {/* Scenario Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Cenário</TableHead>
                <TableHead className="text-right whitespace-nowrap">sc/ha</TableHead>
                <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Receita Bruta</TableHead>
                <TableHead className="text-right whitespace-nowrap">Result./ha</TableHead>
                <TableHead className="text-right whitespace-nowrap">Result. Total</TableHead>
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
                    <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{s.label}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">
                      {formatNumber(s.productivity)}
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">
                      {formatCurrency(gross * areaHa)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium text-xs sm:text-sm ${
                        net >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(net)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium text-xs sm:text-sm ${
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
