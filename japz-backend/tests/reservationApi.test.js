import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Opt-in integration suite: creates and removes its own isolated MySQL database.
// It never modifies the configured application's tables or existing accounts.
test(
  "reservation API with real MySQL, including concurrent capacity checks",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async (t) => {
    const { Sequelize } = await import("sequelize");
    const { sequelize } = await import("../models/db.js");
    const testDatabase = `japz_reservation_test_${Date.now()}_${process.pid}`;
    assert.match(testDatabase, /^japz_reservation_test_\d+_\d+$/);
    await sequelize.query(`CREATE DATABASE \`${testDatabase}\``);
    const connection = {
      ...sequelize.options,
      host: sequelize.config.host,
      port: sequelize.config.port,
      dialect: "mysql",
      logging: false,
    };
    const testConnection = new Sequelize(
      testDatabase,
      sequelize.config.username,
      sequelize.config.password,
      connection,
    );
    let server;
    try {
      // Models are defined against the shared instance; point its connection pool at the isolated schema.
      await sequelize.close();
      sequelize.config.database = testDatabase;
      sequelize.options.database = testDatabase;
      // Use a fresh connection manager, retaining the model registry on the shared instance.
      sequelize.connectionManager = testConnection.connectionManager;
      const { Reservation, ReservationSettings } =
        await import("../models/reservationModel.js");
      const { User } = await import("../models/userModel.js");
      const { DEFAULT_SETTINGS, localDate } =
        await import("../services/reservationRules.js");
      await sequelize.sync();
      await ReservationSettings.create({
        ...DEFAULT_SETTINGS,
        capacity: 4,
        maxPartySize: 4,
      });
      const bcrypt = (await import("bcrypt")).default;
      await User.create({
        name: "Integration Manager",
        email: "manager@example.test",
        password: await bcrypt.hash("TestPassword123!", 4),
        role: "admin",
        status: "approved",
      });
      await User.create({
        name: "Former Cashier",
        email: "cashier@example.test",
        password: await bcrypt.hash("TestPassword123!", 4),
        role: "cashier",
        status: "approved",
      });
      const express = (await import("express")).default;
      const app = express();
      app.use(express.json());
      app.use((await import("../routes/index.js")).default);
      server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
      });
      const url = `http://127.0.0.1:${server.address().port}`;
      const call = async (path, body, method = "POST", token) => {
        const response = await fetch(url + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: response.status, data: await response.json() };
      };
      const tomorrow = new Date(`${localDate()}T00:00:00Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const data = {
        name: "Test Guest",
        email: "guest@example.test",
        phone: "09123456789",
        date: tomorrow.toISOString().slice(0, 10),
        time: "12:00",
        guests: 4,
        occasion: "Just dining",
        notes: "",
        requestKey: randomUUID(),
      };
      let reservation, token;
      await t.test(
        "guest booking is durable, pending, and excludes internal request key",
        async () => {
          const response = await call("/api/reservations", data);
          assert.equal(response.status, 201);
          reservation = response.data.reservation;
          assert.equal(reservation.status, "pending");
          assert.equal(reservation.requestKey, undefined);
          assert.equal(await Reservation.count(), 1);
        },
      );
      await t.test(
        "duplicate network retries create only one booking",
        async () => {
          assert.equal((await call("/api/reservations", data)).status, 200);
          assert.equal(await Reservation.count(), 1);
        },
      );
      await t.test("overlapping bookings cannot exceed capacity", async () => {
        assert.equal(
          (
            await call("/api/reservations", {
              ...data,
              time: "12:30",
              requestKey: randomUUID(),
            })
          ).status,
          409,
        );
      });
      await t.test(
        "lookup requires both correct reference and email",
        async () => {
          assert.equal(
            (
              await call("/api/reservations/lookup", {
                reference: reservation.reference,
                email: "wrong@example.test",
              })
            ).status,
            404,
          );
          assert.equal(
            (
              await call("/api/reservations/lookup", {
                reference: reservation.reference,
                email: data.email,
              })
            ).status,
            200,
          );
        },
      );
      await t.test(
        "guest availability excludes the current reservation",
        async () => {
          const response = await call("/api/reservations/guest-availability", {
            ...data,
            reference: reservation.reference,
          });
          assert.equal(response.status, 200);
          assert.equal(
            response.data.slots.find((slot) => slot.time === "12:00").available,
            true,
          );
        },
      );
      await t.test(
        "guest can reschedule and cancel; cancelled seats become available",
        async () => {
          assert.equal(
            (
              await call(
                `/api/reservations/${reservation.reference}`,
                { ...data, time: "13:00" },
                "PATCH",
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await call(`/api/reservations/${reservation.reference}/cancel`, {
                email: data.email,
              })
            ).status,
            200,
          );
        },
      );
      await t.test(
        "simultaneous requests for the last seats allow exactly one booking",
        async () => {
          const responses = await Promise.all(
            Array.from({ length: 6 }, () =>
              call("/api/reservations", { ...data, requestKey: randomUUID() }),
            ),
          );
          assert.equal(
            responses.filter((response) => response.status === 201).length,
            1,
          );
          assert.equal(
            responses.filter((response) => response.status === 409).length,
            5,
          );
          reservation = responses.find((response) => response.status === 201)
            .data.reservation;
        },
      );
      await t.test(
        "management requires a live, approved admin account",
        async () => {
          assert.equal(
            (await call("/api/admin/reservations", null, "GET")).status,
            401,
          );
          assert.equal(
            (
              await call("/api/auth/login", {
                email: "cashier@example.test",
                password: "TestPassword123!",
              })
            ).status,
            403,
          );
          const response = await call("/api/auth/login", {
            email: "manager@example.test",
            password: "TestPassword123!",
          });
          assert.equal(response.status, 200);
          token = response.data.token;
          assert.equal(
            (
              await call(
                `/api/admin/reservations?date=${data.date}`,
                null,
                "GET",
                token,
              )
            ).status,
            200,
          );
        },
      );
      await t.test("admin confirmation and transition validation", async () => {
        assert.equal(
          (
            await call(
              `/api/admin/reservations/${reservation.id}/status`,
              { status: "confirmed" },
              "PATCH",
              token,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              `/api/admin/reservations/${reservation.id}/status`,
              { status: "completed" },
              "PATCH",
              token,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              `/api/admin/reservations/${reservation.id}/status`,
              { status: "no_show" },
              "PATCH",
              token,
            )
          ).status,
          400,
        );
      });
      await t.test(
        "capacity settings cannot displace existing guests",
        async () => {
          assert.equal(
            (
              await call(
                "/api/admin/reservation-settings",
                { ...DEFAULT_SETTINGS, capacity: 2, maxPartySize: 2 },
                "PUT",
                token,
              )
            ).status,
            400,
          );
        },
      );
      await t.test(
        "legacy POS and registration endpoints are removed",
        async () => {
          for (const path of [
            "/api/orders",
            "/api/menu-items",
            "/api/sales/summary",
            "/api/auth/register",
          ])
            assert.equal((await call(path, {}, "POST")).status, 404);
        },
      );
      if (process.env.RUN_BROWSER_TESTS === "1") {
        await t.test("desktop and mobile browser flow", async () => {
          const { browserFlow } = await import("./browserFlow.js");
          await browserFlow({ apiUrl: url, date: data.date });
        });
      }
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await testConnection.close();
      const cleanup = new Sequelize({
        ...connection,
        database: undefined,
        username: sequelize.config.username,
        password: sequelize.config.password,
      });
      try {
        await cleanup.query(`DROP DATABASE \`${testDatabase}\``);
      } finally {
        await cleanup.close();
      }
    }
  },
);
