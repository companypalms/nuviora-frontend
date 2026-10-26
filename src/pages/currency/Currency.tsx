import { Box, Grid, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { ButtonCustom, TextFieldCustom } from "../../components/custom";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useUserStore } from "../../store/user/UserStore";
import { NumericFormat } from "react-number-format";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { Form, Formik } from "formik";

interface CurrencyState {
    bcv_usd: number | null;
    bcv_eur: number | null;
    binance_usd: number | null;
    updated_at?: string | null;
    has_values?: boolean;
}

const initialFormValues = {
    bcv_usd: 0,
    bcv_eur: 0,
    binance_usd: 0,
};

export const Currency = () => {
    const user = useUserStore((state) => state.user);
    const validateToken = useUserStore((state) => state.validateToken);

    const [currency, setCurrency] = useState<CurrencyState>({
        bcv_usd: null,
        bcv_eur: null,
        binance_usd: null,
        updated_at: null,
        has_values: false,
    });
    const [loading, setLoading] = useState(false);

    const validarSesion = async () => {
        const result = await validateToken();
        if (!result.status) return (window.location.href = "/");
    };

    const getCurrency = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/currency", "GET");
            if (status === 200) {
                const { data } = await response.json();
                console.log({ data })
                setCurrency({
                    bcv_usd: data.bcv_usd.value ?? null,
                    bcv_eur: data.bcv_eur.value ?? null,
                    binance_usd: data.binance_usd.value ?? null,
                    updated_at: data.updated_at ?? null,
                    has_values: data.has_values ?? false,
                });
            } else {
                toast.error("No se logró obtener las tasas");
            }
        } catch (err) {
            console.error(err);
            toast.error("No se logró conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (values: typeof initialFormValues, resetForm: () => void) => {
        try {
            console.log({ values })
            const body = new URLSearchParams();
            body.append("bcv_usd", String(values.bcv_usd).replace('Bs ', ''));
            body.append("bcv_eur", String(values.bcv_eur).replace('Bs ', ''));
            body.append("binance_usd", String(values.binance_usd).replace('Bs ', ''));

            const { status, response }: IResponse = await request("/currency", "POST", body);
            if (status === 200) {
                const { data } = await response.json();
                setCurrency({
                    bcv_usd: data.bcv_usd?.value ?? null,
                    bcv_eur: data.bcv_eur?.value ?? null,
                    binance_usd: data.binance_usd?.value ?? null,
                    updated_at: data.updated_at ?? null,
                    has_values: true,
                });
                toast.success("Tasas actualizadas correctamente");
                resetForm();
            } else {
                toast.error("No se logró actualizar las tasas");
            }
        } catch (err) {
            console.error(err);
            toast.error("No se logró conectar con el servidor");
        }
    };

    useEffect(() => {
        validarSesion();
        getCurrency();
    }, []);

    if (!user.token) return <Loading />;

    const isToday =
        currency.updated_at &&
        new Date(currency.updated_at).toDateString() === new Date().toDateString();

    return (
        <Layout>
            <Toolbar />
            <Typography fontWeight={"bold"} variant="h4">
                Tasas de cambio
            </Typography>
            <Typography color={"text.secondary"} variant="body1">
                Aquí puedes cambiar los valores de las tasas (BCV EUR, Dólar BCV y Dólar Binance)
                y consultar el valor actual.
            </Typography>

            {/* Panel de tasas actuales */}
            <Box
                sx={{
                    mt: 2,
                    width: "100%",
                    display: "flex",
                    flexFlow: "column wrap",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        mt: 1,
                        p: 2,
                        boxShadow: `0 8px 16px ${user.color}20`,
                        borderRadius: 2,
                        background: (theme) =>
                            theme.palette.mode === "dark" ? `${user.color}20` : "#FFF",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                    }}
                >
                    <Typography variant="h5" fontWeight={"bold"}>
                        Tasas actuales
                    </Typography>

                    {loading ? (
                        <Loading />
                    ) : currency.has_values ? (
                        <>
                            <Typography>
                                <b>Dólar BCV:</b> Bs. {currency.bcv_usd}
                            </Typography>
                            <Typography>
                                <b>Euro BCV:</b> Bs. {currency.bcv_eur}
                            </Typography>
                            <Typography>
                                <b>Dólar Binance:</b> Bs. {currency.binance_usd}
                            </Typography>
                            {currency.updated_at && (
                                <Typography
                                    variant="subtitle2"
                                    color={isToday ? "success.main" : "warning.main"}
                                >
                                    {`${isToday ? "✅" : "⚠️"} Actualizado el ${new Date(
                                        currency.updated_at
                                    ).toLocaleDateString("es-ES", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}`}
                                </Typography>
                            )}
                        </>
                    ) : (
                        <Typography color="text.secondary">
                            Aún no has configurado tasas. Crea las primeras abajo 👇
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Formulario para actualizar */}
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    flexFlow: "column wrap",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        mt: 1,
                        p: 2,
                        gap: 2,
                        boxShadow: `0 8px 16px ${user.color}20`,
                        borderRadius: 2,
                        background: (theme) =>
                            theme.palette.mode === "dark" ? `${user.color}20` : "#FFF",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <Typography variant="h5" fontWeight={"bold"}>
                        Actualizar valores
                    </Typography>

                    <Formik
                        enableReinitialize
                        initialValues={{
                            bcv_usd: currency.bcv_usd ?? 0,
                            bcv_eur: currency.bcv_eur ?? 0,
                            binance_usd: currency.binance_usd ?? 0,
                        }}
                        onSubmit={(values, { resetForm }) =>
                            onSubmit(values, () => resetForm({ values }))
                        }
                    >
                        {({ values, handleChange, handleSubmit }) => (
                            <Form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSubmit();
                                }}
                            >
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <NumericFormat
                                            customInput={TextFieldCustom}
                                            size="small"
                                            value={values.bcv_usd}
                                            label="Dólar BCV (Bs)"
                                            name="bcv_usd"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            prefix={"Bs "}
                                            allowNegative={false}
                                            valueIsNumericString={false}
                                            thousandSeparator={false}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <NumericFormat
                                            customInput={TextFieldCustom}
                                            size="small"
                                            value={values.bcv_eur}
                                            label="Euro BCV (Bs)"
                                            name="bcv_eur"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            prefix={"Bs "}
                                            allowNegative={false}
                                            valueIsNumericString={false}
                                            thousandSeparator={false}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <NumericFormat
                                            customInput={TextFieldCustom}
                                            size="small"
                                            value={values.binance_usd}
                                            label="Dólar Binance (Bs)"
                                            name="binance_usd"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            prefix={"Bs "}
                                            allowNegative={false}
                                            valueIsNumericString={false}
                                            thousandSeparator={false}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <ButtonCustom type="submit" variant="contained">
                                            Actualizar tasas
                                        </ButtonCustom>
                                    </Grid>
                                </Grid>
                            </Form>
                        )}
                    </Formik>
                </Box>
            </Box>
        </Layout>
    );
};
