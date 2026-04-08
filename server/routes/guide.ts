import { Router } from "express";

const router = Router();

// Default slides (local paths served from client build)
const DEFAULT_SLIDES = [
  "/guide-1.jpg",
  "/guide-2.jpg",
  "/guide-3.jpg",
  "/guide-4.jpg",
];

const slides = (() => {
  const env = process.env.GUIDE_SLIDES;
  return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_SLIDES;
})();

router.get("/slides", (_req, res) => {
  res.json({ slides });
});

export default router;
