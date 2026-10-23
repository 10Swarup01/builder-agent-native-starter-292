import { DEMO_FORECAST } from "@/lib/mock-data";

import { demoLatency } from "./demo";

// TODO: Connect AI waste forecasting backend — return model predictions instead of demo values.
export async function getForecast() {
  await demoLatency();
  return DEMO_FORECAST;
}
