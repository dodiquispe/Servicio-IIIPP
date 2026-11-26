# Desplegar IIIPP

## 1. Preparación

Instala Node.js 24 y npm. Para respaldos instala las utilidades de PostgreSQL de la misma versión que el servidor de origen, o una posterior compatible. Necesitarás acceso al repositorio privado de GitHub y permisos sobre el proyecto de Vercel y el proveedor de PostgreSQL.

Usa tres destinos independientes. Desarrollo usa tu PostgreSQL local. Preview usa una base vacía y datos ficticios. Production usa una base dedicada con acceso restringido. Copia las variables desde el proveedor y pégalas en tu terminal o en el panel del servicio correspondiente.

| Variable | Dónde va | Uso y ejemplo ficticio |
|---|---|---|
| `NODE_ENV` | Backend desplegado | `production`, también para Preview. |
| `PORT` | Backend | La plataforma lo asigna. Para una prueba local, `3100`. |
| `DATABASE_URL` | Backend | PostgreSQL con pool, por ejemplo `postgresql://usuario@pool.example.invalid/iiipp`. |
| `DB_SSL` | Backend y herramientas | `true` para PostgreSQL remoto con TLS. `false` únicamente para PostgreSQL local o en la red privada del Compose. Con URL se activa por defecto. |
| `DB_POOL_MAX` | Backend | Conexiones máximas por instancia. Ejemplo `3`. |
| `JWT_SECRET` | Backend | Valor aleatorio exclusivo del entorno, de al menos 32 bytes. Genera el tuyo en un gestor de contraseñas. |
| `CORS_ORIGINS` | Backend | Orígenes exactos sin barra final, separados por comas, por ejemplo `https://iiipp.example.invalid`. |
| `GRAPHQL_DEV_TOOLS` | Backend | `false` en Preview y Production. |
| `PAGO_SIMULADO_MONTO` | Backend, opcional | Importe del flujo simulado, por ejemplo `0.00`. |
| `DATABASE_URL_DIRECT` | Terminal para migrar y sembrar | URL directa, por ejemplo `postgresql://usuario@db.example.invalid/iiipp`. |
| `ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_USUARIO` | Terminal para el seed | Nombre, correo y usuario de la primera cuenta. Ejemplos `Administración IIIPP`, `admin@example.invalid`, `admin.iiipp`. |
| `ADMIN_PASSWORD_TEMPORAL` | Terminal para el seed | Genera una contraseña aleatoria de al menos 24 caracteres en tu gestor. Cámbiala en el primer ingreso y elimina la variable de la sesión de terminal. |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Desarrollo local | Compatibilidad con la configuración existente de Docker. Ejemplo de host `127.0.0.1`, puerto `5432`, base `iiipp_dev`. |
| `DB_SYNCHRONIZE`, `FRONTEND_ORIGIN` | Desarrollo local | `false` para operar solo con migraciones. Origen local de respaldo cuando `CORS_ORIGINS` está ausente, por ejemplo `http://127.0.0.1:3001`. |
| `NUXT_PUBLIC_API_URL` | Frontend | URL completa del endpoint GraphQL. Ejemplo `https://api.example.invalid/graphql`. En desarrollo puedes usar `http://127.0.0.1:3000/graphql` en tu entorno. |

## 2. Subir a GitHub

Crea un repositorio privado. Revisa `git status` y el diff antes del commit. Sube `frontend/`, `ser-back/`, archivos de configuración, migraciones, este documento, los lockfiles y los `.env.example`. Conserva los `.env*` reales, respaldos y credenciales fuera de Git. Los directorios `node_modules`, `dist`, `.nuxt`, `.output` y `.vercel` se generan localmente o durante el build. En GitHub, la pantalla **Code** debe mostrar las dos carpetas en la raíz. Añade tu remoto y sube tu rama con `git push -u origin nombre-de-tu-rama`.

## 3. Crear PostgreSQL y preparar el esquema

En Vercel, abre **Marketplace**, selecciona un proveedor como Neon o Supabase y crea bases separadas para Preview y Production. En el panel del proveedor busca **Connect** o **Connection strings**. La conexión agrupada va a `DATABASE_URL` del backend. La directa va a `DATABASE_URL_DIRECT` de tu terminal. Si el proveedor ofrece varios modos de pool, usa el que admita transacciones.

Confirma en el panel el proyecto, rama y base de destino antes de cada ejecución. Para una base preexistente, saca un respaldo y prueba sobre una copia primero. La migración inicial reconoce instalaciones anteriores por la tabla `seguridad.persona`; un esquema parcial requiere inspección previa. La vista `serviciosiiipp.v_agenda_semanal` se crea mediante las migraciones incrementales incluidas.

En PowerShell, carga la URL directa y la contraseña temporal sin que se vean al pegarlas. Define los otros datos de tu administrador en la misma terminal.

