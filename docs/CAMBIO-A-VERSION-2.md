# Pasar producción a la versión 2

Todo esto ya está probado en el proyecto de pruebas (`futbol-app-dev-fp`, 34 pruebas de integración).
Producción (`futbol-app-5818a`) sigue con la versión anterior hasta que se haga este procedimiento.

Tiempo estimado: 30 minutos. Conviene hacerlo un día sin partido y avisar al grupo antes.

## 0. Antes de empezar

- La rama `feat/v2` está lista y sin conflictos con `main`.
- Los 20 jugadores saben que van a tener que ingresar de nuevo con su email (mensaje sugerido al final).
- Tenés a mano la **API key nueva de OneSignal** (la que se rotó).

## 1. Preparar el servidor (no afecta a nadie todavía)

```bash
# Clave de OneSignal para los avisos push (te pide pegarla)
firebase functions:secrets:set ONESIGNAL_API_KEY --project prod

# Permisos de las funciones (proyecto 861046895576)
for R in roles/cloudbuild.builds.builder roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer \
         roles/datastore.user roles/secretmanager.secretAccessor roles/eventarc.eventReceiver roles/firebaseauth.viewer; do
  gcloud projects add-iam-policy-binding futbol-app-5818a \
    --member="serviceAccount:861046895576-compute@developer.gserviceaccount.com" --role="$R" --condition=None --quiet
done

# Funciones e índices (NO despliega las reglas)
firebase deploy --only functions,firestore:indexes --project prod --force

# Las funciones que llama la app deben poder invocarse desde el navegador (la sesión se verifica en el código).
# La política de la organización no permite "allUsers", así que se desactiva el chequeo de invocador por servicio:
for F in creargrupo nuevocodigo unirseporcodigo vincularcuentaanterior enviaravisomanual votar cerrarvotacion migrardatosanteriores; do
  gcloud run services update $F --region us-central1 --project futbol-app-5818a --no-invoker-iam-check --quiet
done
```

Comprobación: `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"data":{}}' https://us-central1-futbol-app-5818a.cloudfunctions.net/crearGrupo` debe responder **401** (la función respondió "iniciá sesión"). Un 403 significa que falta el paso anterior.

## 2. El cambio (hacerlo seguido, son unos minutos)

1. **Merge de `feat/v2` a `main`** (el PR). Vercel despliega la versión nueva en `futbol-app-puce.vercel.app`.
2. Entrá a la app con tu cuenta (`fede@inmetricswetrust.com`, con Google o email verificado) → **Grupo → Mi perfil → Plataforma**.
3. **Ver qué se migraría**: revisá que aparezca "Fútbol de los Lunes" con la cantidad esperada de jugadores y partidos.
4. **Migrar los datos**.
5. Desplegá las reglas de seguridad nuevas (cierra los datos de la versión anterior a cualquiera que no sea del servidor):

```bash
firebase deploy --only firestore:rules --project prod
```

6. Probá con tu cuenta: recuperá tu historial con tu DNI y tu clave de antes (Perfil → Recuperar mi historial anterior). Tu grupo debe aparecer con tus estadísticas.

## 3. Avisar al grupo

Cómo entra cada uno:

- **Si entraba con Google**: toca "Seguir con Google". La app encuentra su cuenta anterior y le muestra "Encontramos tu cuenta: (nombre). ¿Sos vos?". Confirma y listo.
- **Si entraba con DNI y clave**: toca "Entrar con mi DNI de antes", pone su DNI y su clave de siempre, y en la pantalla siguiente elige un **email y una contraseña nueva**. Desde ese momento entra con el email, y ese email es también su forma de recuperar la contraseña. El ingreso con DNI queda cerrado para esa cuenta.
- **Si es nuevo**: se registra con Google o con email.

Mensaje sugerido:

> Cambiamos la app de fútbol. Entrá a futbol-app-puce.vercel.app. Si antes entrabas con Google, tocá "Seguir con Google". Si entrabas con tu DNI, tocá "Entrar con mi DNI de antes", poné tu DNI y tu clave de siempre y después elegí un email: desde ahí entrás con el email. Tu historial queda como estaba.

## 4. Si algo sale mal

- **Volver a la app anterior**: en Vercel, Deployments → el último deploy anterior al merge → *Promote to Production*. Y restaurar las reglas viejas: `firebase deploy --only firestore:rules --project prod` usando `docs/reglas-produccion-anteriores.rules` (copiarlo sobre `firestore.rules`).
- Los datos anteriores (`app8_*`) **no se tocan ni se borran** durante la migración; siguen en Firestore.
- Si la migración corrió a medias, se puede repetir con "forzar" desde las pruebas; en producción, avisame antes.

## 5. Después (a las 2 o 4 semanas)

- Verificar que los 20 jugadores recuperaron su cuenta (Grupo → los que dicen "Todavía no entró con su email").
- Borrar las colecciones `app8_*` y la variable `ONESIGNAL_API_KEY` de Vercel (ya no se usa).
- Revisar en Firebase el consumo (Uso y facturación) y el presupuesto de USD 10.
