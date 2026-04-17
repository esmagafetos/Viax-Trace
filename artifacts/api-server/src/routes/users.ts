import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, usersTable, userSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { UpdateProfileBody, UpdatePasswordBody, UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return userId;
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

function formatSettings(s: any) {
  return {
    parserMode: s.parserMode,
    aiProvider: s.aiProvider ?? null,
    aiApiKey: s.aiApiKey ?? null,
    toleranceMeters: s.toleranceMeters,
    instanceMode: s.instanceMode ?? "builtin",
    googleMapsApiKey: s.googleMapsApiKey ?? null,
    valorPorRota: s.valorPorRota ?? null,
    cicloPagamentoDias: s.cicloPagamentoDias ?? 30,
    metaMensalRotas: s.metaMensalRotas ?? null,
    despesasFixasMensais: s.despesasFixasMensais ?? null,
  };
}

router.patch("/users/profile", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId)).returning();
  logger.debug({ userId, fields: Object.keys(updateData) }, "Profile updated");
  res.json(formatUser(user));
});

router.post("/users/avatar", avatarUpload.single("avatar"), async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado." });
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({ error: "Formato inválido. Use JPG, PNG, WEBP ou GIF." });
    return;
  }

  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

  const [user] = await db.update(usersTable).set({ avatarUrl: dataUrl }).where(eq(usersTable.id, userId)).returning();
  logger.debug({ userId, size: req.file.size }, "Avatar uploaded");
  res.json(formatUser(user));
});

router.patch("/users/password", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdatePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Senha atual incorreta." });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));
  logger.info({ userId }, "Password changed");
  res.json({ message: "Senha alterada com sucesso." });
});

router.get("/users/settings", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  let [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  if (!settings) {
    const [created] = await db.insert(userSettingsTable).values({
      userId, parserMode: "builtin", toleranceMeters: 300, instanceMode: "builtin", cicloPagamentoDias: 30,
    }).returning();
    settings = created;
  }
  res.json(formatSettings(settings));
});

router.patch("/users/settings", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data as any;
  const updateData: Record<string, unknown> = {};
  if (d.parserMode !== undefined) updateData.parserMode = d.parserMode;
  if (d.aiProvider !== undefined) updateData.aiProvider = d.aiProvider;
  if (d.aiApiKey !== undefined) updateData.aiApiKey = d.aiApiKey;
  if (d.toleranceMeters !== undefined) updateData.toleranceMeters = d.toleranceMeters;
  if (d.instanceMode !== undefined) updateData.instanceMode = d.instanceMode;
  if (d.googleMapsApiKey !== undefined) updateData.googleMapsApiKey = d.googleMapsApiKey;
  if (d.valorPorRota !== undefined) updateData.valorPorRota = d.valorPorRota;
  if (d.cicloPagamentoDias !== undefined) updateData.cicloPagamentoDias = d.cicloPagamentoDias;
  if (d.metaMensalRotas !== undefined) updateData.metaMensalRotas = d.metaMensalRotas;
  if (d.despesasFixasMensais !== undefined) updateData.despesasFixasMensais = d.despesasFixasMensais;

  let [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  if (!settings) {
    const [created] = await db.insert(userSettingsTable).values({
      userId, parserMode: "builtin", toleranceMeters: 300, instanceMode: "builtin", cicloPagamentoDias: 30, ...updateData,
    }).returning();
    settings = created;
  } else {
    const [updated] = await db.update(userSettingsTable).set(updateData).where(eq(userSettingsTable.userId, userId)).returning();
    settings = updated;
  }

  logger.debug({ userId, fields: Object.keys(updateData) }, "Settings updated");
  res.json(formatSettings(settings));
});

export default router;
