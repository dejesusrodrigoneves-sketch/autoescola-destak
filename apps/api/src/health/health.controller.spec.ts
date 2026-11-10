import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("devolve status ok e banco ignorado na fase 0", () => {
    const controller = new HealthController();
    const response = controller.check();

    expect(response.status).toBe("ok");
    expect(response.db).toBe("skip");
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
