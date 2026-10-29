/* MIT License. Copyright (c) 2025 Christian I. Cabrera || XianFire Framework.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions: The above copyright notice and this
 * permission notice shall be included in all copies or substantial portions of
 * the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
 * EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { sequelize, User } from "./models/userModel.js";
import { Reservation, ReservationSettings } from "./models/reservationModel.js";
import { DEFAULT_SETTINGS } from "./services/reservationRules.js";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET)
  throw new Error("JWT_SECRET is required in production.");
if (process.env.TRUST_PROXY)
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
app.use(
  cors(
    process.env.FRONTEND_URL
      ? { origin: process.env.FRONTEND_URL.split(",").map((url) => url.trim()) }
      : {},
  ),
);
app.use(express.json({ limit: "32kb" }));

// Create reservation tables and the existing staff table; legacy POS data is untouched.
await sequelize.authenticate();
await User.sync();
await ReservationSettings.sync();
await Reservation.sync();
let initialSettings = { ...DEFAULT_SETTINGS };
const tables = await sequelize.getQueryInterface().showAllTables();
if (tables.includes("business_hours")) {
  const [hours] = await sequelize.query(
    "SELECT openTime, closeTime FROM business_hours ORDER BY id LIMIT 1",
  );
  if (hours[0] && hours[0].openTime < hours[0].closeTime)
    initialSettings = {
      ...initialSettings,
      openTime: hours[0].openTime.slice(0, 5),
      closeTime: hours[0].closeTime.slice(0, 5),
    };
}
await ReservationSettings.findOrCreate({
  where: { id: 1 },
  defaults: initialSettings,
});
if (
  process.env.ADMIN_EMAIL &&
  process.env.ADMIN_PASSWORD &&
  (await User.count({ where: { role: "admin" } })) === 0
) {
  if (process.env.ADMIN_PASSWORD.length < 12)
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  await User.create({
    name: "Japz Manager",
    email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: "admin",
    status: "approved",
  });
}
app.use("/", router);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res
    .status(error.status || 500)
    .json({
      error:
        error.status === 400
          ? "Send a valid JSON request."
          : "Unable to process this request.",
    });
});
export default app;
if (!process.env.ELECTRON) {
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`🔥 XianFire running at http://localhost:${PORT}`),
  );
}
