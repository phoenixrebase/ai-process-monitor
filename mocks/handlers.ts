import { http, HttpResponse } from "msw";

export const handlers = [
  http.post(
    process.env.API_URL!,
    () => {
      return HttpResponse.json({
        labels: ["complies", "deviates", "unclear"],
        scores: [0.9, 0.05, 0.05],
        sequence: "test sequence",
      });
    }
  ),
];
