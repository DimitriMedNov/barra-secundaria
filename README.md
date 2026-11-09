# Barra secundaria

Extensión de GNOME Shell (48 a 51) que pone una barra mínima arriba de cada monitor **que no es el principal**. La barra principal no se toca.

```
[• ━ •]  [▣ Terminal] [▣ Navegador] ……          [▦] [⇆]  15:42
```

| Parte | Qué hace |
|---|---|
| Escritorios | Puntos para cambiar de escritorio. Solo salen si ese monitor cambia de escritorio (ver abajo). |
| Ventanas | Las ventanas de ese monitor. Clic = activarla; clic en la activa = minimizarla. |
| ▦ Ordenar | Acomoda las ventanas de ese monitor sin encimarse. |
| ⇆ Mover | Si la ventana activa está en ese monitor, la manda al principal; si está en otro, la trae. |
| Reloj | Sigue tu formato de 12 o 24 horas. |

## Cómo ordena

- **Monitor horizontal:** columnas. 2 ventanas = mitades izquierda/derecha; 3 = una grande a la izquierda y dos apiladas; 4 = 2 × 2.
- **Monitor vertical:** filas. 2 = arriba/abajo; 3 = tres filas; 4 = 2 × 2. Nunca quedan tiras angostas.
- La ventana activa se queda con el espacio más grande. Las maximizadas también se acomodan; las minimizadas no.

## Escritorios en el monitor secundario

GNOME, por defecto, deja los monitores secundarios fijos (no cambian de escritorio), y entonces los puntos no aparecen. Para que sí cambien:

```bash
gsettings set org.gnome.mutter workspaces-only-on-primary false
```

Ojo: en GNOME cambiar de escritorio mueve **todos** los monitores a la vez.

## Instalar

```bash
./install.sh          # instalar (luego cerrar sesión y volver a entrar)
./install.sh --quitar # desinstalar
```

## Licencia

MIT
