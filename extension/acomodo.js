// Cómo repartir n ventanas en el área libre de un monitor. Solo cuentas, sin GNOME,
// para poder probarlo con `gjs -m`.
//
//  · Monitor horizontal: las ventanas van en COLUMNAS (una al lado de otra).
//  · Monitor vertical: las ventanas van en FILAS (una encima de otra). Así una ventana nunca
//    queda como una tira angosta de 540 px de ancho, que es lo que pasa con las mitades
//    izquierda/derecha normales de GNOME en un monitor vertical.
//
// Ejemplos (H = horizontal, V = vertical):
//   1 ventana  → H y V: pantalla completa
//   2 ventanas → H: mitad izquierda | mitad derecha      V: mitad de arriba / mitad de abajo
//   3 ventanas → H: una grande a la izquierda y dos apiladas a la derecha
//                V: tres filas
//   4 ventanas → H y V: cuadrícula de 2 × 2
//   5 o más    → cuadrícula; los grupos con menos ventanas van primero (ventanas más grandes)

export const HUECO = 6; // px de separación entre ventanas y con la orilla

// Cuántos grupos (columnas en H, filas en V) para n ventanas.
function grupos(n, vertical) {
    if (n <= (vertical ? 3 : 2))
        return n;
    return Math.ceil(Math.sqrt(n));
}

// Reparte n entre g grupos; los que tienen una ventana menos van primero.
function tamanos(n, g) {
    const base = Math.floor(n / g);
    const extra = n % g;
    return Array.from({length: g}, (_v, i) => base + (i >= g - extra ? 1 : 0));
}

// Corta un largo en partes iguales sin perder píxeles por redondeo.
function cortes(inicio, largo, partes, hueco) {
    const util = largo - hueco * (partes + 1);
    const res = [];
    for (let i = 0; i < partes; i++) {
        const a = Math.round(util * i / partes);
        const b = Math.round(util * (i + 1) / partes);
        res.push({pos: inicio + hueco * (i + 1) + a, largo: b - a});
    }
    return res;
}

// area: {x, y, width, height}. Devuelve n rectángulos en el orden de las ventanas.
export function celdas(n, area, hueco = HUECO) {
    if (n <= 0)
        return [];
    const vertical = area.height > area.width;
    const g = grupos(n, vertical);
    const porGrupo = tamanos(n, g);
    const res = [];
    if (vertical) {
        const filas = cortes(area.y, area.height, g, hueco);
        filas.forEach((f, i) => {
            for (const c of cortes(area.x, area.width, porGrupo[i], hueco))
                res.push({x: c.pos, y: f.pos, width: c.largo, height: f.largo});
        });
    } else {
        const cols = cortes(area.x, area.width, g, hueco);
        cols.forEach((c, i) => {
            for (const f of cortes(area.y, area.height, porGrupo[i], hueco))
                res.push({x: c.pos, y: f.pos, width: c.largo, height: f.largo});
        });
    }
    return res;
}
