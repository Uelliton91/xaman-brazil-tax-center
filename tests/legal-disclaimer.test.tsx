/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalDisclaimer } from "@/components/legal-disclaimer";

describe("LegalDisclaimer", () => {
  test("renders disclaimer text", () => {
    render(<LegalDisclaimer />);

    expect(screen.getByText(/não é sistema oficial de entrega/i)).toBeInTheDocument();
  });
});

