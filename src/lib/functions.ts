import { useTheme } from "@mui/material";

export function errorArrayLaravelTransformToString(errors: any[]) {
    if (errors.length === 0) return false;
    let errorString = '';
    Object.values(errors).map((error: any) => errorString += `${error} <br/>`);
    return errorString;
}
export function getRandomColorPastel(minR = 120, maxR = 240, minG = 120, maxG = 240, minB = 120, maxB = 240) {
    // generar rango aleatorio por RGB con min y max de valore
    const colorR = Math.floor(Math.random() * maxR) + minR;
    const colorG = Math.floor(Math.random() * maxG) + minG;
    const colorB = Math.floor(Math.random() * maxB) + minB;
    var color = '';
    // armar sintaxi rgb
    color = color.concat('rgb(', String(colorR), ',', String(colorG), ',', String(colorB), ')');
    return color;
}

export function isDark() {
    const theme = useTheme();
    return theme.palette.mode === 'dark';
}
export function errorArrayLaravelTransformToArray(errors: any[]) {
    if (errors.length === 0) return false;
    // let errorString = '';
    const errorArray: any = [];
    Object.values(errors).map((error: any) => errorArray.push(error[0]));
    return errorArray;
}
// export const getFormatDistanceToNow = (date: Date) => {
//     const fromNow = formatDistanceToNow(date, { locale: es });
//     return `Creada hace ${fromNow}`;
// }
export function numberWithDots(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
export const createCookie = async (name: string, data: string, expire: string = "Thu, 01 Jan 2100 00:00:00 UTC", path: string = "/") => {
    document.cookie = `${name}=${data}; expires=${expire}; path=${path}`;
}
/**
 * Funcion para borrar una cookie en el documento
 * @param {string} name Nombre de la cookie a borrar
 * @param {string} path Direccion de la cookie
 * @author Linz web dev (José Linares)
 */
export const deleteCookie = async (name: string, path: string = "/") => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
}
/**
 * Funcion para buscar una cookie por su nombre
 * @param {string} name Nombre de la cookie
 * @returns Valor de la cookie
 * @author Linz web dev (José Linares)
 */
export const getCookieValue = (name: string) => (decodeURIComponent(document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || ''))
export const ucwords = (words: string) => {
    words += '';
    const formatted = words.toLowerCase().replace(/\b[a-z]/g, function (firstLetter) {
        return firstLetter.toUpperCase();
    });
    return formatted;
}
export const ucfirst = (str: string) => {
    //  discuss at: https://locutus.io/php/ucfirst/
    // original by: Kevin van Zonneveld (https://kvz.io)
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // improved by: Brett Zamir (https://brett-zamir.me)
    //   example 1: ucfirst('kevin van zonneveld')
    //   returns 1: 'Kevin van zonneveld'
    str += '';
    const f = str.charAt(0).toUpperCase();
    return f + str.substr(1);
}

/** Número de pedido con un solo "#": Shopify ya lo manda con "#" (#7849) y los manuales no (MAN-26729). */
export const orderNo = (name?: string | number | null) => `#${String(name ?? '').replace(/^#+/, '')}`;
