// src/components/ui/surface/glow.ts
// Borde con brillo de las tarjetas: todo el filo brilla con una versión clara del color que eligió el usuario, más en
// las esquinas superior izquierda e inferior derecha y algo menos en las otras dos (como el filo de los íconos de un
// teléfono). Como sale del color del tema, cambia solo cuando el usuario cambia su color.
//
// Se dibuja con un ::before enmascarado (solo el anillo del borde), así no pelea con el fondo que tenga la tarjeta ni
// con su contenido. Un degradado a 135° pone siempre las esquinas superior izquierda e inferior derecha en los extremos
// y las otras dos en el medio, sea cual sea la forma de la tarjeta.
import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import { glowColors } from "../../../common/theme";

export const glowBorder = (theme: Theme, width = 1): SystemStyleObject<Theme> => {
    const { light, dark } = glowColors(theme);
    return {
        position: "relative",
        border: "none",
        "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            padding: `${width}px`,
            background: `linear-gradient(135deg, ${light} 0%, ${dark} 50%, ${light} 100%)`,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
        },
    };
};
