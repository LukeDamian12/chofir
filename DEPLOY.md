# SoFirMoLo — versión corregida v5

Incluye:
- cursor normal del navegador;
- pantalla inicial "Bienvenido" solo en la primera visita y "Cargando" en navegaciones posteriores;
- miniaturas reales de YouTube;
- obtención automática de miniaturas reales de Odysee mediante Lighthouse + CDN de Odysee;
- obtención automática de miniaturas reales de BitChute mediante su API;
- respaldo visual local si una plataforma no responde;
- carruseles/autoscroll y orden por fecha corregidos.

## Build

```bash
npm install
npm run build
```

El build intenta actualizar `_data/platform-thumbnails.json`. Si una plataforma no responde, el deploy no se interrumpe.

## Deploy

Reemplazar los archivos del repositorio y ejecutar:

```bash
git add .
git commit -m "Miniaturas reales Odysee y BitChute"
git push origin main
```
