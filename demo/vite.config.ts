import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function sceneSavePlugin() {
  return {
    name: 'scene-save',
    configureServer(server: any) {
      server.middlewares.use('/api/save-scene', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const filePath = path.resolve(__dirname, 'public/scene.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            console.log('[scene-save] Written to', filePath);
          } catch (e: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [sceneSavePlugin()],
});
