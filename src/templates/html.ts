import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const layoutHtml = existsSync(join(__dirname, 'views/layout.html'))
  ? readFileSync(join(__dirname, 'views/layout.html'), 'utf-8')
  : `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant POS</title>
  <link rel="stylesheet" href="/styles/global.css">
</head>
<body>
  {{ content }}
</body>
</html>`;

export function htmlResponse(content: string) {
  const html = layoutHtml.replace('{{ content }}', content);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
