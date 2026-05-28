const request = require('supertest');
const { app, resetContacts } = require('../src/app');

// Reinicia el estado antes de cada test para evitar dependencias entre tests
beforeEach(() => {
  resetContacts();
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE A — Validación de email con regex
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque A — Validación de email con regex (POST /api/contacts)', () => {
  test('devuelve 400 cuando el email es "@" (sin usuario ni dominio)', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: '@' });
    expect(res.status).toBe(400);
  });

  test('devuelve 400 cuando el email es "usuario@" (sin dominio)', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: 'usuario@' });
    expect(res.status).toBe(400);
  });

  test('devuelve 400 cuando el email es "@dominio.com" (sin usuario)', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: '@dominio.com' });
    expect(res.status).toBe(400);
  });

  test('devuelve 400 cuando el email es "sin-arroba"', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: 'sin-arroba' });
    expect(res.status).toBe(400);
  });

  test('devuelve 201 cuando el email tiene formato válido "usuario@dominio.com"', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Nuevo', email: 'usuario@dominio.com' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('usuario@dominio.com');
  });

  test('el mensaje de error de email contiene la palabra "email"', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE B — Detección de email duplicado (409 Conflict)
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque B — Detección de email duplicado (POST /api/contacts)', () => {
  test('crear un contacto con un email ya existente devuelve 409', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Copia de Ana', email: 'ana@example.com' });
    expect(res.status).toBe(409);
  });

  test('el body del 409 tiene el campo error con un mensaje descriptivo', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Copia', email: 'ana@example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  test('crear con email en mayúsculas cuando ya existe en minúsculas devuelve 409 (case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Duplicado', email: 'ANA@EXAMPLE.COM' });
    expect(res.status).toBe(409);
  });

  test('después de un 409 el número total de contactos no aumentó', async () => {
    // Intentar crear duplicado
    await request(app)
      .post('/api/contacts')
      .send({ name: 'Copia', email: 'ana@example.com' });

    // Verificar que siguen siendo 3
    const listRes = await request(app).get('/api/contacts');
    expect(listRes.body).toHaveLength(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE C — Búsqueda y filtros en GET /api/contacts
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque C — Búsqueda y filtros (?search= y ?favorite=true)', () => {
  test('?search=ana devuelve solo contactos cuyo nombre o email contiene "ana"', async () => {
    const res = await request(app).get('/api/contacts?search=ana');
    expect(res.status).toBe(200);
    // Ana García tiene "ana" en el nombre y "ana" en el email
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach(c => {
      const match =
        c.name.toLowerCase().includes('ana') ||
        c.email.toLowerCase().includes('ana');
      expect(match).toBe(true);
    });
  });

  test('?search=ANA (mayúsculas) devuelve los mismos resultados que ?search=ana (case-insensitive)', async () => {
    const lower = await request(app).get('/api/contacts?search=ana');
    const upper = await request(app).get('/api/contacts?search=ANA');
    expect(upper.body).toEqual(lower.body);
  });

  test('?search=example filtra por email y devuelve todos los que tienen @example.com', async () => {
    const res = await request(app).get('/api/contacts?search=example');
    expect(res.status).toBe(200);
    // Los 3 contactos de seed tienen @example.com
    expect(res.body).toHaveLength(3);
  });

  test('?search=xyznoexiste devuelve un array vacío (no un 404)', async () => {
    const res = await request(app).get('/api/contacts?search=xyznoexiste');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('?favorite=true devuelve solo contactos con favorite: true', async () => {
    const res = await request(app).get('/api/contacts?favorite=true');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach(c => expect(c.favorite).toBe(true));
  });

  test('?favorite=true devuelve un array vacío si ninguno es favorito', async () => {
    // Desmarcar a Luis (el único favorito del seed)
    await request(app).patch('/api/contacts/2/favorite');

    const res = await request(app).get('/api/contacts?favorite=true');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('sin query params devuelve todos los contactos (sin regresión)', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE D — Toggle de favorito (PATCH /api/contacts/:id/favorite)
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque D — Toggle de favorito (PATCH /api/contacts/:id/favorite)', () => {
  test('PATCH en Ana (favorite: false) devuelve el contacto con favorite: true', async () => {
    const res = await request(app).patch('/api/contacts/1/favorite');
    expect(res.status).toBe(200);
    expect(res.body.favorite).toBe(true);
  });

  test('llamarlo dos veces regresa a favorite: false (toggle completo false→true→false)', async () => {
    await request(app).patch('/api/contacts/1/favorite'); // false → true
    const res = await request(app).patch('/api/contacts/1/favorite'); // true → false
    expect(res.status).toBe(200);
    expect(res.body.favorite).toBe(false);
  });

  test('PATCH en Luis (favorite: true) devuelve el contacto con favorite: false', async () => {
    const res = await request(app).patch('/api/contacts/2/favorite');
    expect(res.status).toBe(200);
    expect(res.body.favorite).toBe(false);
  });

  test('devuelve 404 para un ID inexistente', async () => {
    const res = await request(app).patch('/api/contacts/9999/favorite');
    expect(res.status).toBe(404);
  });

  test('después del toggle, GET /:id refleja el cambio persistido en memoria', async () => {
    // Hacemos el toggle
    await request(app).patch('/api/contacts/1/favorite');

    // Verificamos con un GET independiente
    const getRes = await request(app).get('/api/contacts/1');
    expect(getRes.status).toBe(200);
    expect(getRes.body.favorite).toBe(true); // Ana era false, ahora debe ser true
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE E — PUT mejorado con validación de email y deduplicación
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque E — PUT mejorado (PUT /api/contacts/:id)', () => {
  test('actualizar solo el name devuelve 200 con el nombre cambiado', async () => {
    const res = await request(app)
      .put('/api/contacts/1')
      .send({ name: 'Ana García Actualizada' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ana García Actualizada');
    // El email no debe haber cambiado
    expect(res.body.email).toBe('ana@example.com');
  });

  test('intentar actualizar con un email de formato inválido devuelve 400', async () => {
    const res = await request(app)
      .put('/api/contacts/1')
      .send({ email: 'no-es-un-email' });
    expect(res.status).toBe(400);
  });

  test('intentar actualizar con el email de otro contacto existente devuelve 409', async () => {
    // Intentar poner el email de Luis en Ana
    const res = await request(app)
      .put('/api/contacts/1')
      .send({ email: 'luis@example.com' });
    expect(res.status).toBe(409);
  });

  test('actualizar con el mismo email del propio contacto devuelve 200 (no es duplicado externo)', async () => {
    // Ana actualiza su propio email sin cambiarlo
    const res = await request(app)
      .put('/api/contacts/1')
      .send({ email: 'ana@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@example.com');
  });

  test('actualizar un ID inexistente devuelve 404', async () => {
    const res = await request(app)
      .put('/api/contacts/9999')
      .send({ name: 'Nadie' });
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE F — Middleware de error: rutas inexistentes y formato uniforme
// ══════════════════════════════════════════════════════════════════════════════

describe('Bloque F — Middleware de error y formato uniforme', () => {
  test('GET /api/ruta-que-no-existe devuelve 404 con Content-Type: application/json', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('la respuesta del 404 genérico tiene el campo error en el body (no HTML)', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    // Verificamos que no es HTML
    expect(typeof res.body.error).toBe('string');
  });

  test('errores 400 incluyen campo status con el código HTTP correspondiente', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', email: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe(400);
  });

  test('errores 404 incluyen campo status con el código HTTP correspondiente', async () => {
    const res = await request(app).get('/api/contacts/9999');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });

  test('errores 409 incluyen campo status con el código HTTP correspondiente', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Copia', email: 'ana@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.status).toBe(409);
  });
});