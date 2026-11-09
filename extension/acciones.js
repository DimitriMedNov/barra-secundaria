// Lo que hacen los botones de la barra con las ventanas de un monitor.

import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {celdas} from './acomodo.js';

const TIPOS = [Meta.WindowType.NORMAL, Meta.WindowType.DIALOG, Meta.WindowType.MODAL_DIALOG];

// Ventanas que van en una lista de ventanas: sin paneles, escritorios ni emergentes.
export function esVentanaDeLista(w) {
    return TIPOS.includes(w.get_window_type()) && !w.is_skip_taskbar() && !w.is_override_redirect();
}

// Ventanas de ese monitor en el escritorio actual de GNOME (o fijas en todos).
export function ventanasDe(monitor) {
    const actual = global.workspace_manager.get_active_workspace();
    return global.display.list_all_windows()
        .filter(w => esVentanaDeLista(w) &&
            w.get_monitor() === monitor &&
            (w.is_on_all_workspaces() || w.get_workspace() === actual))
        .sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());
}

// Activa la ventana; si ya era la activa, la minimiza (como en la barra de Windows).
export function alternar(w) {
    if (global.display.focus_window === w && !w.minimized)
        w.minimize();
    else
        Main.activateWindow(w);
}

// Reparte las ventanas visibles del monitor en su área libre (sin tapar la barra).
// La ventana activa va primero, así le toca el espacio más grande cuando hay uno.
export function ordenar(monitor) {
    const foco = global.display.focus_window;
    // allows_resize() da falso mientras está maximizada o en pantalla completa: esas sí se acomodan.
    const lista = ventanasDe(monitor).filter(w => !w.minimized &&
        (w.allows_resize() || w.is_maximized() || w.is_fullscreen()));
    lista.sort((a, b) => (b === foco) - (a === foco));
    const ws = global.workspace_manager.get_active_workspace();
    const area = ws.get_work_area_for_monitor(monitor);
    const rects = celdas(lista.length, {x: area.x, y: area.y, width: area.width, height: area.height});
    lista.forEach((w, i) => {
        if (w.is_fullscreen())
            w.unmake_fullscreen();
        if (w.is_maximized())
            w.unmaximize();
        const r = rects[i];
        w.move_resize_frame(true, r.x, r.y, r.width, r.height);
    });
    return lista.length;
}

// Si la ventana activa está en este monitor, la manda al principal; si está en otro, la trae aquí.
export function mover(monitor) {
    const w = global.display.focus_window;
    if (!w || !TIPOS.includes(w.get_window_type()))
        return false;
    const destino = w.get_monitor() === monitor ? Main.layoutManager.primaryIndex : monitor;
    if (destino === w.get_monitor())
        return false;
    w.move_to_monitor(destino);
    return true;
}
