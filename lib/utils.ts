import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBrl(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "R$ --";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "--";
  }

  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 8
  }).format(num);
}

export function toISODate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

export function yearFromDate(input: Date | string): number {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.getUTCFullYear();
}

