import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

process.env.HF_API_TOKEN = "hf_test_token_123";
process.env.API_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";
