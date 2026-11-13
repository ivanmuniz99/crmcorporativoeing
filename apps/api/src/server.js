import app from './app.js';

const port = Number(process.env.API_PORT || 3001);

// En Vercel no se ejecuta listen (el runtime serverless usa el export default).
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`API Corporativo EING escuchando en http://localhost:${port}`);
  });
}
