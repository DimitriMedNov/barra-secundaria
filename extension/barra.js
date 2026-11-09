// La barra de un monitor secundario:
//   [escritorios] [ventanas de este monitor ……]        [ordenar] [mover] 15:42

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import * as acciones from './acciones.js';

const TAM_ICONO = 16;

function boton(icono, nombre, alPulsar) {
    const b = new St.Button({
        style_class: 'bs-boton',
        child: new St.Icon({icon_name: icono, icon_size: TAM_ICONO}),
        accessible_name: nombre,
        can_focus: true,
        track_hover: true,
        y_expand: true,
    });
    b.connect('clicked', alPulsar);
    return b;
}

export const Barra = GObject.registerClass(
class Barra extends St.BoxLayout {
    _init(monitor) {
        super._init({style_class: 'bs-barra', reactive: true, name: `barra-secundaria-${monitor.index}`});
        this._monitor = monitor.index;
        this._pendiente = 0;
        this._reloj = 0;
        this._mutter = new Gio.Settings({schema_id: 'org.gnome.mutter'});
        this._interfaz = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});

        this._escritorios = new St.BoxLayout({style_class: 'bs-escritorios', y_align: Clutter.ActorAlign.CENTER});
        this._ventanas = new St.BoxLayout({style_class: 'bs-ventanas', x_expand: true});
        const derecha = new St.BoxLayout({style_class: 'bs-derecha'});
        derecha.add_child(boton('view-grid-symbolic', 'Ordenar ventanas de este monitor', () => acciones.ordenar(this._monitor)));
        derecha.add_child(boton('object-flip-horizontal-symbolic', 'Mover ventana activa a otro monitor', () => acciones.mover(this._monitor)));
        this._hora = new St.Label({style_class: 'bs-hora', y_align: Clutter.ActorAlign.CENTER});
        derecha.add_child(this._hora);

        this.add_child(this._escritorios);
        this.add_child(this._ventanas);
        this.add_child(derecha);

        const refrescar = () => this._programar();
        global.display.connectObject(
            'window-created', refrescar,
            'notify::focus-window', refrescar,
            'window-entered-monitor', refrescar,
            'window-left-monitor', refrescar, this);
        global.workspace_manager.connectObject(
            'active-workspace-changed', refrescar,
            'workspace-added', refrescar,
            'workspace-removed', refrescar, this);
        this._mutter.connectObject('changed::workspaces-only-on-primary', refrescar, this);
        this._interfaz.connectObject('changed::clock-format', () => this._tic(), this);

        this.connect('destroy', () => this._limpiar());
        this.colocar(monitor);
        this._pintar();
        this._tic();
    }

    colocar(monitor) {
        this._monitor = monitor.index;
        this.set_position(monitor.x, monitor.y);
        this.set_size(monitor.width, Main.panel.height);
        this._programar();
    }

    // Muchos avisos llegan juntos (abrir una ventana manda varios): se repinta una vez.
    _programar() {
        if (this._pendiente)
            return;
        this._pendiente = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._pendiente = 0;
            this._pintar();
            return GLib.SOURCE_REMOVE;
        });
    }

    _pintar() {
        this._pintarEscritorios();
        this._pintarVentanas();
    }

    // Los puntos solo tienen sentido si este monitor cambia de escritorio. Con
    // "workspaces-only-on-primary" (lo normal en GNOME) el secundario se queda fijo y no salen.
    _pintarEscritorios() {
        this._escritorios.destroy_all_children();
        const wm = global.workspace_manager;
        const n = wm.get_n_workspaces();
        this._escritorios.visible = !this._mutter.get_boolean('workspaces-only-on-primary') && n > 1;
        if (!this._escritorios.visible)
            return;
        const activo = wm.get_active_workspace_index();
        for (let i = 0; i < n; i++) {
            const punto = new St.Button({
                style_class: i === activo ? 'bs-punto bs-punto-activo' : 'bs-punto',
                child: new St.Widget({style_class: 'bs-punto-marca'}),
                accessible_name: `Escritorio ${i + 1}`,
                can_focus: true,
                y_expand: true,
            });
            punto.connect('clicked', () => wm.get_workspace_by_index(i)?.activate(global.get_current_time()));
            this._escritorios.add_child(punto);
        }
    }

    _pintarVentanas() {
        this._ventanas.destroy_all_children();
        const foco = global.display.focus_window;
        const rastreador = Shell.WindowTracker.get_default();
        for (const w of acciones.ventanasDe(this._monitor)) {
            const caja = new St.BoxLayout({style_class: 'bs-ventana-caja'});
            const app = rastreador.get_window_app(w);
            if (app)
                caja.add_child(app.create_icon_texture(TAM_ICONO));
            const titulo = new St.Label({text: w.get_title() ?? '', y_align: Clutter.ActorAlign.CENTER});
            titulo.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            caja.add_child(titulo);

            let clase = 'bs-ventana';
            if (w === foco)
                clase += ' bs-ventana-activa';
            if (w.minimized)
                clase += ' bs-ventana-minimizada';
            const b = new St.Button({style_class: clase, child: caja, can_focus: true, track_hover: true, y_expand: true, accessible_name: w.get_title() ?? 'Ventana'});
            b.connect('clicked', () => acciones.alternar(w));
            w.connectObject(
                'notify::title', () => titulo.set_text(w.get_title() ?? ''),
                'notify::minimized', () => this._programar(),
                'unmanaged', () => this._programar(), b);
            this._ventanas.add_child(b);
        }
    }

    // Reloj: se despierta justo al cambiar el minuto, no cada segundo.
    _tic() {
        if (this._reloj)
            GLib.source_remove(this._reloj);
        const ahora = GLib.DateTime.new_now_local();
        const formato = this._interfaz.get_string('clock-format') === '12h' ? '%l:%M %p' : '%H:%M';
        this._hora.text = ahora.format(formato).trim();
        this._reloj = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60 - ahora.get_second(), () => {
            this._reloj = 0;
            this._tic();
            return GLib.SOURCE_REMOVE;
        });
    }

    _limpiar() {
        if (this._pendiente)
            GLib.source_remove(this._pendiente);
        if (this._reloj)
            GLib.source_remove(this._reloj);
        this._pendiente = this._reloj = 0;
        this._mutter.disconnectObject(this);
        this._interfaz.disconnectObject(this);
    }
});
