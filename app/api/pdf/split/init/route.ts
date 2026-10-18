import { handleCapabilities, handleInit } from "@/lib/pdf-split/server";
import { getServerDeps } from "@/lib/pdf-split/server-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1 of the server fallback: reserve a signed upload slot in private storage. */
export async function POST(req: Request) {
  return handleInit(req, getServerDeps());
}

/** Capability probe: is the server fallback configured on this deployment? */
export async function GET() {
  return handleCapabilities(getServerDeps());
}