```powershell
$env:DATABASE_URL_DIRECT = [pscredential]::new('url', (Read-Host 'URL directa' -AsSecureString)).GetNetworkCredential().Password
$env:DB_SSL = 'true'
$env:ADMIN_NOMBRE = Read-Host 'Nombre del administrador'
$env:ADMIN_CORREO = Read-Host 'Correo del administrador'
$env:ADMIN_USUARIO = Read-Host 'Nombre de usuario'
$env:ADMIN_PASSWORD_TEMPORAL = [pscredential]::new('admin', (Read-Host 'Contraseña temporal' -AsSecureString)).GetNetworkCredential().Password
```

Desde `ser-back`:

```sh
npm ci
npm run build
npm run migration:run:prod
npm run seed:prod
```

La migración de servicios crea la vista `serviciosiiipp.v_servicios_con_responsable`. Ejecuta `npm run migration:run:prod` con la conexión directa de Preview antes de desplegar su backend. La misma migración se aplica a producción después de la aprobación y del respaldo.

Haz primero el recorrido completo en Preview. El comando de producción lee únicamente `DATABASE_URL_DIRECT` para conectarse. El seed agrega los catálogos de arranque y crea el administrador si aún no existe uno activo. La segunda ejecución conserva la cuenta. Entra por `/auth/login`, cambia la contraseña desde tu cuenta y vuelve a iniciar sesión. Crea el personal y configura servicios, horarios y asignaciones de acuerdo con la operación del instituto.

## 4. Crear dos proyectos de Vercel

En **Add New → Project → Import Git Repository**, selecciona el mismo repositorio dos veces.

