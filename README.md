# Tattoo Art Salas Carlos

Plataforma local para recepcion de solicitudes, revision manual, confirmacion por deposito, comprobantes, consentimiento digital y portafolio del tatuador.

## Como abrir

1. Ejecuta `start.bat`.
2. Abre `http://localhost:3000`.

## Publicacion gratis con Render

Render puede publicar esta app Node en plan gratis y entrega un subdominio `onrender.com`.

Pasos:

1. Sube esta carpeta a un repositorio de GitHub.
2. En Render, elige `New > Blueprint`.
3. Conecta el repositorio.
4. Render detectara `render.yaml` y creara el servicio.
5. Al terminar, Render mostrara una URL similar a `https://tattoo-art-salas-carlos.onrender.com`.

Limitacion importante del plan gratis: los archivos guardados localmente y el JSON de `data/` pueden perderse cuando el servicio se reinicia o se redeploya. Para produccion real hay que conectar base de datos y almacenamiento externo.

## Fotos del portafolio

Coloca las fotos reales en `outputs/assets/portfolio/`.

Nombres recomendados:

- `realismo.jpg`
- `tradicional.jpg`
- `black-and-grey.jpg`
- `color.jpg`
- `anime.jpg`
- `fineline.jpg`
- `blackwork.jpg`
- `blackout.jpg`
- `realismo-a-color.jpg`
- `surrealismo.jpg`
- `puntillismo.jpg`
- `microrealismo.jpg`
- `freehand.jpg`
- `coverup.jpg`

Fotos del tatuador y estudio:

- `outputs/assets/artist/carlos-01.jpg`
- `outputs/assets/artist/estudio-01.jpg`

El cargador tambien acepta variantes como `.jpeg`, `.png`, `.webp`, mayusculas y algunos nombres sin guiones.

## Datos guardados

El servidor crea `data/db.json` con solicitudes y estados. Los archivos subidos se guardan en `data/uploads/`.

## Pendiente para produccion publica

Para operar en internet con clientes reales hace falta conectar:

- Dominio y hosting.
- Login privado para el tatuador.
- Base de datos administrada, por ejemplo Supabase o PostgreSQL.
- Almacenamiento seguro de archivos.
- WhatsApp Business API, Twilio o proveedor equivalente.
- Politica legal de privacidad, consentimiento informado y cancelaciones.
