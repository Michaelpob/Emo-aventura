# Panel de administración · configuración paso a paso

**EMO-AVENTURA — cómo dejar funcionando las estadísticas y el acceso privado**

Versión del documento: 1.0 · Repositorio: `Michaelpob/Emo-aventura`
Dirigido a: la persona que administra el proyecto. No hace falta saber
programar: basta con copiar, pegar y rellenar casillas.

---

## Tabla de contenido

1. [Qué es el panel y qué necesitas](#1-qué-es-el-panel-y-qué-necesitas)
2. [Crear el proyecto en Supabase](#2-crear-el-proyecto-en-supabase)
3. [Crear las tablas y los permisos](#3-crear-las-tablas-y-los-permisos)
4. [Crear el usuario administrador](#4-crear-el-usuario-administrador)
5. [Cerrar el registro público](#5-cerrar-el-registro-público)
6. [Correo de salida (SMTP con Gmail)](#6-correo-de-salida-smtp-con-gmail)
7. [La plantilla del correo con el código](#7-la-plantilla-del-correo-con-el-código)
8. [Rellenar el archivo .env](#8-rellenar-el-archivo-env)
9. [Compilar y publicar](#9-compilar-y-publicar)
10. [Primera entrada al panel](#10-primera-entrada-al-panel)
11. [Qué datos se guardan y qué no](#11-qué-datos-se-guardan-y-qué-no)
12. [Problemas frecuentes](#12-problemas-frecuentes)
13. [Mantenimiento](#13-mantenimiento)

---

## 1. Qué es el panel y qué necesitas

El juego tiene una **segunda página independiente**, `admin.html`, que muestra
cuánto se usa cada isla: visitas, partidas empezadas y terminadas, tiempo medio,
ranking de las seis islas, gráficas por día y por hora, y tipo de dispositivo.

| Cosa | Detalle |
|---|---|
| Quién entra | **Un solo correo**: `maicolpoveda115@gmail.com` |
| Dónde se guardan las estadísticas | Supabase (plan gratuito) |
| Qué pasa si no se configura | El juego funciona igual y el panel avisa de que falta configurarlo |
| Qué necesitas | Una cuenta de GitHub o de correo para entrar a Supabase, y una cuenta de Gmail para el envío de códigos |
| Tiempo aproximado | 20 a 30 minutos la primera vez |

> **Importante:** el juego **nunca espera respuesta de internet**. Si Supabase
> está caído, sin conexión o sin configurar, los minijuegos, el mapa 3D y el
> progreso guardado siguen exactamente igual.

---

## 2. Crear el proyecto en Supabase

1. Entra en `https://supabase.com` y pulsa **Start your project**.
2. Inicia sesión (lo más rápido es **Continue with GitHub**).
3. Pulsa **New project** y rellena:
   - **Name:** `emo-aventura`
   - **Database Password:** pulsa *Generate a password* y **guárdala en un
     lugar seguro** (sirve para la base de datos, no para el panel).
   - **Region:** la más cercana. Para Colombia, *South America (São Paulo)* o
     *East US*.
   - **Plan:** *Free*.
4. En **Security**, deja **Enable Data API** activado (lo necesita el juego) y
   **desactiva Automatically expose new tables**: los permisos los da el
   `schema.sql`, uno por uno. Es lo que recomienda el propio Supabase.
5. Pulsa **Create new project** y espera uno o dos minutos a que termine de
   crearse.

Cuando termine, ve a **Project Settings** (el engranaje, abajo a la izquierda)
y luego a **API Keys**. De ahí salen los dos datos del paso 8.

| Dato que verás | Para qué sirve |
|---|---|
| **Project URL** (en la portada del proyecto) | Es `VITE_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`; en proyectos antiguos se llamaba **anon public**) | Es `VITE_SUPABASE_ANON_KEY`. Supabase la marca como segura para el navegador |
| **Secret key** (`sb_secret_…`, antes **service_role**) | **No se usa nunca aquí.** No la copies a ningún archivo del proyecto |

---

## 3. Crear las tablas y los permisos

Todo lo que hace falta en la base de datos está en un archivo del repositorio:
`supabase/schema.sql`.

1. Abre el archivo `supabase/schema.sql` con cualquier editor de texto y
   **copia todo su contenido**.
2. En Supabase, menú izquierdo > **SQL Editor** > botón **New query**.
3. **Pega** el contenido y pulsa **Run** (o `Ctrl + Enter`).
4. Debe aparecer *Success. No rows returned*. Eso es correcto.

Lo que acabas de crear:

| Elemento | Para qué |
|---|---|
| Tabla `island_events` | Una fila por evento anónimo (isla, tipo de evento, fecha, duración, dispositivo) |
| Tabla `admins` | La lista de correos que pueden consultar; ya viene con el correo del administrador |
| Función `is_admin()` | Comprueba si quien pregunta está en esa lista |
| Políticas de seguridad (RLS) | El público **solo puede insertar** eventos: no puede leerlos, cambiarlos ni borrarlos |
| Cinco funciones `admin_*` | Devuelven los resúmenes ya agrupados (en horario de Bogotá) y solo responden al administrador |

> Si vuelves a ejecutar el archivo más adelante no pasa nada: está escrito para
> poder repetirse sin duplicar ni borrar datos.

---

## 4. Crear el usuario administrador

1. Menú izquierdo > **Authentication** > **Users**.
2. Pulsa **Add user** > **Create new user**.
3. Rellena:
   - **Email:** `maicolpoveda115@gmail.com` (tiene que ser exactamente el mismo
     que está en la tabla `admins` y en `VITE_ADMIN_EMAIL`).
   - **Password:** una contraseña de al menos 10 caracteres con letras y
     números. Si prefieres crearla luego desde el propio panel, escribe
     cualquiera y después usa *¿Olvidaste tu contraseña?* (paso 10).
   - Marca **Auto Confirm User** para no tener que confirmar el correo.
4. Pulsa **Create user**.

> **Regla de oro:** esa contraseña **no se escribe en ningún archivo del
> proyecto**. El código no guarda contraseñas ni códigos en ningún sitio.

---

## 5. Cerrar el registro público

Así nadie más puede crearse una cuenta en tu proyecto.

1. **Authentication** > **Sign In / Providers** (en algunas versiones aparece
   como **Providers**) > **Email**.
2. Desactiva **Allow new users to sign up** (en otras versiones, *Enable user
   signups*).
3. Guarda con **Save**.

Aunque alguien lograra crear una cuenta, **no vería nada**: las funciones del
panel comprueban el correo contra la tabla `admins` y responden
*Acceso no autorizado*.

---

## 6. Correo de salida (SMTP con Gmail)

Hace falta para que llegue el **código de 6 cifras** cuando se recupera la
contraseña. El correo de prueba que trae Supabase tiene un límite muy bajo, así
que conviene poner un Gmail propio.

**Primero, la contraseña de aplicación de Google:**

1. Entra en `https://myaccount.google.com/security`.
2. Activa la **Verificación en dos pasos** si no la tienes.
3. Busca **Contraseñas de aplicaciones**, crea una con el nombre
   `emo-aventura` y copia las **16 letras** que te muestra (sin espacios).

**Después, en Supabase:**

1. **Project Settings** > **Authentication** > sección **SMTP Settings**.
2. Activa **Enable Custom SMTP** y rellena:

| Casilla | Valor |
|---|---|
| Sender email | tu dirección de Gmail |
| Sender name | `EMO-AVENTURA` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | tu dirección de Gmail completa |
| Password | las 16 letras de la contraseña de aplicación |

3. Pulsa **Save**.

> La contraseña de aplicación vive **solo** en esta pantalla de Supabase. No se
> copia al repositorio ni al archivo `.env`.

---

## 7. La plantilla del correo con el código

El panel pide un **código**, no un enlace. Hay que decirle al correo que muestre
el código.

> Supabase solo deja editar las plantillas **después** de configurar el SMTP
> del paso 6. Si ves el aviso *Set up custom SMTP to edit templates*, vuelve
> atrás y termina ese paso primero.

1. **Authentication** > **Emails** > pestaña **Templates** > plantilla
   **Magic Link**.
2. Cambia el asunto por: `Tu código para el panel de EMO-AVENTURA`
3. Borra el contenido del mensaje y pega este, que muestra el código con
   `{{ .Token }}`:

```html
<h2>Tu código de acceso</h2>
<p>Hola. Alguien pidió entrar al panel de administración de
   <b>EMO-AVENTURA</b>.</p>
<p>Tu código es:</p>
<p style="font-size:30px;letter-spacing:6px;font-weight:bold">{{ .Token }}</p>
<p>Escríbelo en la página del panel. Caduca en una hora y solo sirve una vez.</p>
<p>Si no fuiste tú, no hace falta hacer nada: sin este código nadie entra.</p>
<p style="color:#666">Vive la aventura de descubrir el poder de tus emociones.</p>
```

4. Pulsa **Save changes**.
5. (Opcional) En **Authentication** > **URL Configuration** pon como
   **Site URL** la dirección del juego:
   `https://michaelpob.github.io/Emo-aventura/`

---

## 8. Rellenar el archivo .env

En la carpeta del proyecto, en el computador donde se compila:

1. Copia el archivo `.env.example` y llámalo `.env`.
2. Ábrelo y pega los dos datos del paso 2:

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# la clave publica, completa y en una sola linea
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
VITE_ADMIN_EMAIL=maicolpoveda115@gmail.com
VITE_TRACK_DEV=false
```

| Regla | Por qué |
|---|---|
| El archivo `.env` **no se sube** al repositorio | Ya está en `.gitignore` |
| Solo va la clave **publishable** (*anon*) | Es pública por diseño; la seguridad la dan las políticas RLS del paso 3 |
| La clave **secret** (*service_role*) jamás | Daría acceso total a la base de datos |
| `VITE_TRACK_DEV=false` | Para que las pruebas en el computador no ensucien las estadísticas reales |

> La clave pública acaba dentro de los archivos publicados en `docs/`, y eso es
> normal: cualquiera puede verla y **solo** le sirve para insertar eventos
> anónimos, nunca para leerlos.

---

## 9. Compilar y publicar

Las variables se leen **al compilar**, así que después de tocar el `.env` hay
que volver a compilar y subir la carpeta `docs/`.

```bash
corepack pnpm install
corepack pnpm build
```

Luego sube los cambios al repositorio:

```bash
git add -A
git commit -m "Panel de administracion configurado"
git push
```

GitHub Pages publica desde la carpeta `/docs` de la rama `main`. En un minuto
estarán disponibles:

| Dirección | Qué es |
|---|---|
| `https://michaelpob.github.io/Emo-aventura/` | El juego |
| `https://michaelpob.github.io/Emo-aventura/admin.html` | El panel |

El panel también se abre desde el **botón «Administrador»** que aparece arriba a
la derecha en la pantalla de inicio y en el mapa (dentro de los minijuegos no
aparece, para no molestar).

---

## 10. Primera entrada al panel

1. Abre `admin.html` (o pulsa el botón **Administrador**).
2. El usuario ya viene puesto: `maicolpoveda115@gmail.com`.
3. Escribe la contraseña del paso 4 y pulsa **Entrar**.
   - Marca **Mantener la sesión** solo en un computador de confianza. Si no la
     marcas, la sesión se cierra al cerrar la pestaña.

**Si no tienes contraseña o la olvidaste:**

1. Pulsa **¿Olvidaste tu contraseña?**
2. Llega un correo con el código de 6 cifras (puedes pegarlo completo).
3. Escribe el código y después crea la contraseña nueva: al menos **10
   caracteres, con una letra y un número**.

**Medidas de seguridad ya incluidas:**

| Medida | Comportamiento |
|---|---|
| Correo ajeno | Aunque la contraseña fuera correcta, no entra |
| 5 intentos fallidos | Bloqueo de 2 minutos con cuenta atrás |
| Mensaje de error | Siempre genérico: no dice si el usuario existe |
| 30 minutos sin tocar nada | Cierra la sesión solo |
| Botón **Salir** | Cierra la sesión en cualquier momento |

---

## 11. Qué datos se guardan y qué no

**Lo que se guarda** (una fila por evento, sin ninguna persona identificada):

| Campo | Ejemplo | Qué es |
|---|---|---|
| `island_id` | `calm` | Una de las seis islas |
| `event_type` | `island_view`, `game_start`, `game_complete`, `game_exit` | Qué ocurrió |
| `minigame` | `calm-lake` | Qué minijuego |
| `session_id` | un identificador al azar | Se borra al cerrar la pestaña; no sirve para identificar a nadie |
| `duration_ms` | `184000` | Cuánto duró la partida |
| `device` | `mobile`, `tablet`, `desktop` | Tipo de pantalla |
| `created_at` | fecha y hora | Cuándo |

**Lo que NO sale nunca del dispositivo:** nombre, avatar, color favorito,
puntos, herramientas, insignias, intensidades, compromisos y **las respuestas de
la Isla del Desagrado**. Todo eso sigue viviendo solo en el navegador del
jugador (`localStorage`).

**Cómo no registrar nada** (por ejemplo, en una demostración): añade
`?notrack=1` a la dirección del juego.

---

## 12. Problemas frecuentes

| Qué ves | Qué pasa | Qué hacer |
|---|---|---|
| El panel dice **«Falta configurar el panel»** | No hay variables en el `.env` o se compiló sin ellas | Repite los pasos 8 y 9 |
| **«No pudimos entrar. Revisa los datos.»** | Correo o contraseña incorrectos, o el correo no es el del administrador | Comprueba el usuario del paso 4 |
| **«Acceso no autorizado»** al cargar los datos | El correo no está en la tabla `admins` | SQL Editor: `insert into public.admins (email) values ('tu@correo.com');` |
| El panel dice **«Aún no hay datos»** | Todavía nadie ha jugado en ese periodo | Abre el juego, entra a una isla y recarga el panel |
| No llega el correo con el código | SMTP mal configurado o la plantilla sin `{{ .Token }}` | Repite los pasos 6 y 7; mira también la carpeta de *spam* |
| Las estadísticas no suben | Se compiló sin `.env`, o la dirección lleva `?notrack=1` | Repite el paso 9 |
| Sale el enlace del correo en vez del código | La plantilla **Magic Link** quedó con el texto original | Vuelve al paso 7 |

---

## 13. Mantenimiento

**Ver las filas en crudo:** Supabase > **Table Editor** > tabla
`island_events`.

**Descargar las estadísticas:** en el panel, botón **Descargar CSV**. Se abre
con Excel (separador `;`).

**Borrar datos de prueba** (SQL Editor):

```sql
delete from public.island_events where created_at < '2026-01-01';
```

**Cambiar o añadir administrador:**

```sql
insert into public.admins (email) values ('otro@correo.com');
delete from public.admins where email = 'antiguo@correo.com';
```

Además hay que crear ese usuario en **Authentication > Users** y actualizar
`VITE_ADMIN_EMAIL` en el `.env` si cambia el correo principal.

**Límites del plan gratuito:** 500 MB de base de datos. Una fila de evento ocupa
unas decenas de bytes, así que caben varios millones de eventos. El proyecto
gratuito se pausa si nadie lo usa durante una semana; se reactiva con un botón
desde el panel de Supabase.

**Copia de seguridad:** Table Editor > menú de la tabla > **Export data as CSV**.

---

*Documento mantenido junto al código fuente del proyecto. Ver también
[Manual de administrador](MANUAL-DE-ADMINISTRADOR.md) y
[Referencias y normas](REFERENCIAS-Y-NORMAS.md).*
