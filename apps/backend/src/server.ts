import { build } from './app.js';

const app = build();
const port = Number(process.env.PORT ?? 3000);

await app.listen({ port, host: '0.0.0.0' });
process.stdout.write(`selleros-backend :${port}\n`);
