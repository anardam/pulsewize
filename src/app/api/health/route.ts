import { NextResponse } from "next/server";
import { checkClaudeCli } from "@/lib/claude-cli";
import { HealthCheckResponse } from "@/lib/types";

export async function GET() {
  const isVercel = !!process.env.VERCEL;
  const hasServerKey = !!process.env.OPENROUTER_API_KEY;

  // On Vercel, CLI won't exist — report environment info instead
  if (isVercel) {
    const response: HealthCheckResponse = {
      status: hasServerKey ? "ok" : "error",
      cliInstalled: false,
      cliAuthenticated: false,
      isVercel: true,
      hasServerApiKey: hasServerKey,
      message: hasServerKey
        ? "Running on Vercel with OpenRouter configured"
        : "Running on Vercel — an OpenRouter API key is required",
    };
    return NextResponse.json(response, {
      status: hasServerKey ? 200 : 503,
    });
  }

  // Local: check CLI
  const result = await checkClaudeCli();

  const response: HealthCheckResponse = {
    status: result.installed && result.authenticated ? "ok" : "error",
    cliInstalled: result.installed,
    cliAuthenticated: result.authenticated,
    isVercel: false,
    hasServerApiKey: hasServerKey,
    message:
      hasServerKey
        ? "OpenRouter server key is configured"
        : result.installed && result.authenticated
          ? "Claude Code CLI is ready"
          : result.error || "No OpenRouter key configured and Claude Code CLI is not ready",
  };

  return NextResponse.json(response, {
    status: response.status === "ok" ? 200 : 503,
  });
}
