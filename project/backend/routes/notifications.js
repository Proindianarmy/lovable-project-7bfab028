import { Router } from "express";
import { getNotifications, markRead, markAllRead } from "../controllers/notificationsController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllRead);
router.put("/:id/read", protect, markRead);

export default router;
