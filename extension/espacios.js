// Escritorios propios para cada monitor secundario, independientes del principal (como
// "Las pantallas tienen Spaces independientes" de macOS).
//
// GNOME no lo permite: sus escritorios son globales. Con "workspaces-only-on-primary" (modo
// fijo) el secundario nunca cambia; aquí se simula: cada ventana de un secundario pertenece a
// un escritorio de ESE monitor, y al cambiar se minimizan las del escritorio que se deja y se
// restauran las del que se abre. El principal ni se entera.
//
// Solo funciona en modo fijo. En el otro modo GNOME ya mueve todo junto y esto se apaga solo.

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {esVentanaDeLista} from './acciones.js';

const MAXIMO = 9;

// Vive fuera de la clase a propósito: al bloquear la pantalla GNOME apaga las extensiones y las
// vuelve a prender al desbloquear; así no se pierde qué ventana va en qué escritorio.
const estado = {
    espacio: new Map(),     // Meta.Window → {monitor, n}
    activo: new Map(),      // índice de monitor → escritorio visible
    escondidas: new Set(),  // ventanas que minimizó esta extensión (las que minimizaste tú no)
};

export class Espacios {
    constructor(alCambiar) {
        this._alCambiar = alCambiar;
        this._mutter = new Gio.Settings({schema_id: 'org.gnome.mutter'});
        this._ocupado = false;   // true mientras esta clase minimiza/restaura (ignora sus propios avisos)
        this._pendiente = 0;
        this._conectadas = new Set();

        const programar = () => this._programar();
        global.display.connectObject(
            'window-created', programar,
            'window-entered-monitor', programar,
            'notify::focus-window', () => this._alEnfocar(global.display.focus_window), this);
        Main.layoutManager.connectObject('monitors-changed', programar, this);
        this._mutter.connectObject('changed::workspaces-only-on-primary', () => {
            if (!this.encendidos)
                this._soltarTodo();
            this._programar();
        }, this);
        this._barrer();
    }

    get encendidos() {
        return this._mutter.get_boolean('workspaces-only-on-primary');
    }

    esSecundario(m) {
        const lm = Main.layoutManager;
        return m >= 0 && m < lm.monitors.length && m !== lm.primaryIndex;
    }

    activo(m) {
        return estado.activo.get(m) ?? 0;
    }

    // Siempre queda un escritorio vacío después del último usado (como GNOME), mínimo 2.
    cuantos(m) {
        let mayor = -1; // último escritorio con ventanas
        for (const e of estado.espacio.values()) {
            if (e.monitor === m)
                mayor = Math.max(mayor, e.n);
        }
        return Math.min(MAXIMO, Math.max(2, mayor + 2, this.activo(m) + 1));
    }

    // ¿La ventana es del escritorio que se ve ahora en su monitor?
    visible(w) {
        const e = estado.espacio.get(w);
        return !this.encendidos || !e || e.n === this.activo(e.monitor);
    }

    cambiar(m, n) {
        if (!this.encendidos || !this.esSecundario(m) || n < 0 || n >= this.cuantos(m) || n === this.activo(m))
            return;
        const antes = this.activo(m);
        this._ocupado = true;
        try {
            for (const [w, e] of estado.espacio) {
                if (e.monitor !== m)
                    continue;
                if (e.n === antes && !w.minimized) {
                    estado.escondidas.add(w);
                    w.minimize();
                } else if (e.n === n && estado.escondidas.has(w)) {
                    estado.escondidas.delete(w);
                    w.unminimize();
                }
            }
            estado.activo.set(m, n);
            // Se activa la ventana de más arriba del escritorio nuevo, como en macOS.
            const arriba = global.display.sort_windows_by_stacking(
                [...estado.espacio].filter(([w, e]) => e.monitor === m && e.n === n && !w.minimized).map(([w]) => w)).at(-1);
            if (arriba)
                Main.activateWindow(arriba);
        } finally {
            this._ocupado = false;
        }
        this._alCambiar();
    }

    // Atajo de teclado: +1 / -1 en el secundario donde estás trabajando.
    mover(paso) {
        const m = this._monitorObjetivo();
        if (m < 0)
            return;
        this.cambiar(m, Math.max(0, Math.min(this.cuantos(m) - 1, this.activo(m) + paso)));
    }

    // El monitor de la ventana activa; si está en el principal, el del puntero; si no, el primer secundario.
    _monitorObjetivo() {
        const foco = global.display.focus_window?.get_monitor() ?? -1;
        if (this.esSecundario(foco))
            return foco;
        const puntero = global.display.get_current_monitor();
        if (this.esSecundario(puntero))
            return puntero;
        return Main.layoutManager.monitors.findIndex((_m, i) => this.esSecundario(i));
    }

    _programar() {
        if (this._pendiente)
            return;
        this._pendiente = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._pendiente = 0;
            this._barrer();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Asigna escritorio a las ventanas que llegan a un secundario y suelta las que se fueron al principal.
    _barrer() {
        if (this.encendidos) {
            const todas = global.display.list_all_windows();
            // Ventanas que se cerraron mientras la extensión estaba apagada (pantalla bloqueada).
            for (const w of [...estado.espacio.keys()]) {
                if (!todas.includes(w)) {
                    estado.espacio.delete(w);
                    estado.escondidas.delete(w);
                }
            }
            for (const w of todas) {
                if (!esVentanaDeLista(w))
                    continue;
                const m = w.get_monitor();
                const e = estado.espacio.get(w);
                if (this.esSecundario(m)) {
                    if (!e || e.monitor !== m)
                        estado.espacio.set(w, {monitor: m, n: this.activo(m)});
                    this._conectar(w);
                } else if (e) {
                    this._soltar(w);
                }
            }
            for (const m of [...estado.activo.keys()]) {
                if (!this.esSecundario(m))
                    estado.activo.delete(m);
            }
        }
        this._alCambiar();
    }

    _conectar(w) {
        if (this._conectadas.has(w))
            return;
        this._conectadas.add(w);
        w.connectObject(
            'unmanaged', () => {
                estado.espacio.delete(w);
                estado.escondidas.delete(w);
                this._conectadas.delete(w);
                this._programar();
            },
            // Si alguien restaura una ventana escondida (vista general, Alt+Tab), se va a su escritorio.
            'notify::minimized', () => {
                if (!this._ocupado && !w.minimized && estado.escondidas.has(w)) {
                    estado.escondidas.delete(w);
                    this._alEnfocar(w);
                }
                this._alCambiar();
            }, this);
    }

    _alEnfocar(w) {
        if (this._ocupado || !w || !this.encendidos)
            return;
        const e = estado.espacio.get(w);
        if (e && e.n !== this.activo(e.monitor))
            this.cambiar(e.monitor, e.n);
    }

    _soltar(w) {
        if (estado.escondidas.delete(w))
            w.unminimize();
        estado.espacio.delete(w);
    }

    // Devuelve todas las ventanas escondidas y olvida los escritorios.
    _soltarTodo() {
        this._ocupado = true;
        try {
            for (const w of [...estado.espacio.keys()])
                this._soltar(w);
        } finally {
            this._ocupado = false;
        }
        estado.activo.clear();
    }

    destroy() {
        if (this._pendiente)
            GLib.source_remove(this._pendiente);
        this._pendiente = 0;
        global.display.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        this._mutter.disconnectObject(this);
        for (const w of this._conectadas)
            w.disconnectObject(this);
        this._conectadas.clear();
        // Al bloquear la pantalla se conserva todo; si la apagas tú, se devuelven las ventanas.
        if (!Main.sessionMode.isLocked)
            this._soltarTodo();
    }
}