1. Backend. En la pantalla **Configure Project**, junto a **Root Directory**, selecciona `ser-back`. NestJS se detecta por `src/main.ts`. Carga las variables del backend desde **Settings → Environment Variables** con los ámbitos Preview y Production que correspondan. Para una primera prueba, verifica `GET /health` en la URL generada. [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs)
2. Frontend. Selecciona `frontend` en **Root Directory** y confirma el preset **Nuxt**. En **Environment Variables**, configura `NUXT_PUBLIC_API_URL` con la URL del backend del mismo entorno, terminada en `/graphql`. Selecciona Node.js 24 en ambos proyectos para reproducir la versión usada en las pruebas locales. [Nuxt en Vercel](https://vercel.com/docs/frameworks/full-stack/nuxt)
3. Agrega el origen HTTPS del frontend a `CORS_ORIGINS` del backend y vuelve a desplegar el backend para aplicar el cambio. Usa un dominio o alias estable para Preview. Si la protección de despliegues bloquea solicitudes desde el navegador al backend de Preview, configura el acceso a esa vista en el panel y comprueba el flujo con un usuario autorizado.

Vercel empaqueta NestJS como una función. Cada instancia comparte un pool entre las solicitudes que atiende. Ajusta `DB_POOL_MAX` según el límite del proveedor y mide la latencia de la primera solicitud. La documentación indica un límite de 250 MB para la función de NestJS. La expiración de reservas se aplica al consultar listas y detalles, y los cupos vencidos se excluyen de la ocupación. [Detección y límites de NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs)

## 5. Verificar antes de abrir

- Comprueba `GET /health` y un POST GraphQL público. Confirma que una consulta con `__schema` se rechaza en Preview y Production y que el navegador no muestra el playground.
- Abre `/contacto` y prueba el login con cada rol. Revisa menú y acceso a rutas protegidas. Prueba una cuenta inactiva. Las cookies son propias del frontend, con `SameSite=Lax` y `Secure` en el build de producción. El frontend adjunta el token en la cabecera `Authorization`.
- Con datos ficticios en Preview, registra un paciente y prueba una fecha bloqueada en La Paz. Reserva un cupo de capacidad uno desde dos sesiones simultáneas y comprueba que se guarda una sola reserva. Prueba el flujo de pago simulado y la validación por Secretaría.
- La reserva pública actualmente exige que la fecha y hora sean futuras. Las pruebas existentes aceptan una reserva dentro de 24 horas y una a más de 30 días. Si el instituto define la ventana de 24 horas a 30 días como requisito para abrir, queda pendiente aprobar y aplicar esa regla en la API y la interfaz.
- Configura HTTPS, revisa los orígenes exactos, utiliza una contraseña de base propia y un JWT nuevo por entorno. Rota credenciales que se hayan compartido y limita acceso al panel, a la base y a los respaldos. El JWT de la sesión actual es accesible al JavaScript del frontend, por lo que la protección contra XSS sigue siendo importante.

## 6. Actualizaciones y rollback

Sube cambios a una rama de trabajo con `git push`, revisa las vistas previas y fusiona cuando estén aprobadas. La rama de producción activa el despliegue de los proyectos afectados según su configuración. Para cambios de esquema, genera la migración con `npm run migration:generate -- nombre-del-cambio` en desarrollo local y revisa el SQL. Verifica en Preview, respalda Production y aplica `npm run migration:run:prod` desde el código de la versión nueva antes de promoverla. Usa cambios de esquema compatibles con ambas versiones durante la transición.

En **Deployments**, selecciona una versión anterior elegible y usa **Instant Rollback**, o ejecuta `vercel rollback URL_DEL_DESPLIEGUE` desde el proyecto enlazado. El rollback de Vercel cambia el código servido. En desarrollo, `npm run migration:revert` ejecuta el método `down` de la última migración. Algunas migraciones de IIIPP requieren conservar el historial, de modo que para revertirlas debes aplicar una migración correctiva o restaurar una copia verificada. [Instant Rollback](https://vercel.com/docs/instant-rollback)

## 7. Respaldo y cambio de proveedor

Usa la conexión directa. En PowerShell, prepara fuera del repositorio la ruta del respaldo y las variables de conexión por separado (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE`). Deja que el cliente solicite la contraseña o usa un archivo de contraseñas protegido del cliente PostgreSQL. Así evitas escribir una cadena con credenciales en el historial.

```powershell
pg_dump --format=custom --no-owner --no-acl --file "$rutaFueraDelRepo"
pg_restore --list "$rutaFueraDelRepo"
pg_restore --dbname "$baseVaciaDeRestauracion" --no-owner --no-acl --exit-on-error "$rutaFueraDelRepo"
```

Para restaurar, ajusta las variables de conexión al servidor destino antes de ejecutar `pg_restore`. Verifica que el destino esté vacío. Compara tablas, vistas, conteos y un recorrido funcional. En un cambio de proveedor, detén escrituras durante el corte final, repite el respaldo, valida el destino y cambia las URLs de conexión del entorno correspondiente.

## 8. Railway o VPS

**Railway.** Importa el repositorio, configura `ser-back` como raíz del servicio y deja que Railway detecte el `Dockerfile`. Agrega PostgreSQL, carga las variables de backend y configura `/health` como ruta de comprobación. Corre migraciones y seed desde una máquina autorizada con la conexión directa. Puedes mantener el frontend en Vercel. [Dockerfile en Railway](https://docs.railway.com/builds/dockerfiles) · [Healthchecks de Railway](https://docs.railway.com/deployments/healthchecks)

**VPS.** Carga también `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` en el entorno de Compose. La URL de runtime debe usar el host interno `postgres`. Inicia solo PostgreSQL, corre migraciones y seed en un contenedor de ejecución y finalmente inicia el backend. Usa abajo una misma sesión con las variables ya cargadas. Para Compose, `DATABASE_URL_DIRECT` usa también el host interno `postgres` y `DB_SSL=false`.

```sh
docker compose -f docker-compose.prod.yml up -d --wait postgres
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml run --rm -e DATABASE_URL_DIRECT backend npm run migration:run:prod
docker compose -f docker-compose.prod.yml run --rm -e DATABASE_URL_DIRECT -e ADMIN_NOMBRE -e ADMIN_CORREO -e ADMIN_USUARIO -e ADMIN_PASSWORD_TEMPORAL backend npm run seed:prod
docker compose -f docker-compose.prod.yml up -d backend
```

Publica el backend mediante un proxy inverso con HTTPS en el VPS. Compose expone la API únicamente en loopback y conserva la base en su volumen. Utiliza un plan de pago y respaldos para datos reales. Railway documenta la eliminación de volúmenes de Free o Trial 30 días después del vencimiento. Vercel documenta Hobby como plan de uso personal y no comercial. Confirma condiciones y precios en las páginas oficiales antes de contratar. [Planes de Railway](https://docs.railway.com/pricing/plans) · [Vercel Hobby](https://vercel.com/docs/plans/hobby)

## 9. Verificación local de esta preparación

- En PostgreSQL 16 vacío se aplicaron siete migraciones y se creó la vista de agenda. Dos ejecuciones del seed dejaron iguales los conteos de 5 roles, 14 recursos, 18 permisos, 18 estados, 25 parámetros y 1 administrador.
- NestJS arrancó en producción en el puerto 55378. Se comprobó `/health` con respuestas 200 y 503, CORS con un origen permitido y otro rechazado, GraphiQL e introspección por entorno, y dos reservas concurrentes que guardaron un solo cupo. Un respaldo custom se restauró en otra instancia de PostgreSQL 16 con los conteos comprobados.
- El backend compiló, pasó lint con advertencias y aprobó las 44 pruebas unitarias. La suite E2E dejó 38 pruebas aprobadas y tres fallos ya registrados, dos de autenticación en administración y uno de filtros nulos.
- Nuxt compiló con el preset de Vercel. En la función local, `/contacto` y `/auth/login` devolvieron 200, una ruta privada redirigió al login y la URL de la API se tomó del entorno de ejecución. El proyecto no define scripts de lint ni de pruebas. El lockfile de cada proyecto pasó la simulación offline de `npm ci`.
- Compose pasó la validación de sintaxis. Quedan por ejecutar la construcción de la imagen Docker, el recorrido en Preview y las mediciones del tamaño de la función del backend y el arranque en frío en Vercel. El artefacto local de la función Nuxt pesó aproximadamente 6,3 MB.
