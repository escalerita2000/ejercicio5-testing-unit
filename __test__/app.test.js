const request = require("supertest");
const { app, resetData } = require("../src/app");

beforeEach(() => {
  resetData();
});

describe("API Contacts", () => {
  test("GET /api/contacts devuelve 200 y array", async () => {
    const res = await request(app).get("/api/contacts");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/contacts/:id devuelve contacto correcto", async () => {
    const create = await request(app)
      .post("/api/contacts")
      .send({
        name: "Juan",
        email: "juan@test.com",
      });

    const id = create.body.id;

    const res = await request(app).get(`/api/contacts/${id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Juan");
  });

  test("GET /api/contacts/:id devuelve 404 para ID inexistente", async () => {
    const res = await request(app).get("/api/contacts/999");

    expect(res.statusCode).toBe(404);
  });

  test("POST /api/contacts crea contacto y devuelve 201", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .send({
        name: "Ana",
        email: "ana@test.com",
        phone: "123456",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe("Ana");
    expect(res.body.email).toBe("ana@test.com");
  });

  test("POST /api/contacts devuelve 400 si falta name", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .send({
        email: "test@test.com",
      });

    expect(res.statusCode).toBe(400);
  });

  test("POST /api/contacts devuelve 400 si email no tiene @", async () => {
    const res = await request(app)
      .post("/api/contacts")
      .send({
        name: "Pedro",
        email: "pedrotest.com",
      });

    expect(res.statusCode).toBe(400);
  });

  test("PUT /api/contacts/:id actualiza contacto", async () => {
    const create = await request(app)
      .post("/api/contacts")
      .send({
        name: "Luis",
        email: "luis@test.com",
      });

    const id = create.body.id;

    const res = await request(app)
      .put(`/api/contacts/${id}`)
      .send({
        name: "Luis Actualizado",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Luis Actualizado");
  });

  test("DELETE /api/contacts/:id elimina contacto", async () => {
    const create = await request(app)
      .post("/api/contacts")
      .send({
        name: "Mario",
        email: "mario@test.com",
      });

    const id = create.body.id;

    const res = await request(app).delete(`/api/contacts/${id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Contacto eliminado");
  });

  test("DELETE /api/contacts/:id devuelve 404 para ID inexistente", async () => {
    const res = await request(app).delete("/api/contacts/999");

    expect(res.statusCode).toBe(404);
  });
});