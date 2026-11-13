/**
 * Balance de cargas del API.
 * - apiLimiter: límite general por IP para todas las rutas /api.
 * - authLimiter: límite estricto para endpoints de autenticación.
 * Las claves son IP + usuario cuando hay sesión, para repartir la carga
 * de forma justa entre usuarios internos.
 */
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Espera un minuto.' }
});
