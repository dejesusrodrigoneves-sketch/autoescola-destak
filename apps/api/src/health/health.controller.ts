import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  status: "ok";
  db: "ok" | "skip";
  uptimeSeconds: number;
}

@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: "ok",
      // Na fase 0 ainda nao existe conexao de banco na API.
      // A fase 2 troca "skip" por um SELECT 1 e devolve 503 quando falhar.
      db: "skip",
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
