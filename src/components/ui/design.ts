// src/components/ui/design.ts
// El sistema de diseño nuevo (guias/DISENO-UX-UI.md, sección 3): tinta y grises para todo; rojo, ámbar y verde solo para
// las señales; tarjetas blancas con borde de 1 px y radio 10; letra Geist en las pantallas rehechas. Nació en "Tu día en
// Meta Ads" (.82) y pasó aquí al rehacer la segunda pantalla (.91, las de los editores). Las piezas visuales (el punto,
// el enlace-botón, la sección) están en designParts.tsx.
import { useTheme } from "@mui/material";
import { FONT_FAMILY } from "../../common/theme";

/** Geist en las pantallas rehechas; Inter de reserva. Números con el mismo ancho. */
export const GEIST = `"Geist", ${FONT_FAMILY}`;
// .91: los textos, botones y campos de MUI traen su propia letra (Inter) con la misma fuerza que "& *": se nombran aparte
export const geist = {
    fontFamily: GEIST, fontFeatureSettings: '"tnum"', "& *": { fontFamily: "inherit" },
    "& .MuiTypography-root, & .MuiButtonBase-root, & .MuiInputBase-root, & .MuiFormLabel-root, & .MuiFormHelperText-root": { fontFamily: GEIST },
} as const;

/** Los colores, en claro y oscuro según el tema del usuario. */
export const useTokens = () => {
    const dark = useTheme().palette.mode === "dark";
    return dark
        ? { card: "#1B1F26", line: "#2A303A", soft: "#232832", ink: "#E8EBF0", onInk: "#14171C", muted: "#A3ABB7", faint: "#7C8592",
            red: "#F2686D", amber: "#F5B544", green: "#3CCB93", gray: "#5B6472", greenSoft: "#16342A", greenInk: "#9FE5C6" }
        : { card: "#FFFFFF", line: "#E6E8EC", soft: "#F3F4F6", ink: "#1C2230", onInk: "#FFFFFF", muted: "#5E6672", faint: "#8A919C",
            red: "#C62E34", amber: "#E8A100", green: "#0F7552", gray: "#B8BEC7", greenSoft: "#E6F4EE", greenInk: "#0B5A3F" };
};
export type Tokens = ReturnType<typeof useTokens>;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const cardSx = (t: Tokens) => ({ bgcolor: t.card, border: `1px solid ${t.line}`, borderRadius: "10px" });

/** El botón principal: tinta (no azul). 40 px de alto; 48 en el celular. */
export const inkSx = (t: Tokens) => ({ bgcolor: t.ink, color: t.onInk, "&:hover": { bgcolor: t.ink, opacity: 0.9 }, borderRadius: "10px", px: 2 }) as const;

/** Un botón con borde (lo secundario). */
export const lineSx = (t: Tokens) => ({ color: t.ink, borderColor: t.line, borderRadius: "10px", "&:hover": { borderColor: t.faint, bgcolor: "transparent" } }) as const;

/** El alto de los botones: 40 px en computadora, 48 en el celular (al alcance del pulgar). */
export const tapSx = { minHeight: { xs: 48, sm: 40 } } as const;

/** Lo que aparece entra suave; nada se mueve si el sistema pide menos movimiento. */
export const appear = {
    animation: "nx-appear 220ms ease-out", "@keyframes nx-appear": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } },
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;
