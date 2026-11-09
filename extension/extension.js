// Barra secundaria: una barra mínima arriba de cada monitor que NO es el principal.
// Reloj, ventanas de ese monitor, mover ventana entre monitores, ordenar ventanas
// (también en monitores verticales) y escritorios propios de cada secundario,
// independientes del principal. La barra principal no se toca.

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Barra} from './barra.js';
import {Espacios} from './espacios.js';

const ATAJOS = {'escritorio-siguiente': 1, 'escritorio-anterior': -1};

export default class BarraSecundaria extends Extension {
    enable() {
        this._barras = new Map(); // índice de monitor → Barra
        this._espacios = new Espacios(() => this._barras?.forEach(b => b.programar()));
        this._settings = this.getSettings();
        for (const [nombre, paso] of Object.entries(ATAJOS)) {
            Main.wm.addKeybinding(nombre, this._settings, Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, () => this._espacios.mover(paso));
        }
        Main.layoutManager.connectObject('monitors-changed', () => this._crear(), this);
        this._crear();
    }

    // Se rehace todo al conectar, desconectar o girar un monitor: así la barra
    // siempre queda arriba y con el ancho correcto aunque el monitor pase a vertical.
    _crear() {
        this._quitar();
        const lm = Main.layoutManager;
        for (const monitor of lm.monitors) {
            if (monitor.index === lm.primaryIndex)
                continue;
            const barra = new Barra(monitor, this._espacios);
            // affectsStruts: las ventanas maximizadas empiezan debajo de la barra.
            // trackFullscreen: se esconde si una ventana está en pantalla completa en ese monitor.
            lm.addChrome(barra, {affectsStruts: true, trackFullscreen: true});
            this._barras.set(monitor.index, barra);
        }
    }

    _quitar() {
        for (const barra of this._barras.values()) {
            Main.layoutManager.removeChrome(barra);
            barra.destroy();
        }
        this._barras.clear();
    }

    disable() {
        for (const nombre of Object.keys(ATAJOS))
            Main.wm.removeKeybinding(nombre);
        Main.layoutManager.disconnectObject(this);
        this._quitar();
        this._barras = null;
        this._espacios.destroy();
        this._espacios = null;
        this._settings = null;
    }
}
