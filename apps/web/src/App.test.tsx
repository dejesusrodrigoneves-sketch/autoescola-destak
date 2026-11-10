import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renderiza a identificacao do projeto", () => {
    render(<App />);

    expect(screen.getByText(/Autoescola Destak/i)).toBeInTheDocument();
  });

  it("renderiza o titulo provisorio da fase 0", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
