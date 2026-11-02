import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkCode } from "../lib/verify";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  try {
    const result = await checkCode(
      String(req.body?.email ?? ""),
      String(req.body?.code ?? "")
    );
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not verify that PIN." });
  }
}
