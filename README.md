# Barra secundaria

Extensión de GNOME Shell (48 a 51) que pone una barra mínima arriba de cada monitor **que no es el principal**. La barra principal no se toca.

```
[• ━ •]  [▣ Terminal] [▣ Navegador] ……          [▦] [⇆]  15:42
```

| Parte | Qué hace |
|---|---|
| Escritorios | Escritorios propios de ese monitor, independientes del principal (ver abajo). |
| Ventanas | Las ventanas de ese monitor. Clic = activarla; clic en la activa = minimizarla. |
| ▦ Ordenar | Acomoda las ventanas de ese monitor sin encimarse. |
| ⇆ Mover | Si la ventana activa está en ese monitor, la manda al principal; si está en otro, la trae. |
| Reloj | Sigue tu formato de 12 o 24 horas. |

## Cómo ordena

- **Monitor horizontal:** columnas. 2 ventanas = mitades izquierda/derecha; 3 = una grande a la izquierda y dos apiladas; 4 = 2 × 2.
- **Monitor vertical:** filas. 2 = arriba/abajo; 3 = tres filas; 4 = 2 × 2. Nunca quedan tiras angostas.
- La ventana activa se queda con el espacio más grande. Las maximizadas también se acomodan; las minimizadas no.

## Escritorios independientes (como en macOS)

GNOME no deja que cada monitor tenga sus propios escritorios: o todos cambian juntos, o los secundarios se quedan fijos. Esta extensión lo simula **en modo fijo** (el normal de GNOME):

- Cada monitor secundario tiene sus propios escritorios. Cambiarlos **no mueve el principal**.
- Al cambiar, las ventanas del escritorio que dejas se minimizan y las del nuevo vuelven.
- Siempre hay un escritorio vacío después del último usado (como GNOME), hasta 9.
- Si eliges una ventana escondida desde Alt+Tab o la vista general, el secundario salta solo a su escritorio.
- Atajos: **Super + Alt + Av Pág** (siguiente) y **Super + Alt + Re Pág** (anterior), en el secundario donde está la ventana activa o el puntero.
- Las ventanas que minimizas tú se quedan minimizadas; solo se restauran las que escondió la extensión.
- Al bloquear la pantalla se conserva todo. Si apagas la extensión, todas las ventanas vuelven a verse.

Para activar el modo fijo (si lo cambiaste):

```bash
gsettings set org.gnome.mutter workspaces-only-on-primary true
```

Con `false`, GNOME mueve todos los monitores juntos y los puntos de la barra pasan a ser los escritorios normales de GNOME.

## Instalar

```bash
./install.sh          # instalar (luego cerrar sesión y volver a entrar)
./install.sh --quitar # desinstalar
```

## Licencia

MIT
